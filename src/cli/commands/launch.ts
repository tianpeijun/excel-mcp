/**
 * Launch command implementation
 * Orchestrates the complete deployment workflow:
 * 1. Load configuration
 * 2. Trigger build
 * 3. Set up authentication
 * 4. Deploy to runtime
 * 5. Return results
 * 
 * Requirements: 2.1, 3.1, 4.1
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { Logger } from '../logger';
import { loadConfig } from '../../config/persistence';
import { initializeAWSClients } from '../../aws/clients';
import { createBuildService } from '../../build/codebuild';
import { createBuildMonitor, handleBuildFailure } from '../../build/monitor';
import { setupCognitoAuth, toDeploymentAuthConfig } from '../../auth/cognito';
import { orchestrateDeployment } from '../../runtime/orchestrator';
import { Config, LaunchOptions, BuildProgress } from '../../types';

/**
 * Register the launch command with the CLI program
 */
export function registerLaunchCommand(program: Command, logger: Logger): void {
  program
    .command('launch')
    .description('Launch MCP server deployment to Bedrock AgentCore Runtime')
    .option('-c, --config-file <path>', 'Path to configuration file')
    .option('-v, --verbose', 'Enable verbose logging')
    .action(async (options: LaunchOptions) => {
      try {
        await executeLaunch(options, logger);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Launch failed: ${errorMessage}`);
        process.exit(1);
      }
    });
}

/**
 * Execute the launch command workflow
 */
async function executeLaunch(options: LaunchOptions, logger: Logger): Promise<void> {
  const verbose = options.verbose || false;
  
  logger.info(chalk.bold('🚀 Starting MCP Server Deployment\n'));

  // Step 1: Load configuration
  const spinner = ora('Loading configuration...').start();
  
  let config: Config;
  try {
    config = await loadConfig(options.configFile);
    spinner.succeed('Configuration loaded');
    
    if (verbose) {
      logger.info(`Project: ${config.project.name}`);
      logger.info(`Region: ${config.project.region}`);
      logger.info(`Server: ${config.server.command} ${config.server.args.join(' ')}\n`);
    }
  } catch (error) {
    spinner.fail('Failed to load configuration');
    throw new Error(
      `Configuration not found. Please run "agentcore configure" first.\n` +
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // Initialize AWS clients
  const awsClients = initializeAWSClients({
    region: config.project.region
  });

  // Step 2: Trigger build
  logger.info(chalk.bold('📦 Building Container Image\n'));
  
  const buildService = createBuildService(awsClients.codeBuild);
  const buildMonitor = createBuildMonitor(awsClients.codeBuild);
  
  let buildId: string;
  let imageUri: string;
  
  try {
    // Ensure CodeBuild project exists
    spinner.start('Setting up CodeBuild project...');
    const projectName = await buildService.ensureProject(config);
    spinner.succeed(`CodeBuild project ready: ${projectName}`);
    
    // Trigger build
    spinner.start('Starting container build...');
    buildId = await buildService.triggerBuild(config, projectName);
    spinner.succeed(`Build started: ${buildId}`);
    
    if (verbose) {
      logger.info(`Build ID: ${buildId}\n`);
    }
    
    // Monitor build progress
    logger.info('Building container image...');
    const buildSpinner = ora('Initializing build...').start();
    
    const buildResult = await buildMonitor.monitorBuild(
      buildId,
      (progress: BuildProgress) => {
        buildSpinner.text = `${progress.message} (${progress.percentage}%)`;
      }
    );
    
    if (!buildResult.success) {
      buildSpinner.fail('Build failed');
      
      // Get detailed error information
      const failureInfo = await getBuildFailureInfo(buildId, buildMonitor);
      logger.error(`\n${failureInfo.message}`);
      
      if (failureInfo.suggestions.length > 0) {
        logger.info('\nSuggestions:');
        failureInfo.suggestions.forEach(suggestion => {
          logger.info(`  • ${suggestion}`);
        });
      }
      
      if (failureInfo.logs) {
        logger.info(`\nLogs: ${failureInfo.logs}`);
      }
      
      throw new Error('Container build failed');
    }
    
    buildSpinner.succeed('Container image built successfully');
    
    if (!buildResult.imageUri) {
      throw new Error('Build succeeded but image URI not available');
    }
    
    imageUri = buildResult.imageUri;
    
    // Output resource information (Requirement 7.2)
    logger.info(chalk.green('\n✓ Build Resources:'));
    logger.info(`  Build ID: ${chalk.cyan(buildId)}`);
    logger.info(`  Image URI: ${chalk.cyan(imageUri)}`);
    
    if (buildResult.logs && buildResult.logs.length > 0) {
      logger.info(`  Logs: ${chalk.cyan(buildResult.logs[0])}`);
    }
    logger.info('');
    
  } catch (error) {
    throw new Error(
      `Build failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // Step 3: Set up authentication
  logger.info(chalk.bold('\n🔐 Setting Up Authentication\n'));
  
  // Check if Cognito is already configured
  if (config.auth.cognitoUserPoolId && config.auth.cognitoClientId) {
    logger.info(chalk.green('✓ Using existing Cognito configuration'));
    logger.info(`  User Pool ID: ${chalk.cyan(config.auth.cognitoUserPoolId)}`);
    logger.info(`  Client ID: ${chalk.cyan(config.auth.cognitoClientId)}`);
    logger.info(`  Region: ${chalk.cyan(config.auth.cognitoRegion || config.project.region)}`);
    logger.info('');
  } else {
    spinner.start('Configuring Cognito authentication...');
    
    try {
      const cognitoResult = await setupCognitoAuth(awsClients.cognito, {
        projectName: config.project.name,
        region: config.project.region,
        tokenValidityHours: 24
      });
      
      spinner.succeed('Authentication configured');
      
      // Update config with auth information
      config.auth.cognitoUserPoolId = cognitoResult.userPoolId;
      config.auth.cognitoClientId = cognitoResult.clientId;
      config.auth.cognitoRegion = cognitoResult.region;
      
      // Output resource information (Requirement 7.2)
      logger.info(chalk.green('\n✓ Cognito Resources:'));
      logger.info(`  User Pool ID: ${chalk.cyan(cognitoResult.userPoolId)}`);
      logger.info(`  Client ID: ${chalk.cyan(cognitoResult.clientId)}`);
      logger.info(`  Region: ${chalk.cyan(cognitoResult.region)}`);
      logger.info('');
      
    } catch (error) {
      spinner.fail('Authentication setup failed');
      if (verbose && error instanceof Error) {
        logger.error(`Error details: ${error.stack || error.message}`);
      }
      throw new Error(
        `Failed to set up authentication: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Step 4: Deploy to runtime
  logger.info(chalk.bold('🚢 Deploying to AgentCore Runtime\n'));
  
  spinner.start('Deploying MCP server...');
  
  try {
    const deploymentResult = await orchestrateDeployment({
      imageUri,
      config,
      verbose
    });
    
    if (!deploymentResult.success) {
      spinner.fail('Deployment failed');
      throw new Error(
        deploymentResult.error?.message || 'Deployment failed for unknown reason'
      );
    }
    
    spinner.succeed('Deployment completed successfully');
    
    // Step 5: Display results
    // Output endpoint URL (Requirement 7.2)
    if (deploymentResult.endpoint) {
      logger.info(chalk.green('\n✓ Deployment Resources:'));
      logger.info(`  Endpoint URL: ${chalk.cyan(deploymentResult.endpoint.url)}`);
      logger.info(`  Protocol: ${chalk.cyan(deploymentResult.endpoint.protocol)}`);
      logger.info(`  Auth Required: ${chalk.cyan(deploymentResult.endpoint.authRequired ? 'Yes' : 'No')}`);
    }
    
    // The orchestrator already displays the detailed summary
    
  } catch (error) {
    spinner.fail('Deployment failed');
    throw error;
  }
}

/**
 * Get detailed build failure information
 */
async function getBuildFailureInfo(
  buildId: string,
  buildMonitor: any
): Promise<{ message: string; suggestions: string[]; logs?: string }> {
  try {
    const result = await buildMonitor.getBuildLogs(buildId);
    // This would parse the logs to extract failure info
    // For now, return a generic message
    return {
      message: 'Build failed. Check CloudWatch logs for details.',
      suggestions: [
        'Verify your Dockerfile syntax',
        'Check that the MCP server package exists',
        'Ensure ECR repository permissions are correct'
      ],
      logs: result[0] // CloudWatch logs link
    };
  } catch (error) {
    return {
      message: 'Build failed',
      suggestions: ['Check AWS Console for build details'],
    };
  }
}
