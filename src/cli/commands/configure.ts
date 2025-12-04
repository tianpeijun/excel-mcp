/**
 * Configure command implementation
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { Command } from 'commander';
import { Config, ConfigureOptions, ConfigResult } from '../../types/config';
import { validateConfigureOptions, parseUvxCommand } from '../../config/validation';
import { saveConfig, getDefaultConfigPath } from '../../config/persistence';
import { CLILogger } from '../logger';
import { categorizError, formatErrorMessage } from '../errors';
import { ErrorCategory } from '../../types/errors';

/**
 * Converts ConfigureOptions to a full Config object
 */
function buildConfigFromOptions(options: ConfigureOptions): Config {
  const uvxCommand = parseUvxCommand(options.server);

  return {
    version: '1.0',
    project: {
      name: options.projectName,
      region: options.region,
      tags: {}
    },
    server: {
      command: uvxCommand.command,
      args: [uvxCommand.packageName + (uvxCommand.version ? `@${uvxCommand.version}` : ''), ...uvxCommand.args],
      transport: 'streamable-http',
      environment: options.environment || {},
      port: 8080
    },
    build: {
      codebuildProject: `agentcore-${options.projectName}-builder`,
      ecrRepository: `agentcore/${options.projectName}`,
      imageTag: 'latest',
      buildTimeout: 30
    },
    auth: {
      cognitoUserPoolId: undefined,
      cognitoClientId: undefined,
      cognitoRegion: options.region
    }
  };
}

/**
 * Executes the configure command
 * Requirement 1.1: Collect and validate all required deployment configuration parameters
 * Requirement 1.4: Persist configuration to local configuration file
 * Requirement 1.5: Provide clear error information for missing or invalid parameters
 */
export async function executeConfigure(
  options: ConfigureOptions,
  logger: CLILogger
): Promise<ConfigResult> {
  try {
    logger.start('Validating configuration parameters...');
    logger.debug(`Configuration options: ${JSON.stringify(options, null, 2)}`);

    // Validate options
    // Requirement 1.1, 1.5: Validate all required parameters
    const validation = validateConfigureOptions(options);
    if (!validation.valid) {
      logger.fail('Configuration validation failed');
      
      const errorMessage = `Invalid configuration parameters:\n${validation.errors.map(e => `  - ${e}`).join('\n')}`;
      const categorizedError = categorizError(
        new Error(errorMessage),
        ErrorCategory.CONFIG_ERROR
      );
      const userMessage = formatErrorMessage(categorizedError);
      logger.displayUserMessage(userMessage);

      return {
        success: false,
        error: errorMessage
      };
    }

    logger.succeed('Configuration parameters validated');

    // Build config object
    logger.start('Building configuration...');
    const config = buildConfigFromOptions(options);
    logger.debug(`Built configuration: ${JSON.stringify(config, null, 2)}`);
    logger.succeed('Configuration built');

    // Save configuration
    // Requirement 1.4: Persist configuration to local configuration file
    logger.start('Saving configuration...');
    const configPath = getDefaultConfigPath();
    await saveConfig(config, configPath);
    logger.succeed('Configuration saved');

    // Display success summary
    logger.section('Configuration Summary');
    logger.keyValue('Project Name', config.project.name);
    logger.keyValue('AWS Region', config.project.region);
    logger.keyValue('MCP Server', config.server.args.join(' '));
    logger.keyValue('Transport', config.server.transport);
    logger.keyValue('Config File', configPath);

    logger.info(chalk.green('\n✓ Configuration completed successfully!'));
    logger.info('Next step: Run "agentcore launch" to deploy your MCP server');

    return {
      success: true,
      config
    };
  } catch (error) {
    logger.fail('Configuration failed');

    const categorizedError = categorizError(error as Error);
    const userMessage = formatErrorMessage(categorizedError);
    logger.displayUserMessage(userMessage);

    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * Registers the configure command with Commander
 */
export function registerConfigureCommand(program: Command, logger: CLILogger): void {
  program
    .command('configure')
    .description('Configure deployment parameters for MCP server')
    .requiredOption(
      '-s, --server <command>',
      'MCP server command (e.g., "uvx excel-mcp-server" or "uvx package@version")'
    )
    .requiredOption(
      '-r, --region <region>',
      'AWS region (e.g., us-east-1, us-west-2)'
    )
    .requiredOption(
      '-p, --project-name <name>',
      'Project name (alphanumeric, hyphens, and underscores only)'
    )
    .option(
      '-t, --transport <protocol>',
      'Transport protocol (default: streamable-http)',
      'streamable-http'
    )
    .option(
      '-e, --environment <vars...>',
      'Environment variables in KEY=VALUE format'
    )
    .option(
      '-v, --verbose',
      'Enable verbose logging'
    )
    .action(async (options) => {
      // Set verbose mode
      if (options.verbose) {
        logger.setVerbose(true);
      }

      // Parse environment variables
      let environment: Record<string, string> = {};
      if (options.environment) {
        try {
          environment = parseEnvironmentVariables(options.environment);
        } catch (error) {
          logger.error(`Failed to parse environment variables: ${(error as Error).message}`);
          process.exit(1);
        }
      }

      // Build configure options
      const configureOptions: ConfigureOptions = {
        server: options.server,
        transport: options.transport,
        region: options.region,
        projectName: options.projectName,
        environment
      };

      // Execute configure
      const result = await executeConfigure(configureOptions, logger);

      // Exit with appropriate code
      process.exit(result.success ? 0 : 1);
    });
}

/**
 * Parses environment variables from command line format
 * Expects array of strings in format: ["KEY1=VALUE1", "KEY2=VALUE2"]
 */
function parseEnvironmentVariables(envVars: string[]): Record<string, string> {
  const environment: Record<string, string> = {};

  for (const envVar of envVars) {
    const equalIndex = envVar.indexOf('=');
    if (equalIndex === -1) {
      throw new Error(`Invalid environment variable format: "${envVar}". Expected KEY=VALUE`);
    }

    const key = envVar.substring(0, equalIndex).trim();
    const value = envVar.substring(equalIndex + 1).trim();

    if (!key) {
      throw new Error(`Environment variable key cannot be empty: "${envVar}"`);
    }

    environment[key] = value;
  }

  return environment;
}

// Import chalk for colored output
import chalk from 'chalk';
