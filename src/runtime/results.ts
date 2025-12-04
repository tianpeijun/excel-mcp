/**
 * Deployment result formatting and summary generation
 */

import { DeploymentResult, Endpoint, DeploymentAuthConfig, ResourceInfo } from '../types';

export interface DeploymentSummary {
  success: boolean;
  endpointUrl?: string;
  authInfo?: {
    userPoolId: string;
    clientId: string;
    region: string;
  };
  nextSteps: string[];
  resourceInfo: ResourceInfo;
}

/**
 * Create a deployment result object
 */
export function createDeploymentResult(
  success: boolean,
  endpoint?: Endpoint,
  authConfig?: DeploymentAuthConfig,
  resourceInfo?: ResourceInfo,
  errorMessage?: string
): DeploymentResult {
  const result: DeploymentResult = {
    success,
    endpoint,
    authConfig,
    resourceInfo
  };

  if (!success && errorMessage) {
    result.error = {
      code: 'DEPLOYMENT_FAILED',
      message: errorMessage,
      phase: 'DEPLOYING' as any
    };
  }

  return result;
}

/**
 * Generate deployment summary with next steps
 */
export function generateDeploymentSummary(
  result: DeploymentResult
): DeploymentSummary {
  if (!result.success) {
    return {
      success: false,
      nextSteps: [
        'Review the error message above',
        'Check AWS CloudWatch logs for detailed error information',
        'Verify your AWS credentials and permissions',
        'Run "agentcore launch" again after resolving issues'
      ],
      resourceInfo: result.resourceInfo || {}
    };
  }

  const summary: DeploymentSummary = {
    success: true,
    endpointUrl: result.endpoint?.url,
    resourceInfo: result.resourceInfo || {},
    nextSteps: []
  };

  if (result.authConfig) {
    summary.authInfo = {
      userPoolId: result.authConfig.cognitoUserPoolId,
      clientId: result.authConfig.cognitoClientId,
      region: result.authConfig.cognitoRegion
    };
  }

  // Generate next steps
  summary.nextSteps = generateNextSteps(result);

  return summary;
}

/**
 * Generate next steps guidance based on deployment result
 */
function generateNextSteps(result: DeploymentResult): string[] {
  const steps: string[] = [];

  if (result.endpoint) {
    steps.push(
      `Connect to your MCP server at: ${result.endpoint.url}`
    );
  }

  if (result.authConfig) {
    steps.push(
      'Authenticate using AWS Cognito with the credentials above'
    );
    steps.push(
      'Use the provided Jupyter Notebook for quick start examples'
    );
  }

  steps.push(
    'Monitor your deployment in the AWS Console'
  );

  steps.push(
    'Check CloudWatch logs for runtime information'
  );

  return steps;
}

/**
 * Format deployment summary for console output
 */
export function formatDeploymentSummary(summary: DeploymentSummary): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');
  
  if (summary.success) {
    lines.push('✓ Deployment Completed Successfully!');
  } else {
    lines.push('✗ Deployment Failed');
  }
  
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');

  if (summary.success) {
    // Endpoint information
    if (summary.endpointUrl) {
      lines.push('📍 Endpoint URL:');
      lines.push(`   ${summary.endpointUrl}`);
      lines.push('');
    }

    // Authentication information
    if (summary.authInfo) {
      lines.push('🔐 Authentication:');
      lines.push(`   User Pool ID: ${summary.authInfo.userPoolId}`);
      lines.push(`   Client ID: ${summary.authInfo.clientId}`);
      lines.push(`   Region: ${summary.authInfo.region}`);
      lines.push('');
    }

    // Resource information
    if (Object.keys(summary.resourceInfo).length > 0) {
      lines.push('📦 Resources:');
      if (summary.resourceInfo.buildId) {
        lines.push(`   Build ID: ${summary.resourceInfo.buildId}`);
      }
      if (summary.resourceInfo.imageUri) {
        lines.push(`   Image URI: ${summary.resourceInfo.imageUri}`);
      }
      lines.push('');
    }
  }

  // Next steps
  if (summary.nextSteps.length > 0) {
    lines.push('📋 Next Steps:');
    summary.nextSteps.forEach((step, index) => {
      lines.push(`   ${index + 1}. ${step}`);
    });
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');

  return lines.join('\n');
}

/**
 * Create a successful deployment result
 */
export function createSuccessResult(
  endpoint: Endpoint,
  authConfig: DeploymentAuthConfig,
  resourceInfo: ResourceInfo
): DeploymentResult {
  return createDeploymentResult(true, endpoint, authConfig, resourceInfo);
}

/**
 * Create a failed deployment result
 */
export function createFailureResult(
  errorMessage: string,
  resourceInfo?: ResourceInfo
): DeploymentResult {
  return createDeploymentResult(false, undefined, undefined, resourceInfo, errorMessage);
}
