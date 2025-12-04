/**
 * Deployment orchestration - coordinates the complete deployment workflow
 */

import { Config, DeploymentResult, Deployment } from '../types';
import {
  DeploymentConfig,
  deployToRuntime,
  waitForDeployment
} from './deployment';
import { verifyDeployment } from './health';
import {
  createSuccessResult,
  createFailureResult,
  generateDeploymentSummary,
  formatDeploymentSummary
} from './results';
import {
  rollbackDeployment,
  saveDeploymentToHistory,
  formatRollbackResult
} from './rollback';

export interface OrchestrationOptions {
  imageUri: string;
  config: Config;
  verbose?: boolean;
}

/**
 * Orchestrate the complete deployment process
 * 
 * This function coordinates:
 * 1. Deployment trigger
 * 2. Health checks
 * 3. Endpoint creation
 * 4. Result generation
 * 5. Rollback on failure
 */
export async function orchestrateDeployment(
  options: OrchestrationOptions
): Promise<DeploymentResult> {
  const { imageUri, config, verbose } = options;

  try {
    // Step 1: Prepare deployment configuration
    if (verbose) {
      console.log('Preparing deployment configuration...');
    }

    const deploymentConfig: DeploymentConfig = {
      imageUri,
      authConfig: {
        cognitoUserPoolId: config.auth.cognitoUserPoolId!,
        cognitoClientId: config.auth.cognitoClientId!,
        cognitoRegion: config.auth.cognitoRegion || config.project.region
      },
      projectName: config.project.name,
      region: config.project.region,
      serverConfig: {
        command: config.server.command,
        args: config.server.args,
        transport: config.server.transport,
        environment: config.server.environment,
        port: config.server.port
      }
    };

    // Step 2: Deploy to runtime
    if (verbose) {
      console.log('Deploying to Bedrock AgentCore Runtime...');
    }

    let deployment = await deployToRuntime(deploymentConfig);

    // Step 3: Wait for deployment to complete
    if (verbose) {
      console.log('Waiting for deployment to complete...');
    }

    deployment = await waitForDeployment(deployment.id);

    // Check if deployment failed
    if (deployment.status === 'FAILED') {
      throw new Error('Deployment failed during runtime initialization');
    }

    // Step 4: Verify deployment health and create endpoint
    if (verbose) {
      console.log('Verifying deployment health...');
    }

    const verification = await verifyDeployment(deployment, config.project.region);

    if (!verification.healthy) {
      throw new Error(
        `Deployment health check failed: ${verification.healthStatus.message}`
      );
    }

    // Update deployment with endpoint
    if (verification.endpoint) {
      deployment.endpoint = verification.endpoint;
    }

    // Step 5: Save successful deployment to history
    await saveDeploymentToHistory(deployment, config.project.name);

    // Step 6: Generate success result
    const resourceInfo = {
      buildId: config.build.codebuildProject,
      imageUri,
      cognitoUserPoolId: deploymentConfig.authConfig.cognitoUserPoolId,
      cognitoClientId: deploymentConfig.authConfig.cognitoClientId,
      endpointUrl: deployment.endpoint?.url
    };

    const result = createSuccessResult(
      deployment.endpoint!,
      deploymentConfig.authConfig,
      resourceInfo
    );

    // Display summary
    const summary = generateDeploymentSummary(result);
    console.log(formatDeploymentSummary(summary));

    return result;

  } catch (error) {
    // Handle deployment failure
    const errorMessage = error instanceof Error ? error.message : 'Unknown deployment error';
    
    console.error('Deployment failed:', errorMessage);

    // Attempt rollback if we have a deployment object
    if (verbose) {
      console.log('Attempting rollback...');
    }

    // Create a failed deployment object for rollback
    const failedDeployment: Deployment = {
      id: `failed-${Date.now()}`,
      status: 'FAILED',
      imageUri,
      authConfig: {
        cognitoUserPoolId: config.auth.cognitoUserPoolId || '',
        cognitoClientId: config.auth.cognitoClientId || '',
        cognitoRegion: config.auth.cognitoRegion || config.project.region
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const rollbackResult = await rollbackDeployment(
      failedDeployment,
      config.project.name
    );

    if (verbose) {
      console.log(formatRollbackResult(rollbackResult));
    }

    // Return failure result
    const resourceInfo = {
      buildId: config.build.codebuildProject,
      imageUri
    };

    return createFailureResult(errorMessage, resourceInfo);
  }
}
