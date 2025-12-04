/**
 * Error message formatting and classification
 * Requirement 7.3: Output error messages with cause and suggestions
 */

import { ErrorCategory, CategorizedError, UserMessage } from '../types/errors';

/**
 * Classifies an error into a category
 */
export function classifyError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();

  // Configuration errors
  if (
    message.includes('config') ||
    message.includes('parameter') ||
    message.includes('validation') ||
    message.includes('region') ||
    message.includes('path')
  ) {
    return ErrorCategory.CONFIG_ERROR;
  }

  // Build errors
  if (
    message.includes('build') ||
    message.includes('codebuild') ||
    message.includes('docker') ||
    message.includes('ecr') ||
    message.includes('image')
  ) {
    return ErrorCategory.BUILD_ERROR;
  }

  // Authentication errors
  if (
    message.includes('auth') ||
    message.includes('cognito') ||
    message.includes('token') ||
    message.includes('permission') ||
    message.includes('unauthorized')
  ) {
    return ErrorCategory.AUTH_ERROR;
  }

  // Deployment errors
  if (
    message.includes('deploy') ||
    message.includes('runtime') ||
    message.includes('endpoint') ||
    message.includes('health')
  ) {
    return ErrorCategory.DEPLOYMENT_ERROR;
  }

  // Default to runtime error
  return ErrorCategory.RUNTIME_ERROR;
}

/**
 * Creates a categorized error from a regular error
 */
export function categorizError(error: Error, category?: ErrorCategory): CategorizedError {
  const detectedCategory = category || classifyError(error);
  
  return {
    category: detectedCategory,
    code: generateErrorCode(detectedCategory),
    message: error.message,
    originalError: error
  };
}

/**
 * Generates an error code based on category
 */
function generateErrorCode(category: ErrorCategory): string {
  const timestamp = Date.now().toString().slice(-4);
  
  switch (category) {
    case ErrorCategory.CONFIG_ERROR:
      return `CONFIG_${timestamp}`;
    case ErrorCategory.BUILD_ERROR:
      return `BUILD_${timestamp}`;
    case ErrorCategory.AUTH_ERROR:
      return `AUTH_${timestamp}`;
    case ErrorCategory.DEPLOYMENT_ERROR:
      return `DEPLOY_${timestamp}`;
    case ErrorCategory.RUNTIME_ERROR:
      return `RUNTIME_${timestamp}`;
    default:
      return `ERROR_${timestamp}`;
  }
}

/**
 * Generates suggestions based on error category and message
 */
export function generateSuggestions(error: CategorizedError): string[] {
  const suggestions: string[] = [];
  const message = error.message.toLowerCase();

  switch (error.category) {
    case ErrorCategory.CONFIG_ERROR:
      if (message.includes('region')) {
        suggestions.push('Use a valid AWS region code (e.g., us-east-1, us-west-2)');
        suggestions.push('Run "aws ec2 describe-regions" to see available regions');
      } else if (message.includes('path')) {
        suggestions.push('Verify the path exists and is accessible');
        suggestions.push('Use an absolute path or ensure the relative path is correct');
      } else if (message.includes('project name')) {
        suggestions.push('Use only alphanumeric characters, hyphens, and underscores');
        suggestions.push('Ensure the project name is not empty');
      } else if (message.includes('uvx') || message.includes('command')) {
        suggestions.push('Use the format: uvx package-name or uvx package-name@version');
        suggestions.push('Ensure the package name is valid');
      } else {
        suggestions.push('Review the configuration parameters');
        suggestions.push('Run "agentcore configure --help" for usage information');
      }
      break;

    case ErrorCategory.BUILD_ERROR:
      suggestions.push('Check AWS CodeBuild service status');
      suggestions.push('Verify your AWS credentials are configured correctly');
      suggestions.push('Ensure you have necessary IAM permissions for CodeBuild and ECR');
      if (message.includes('timeout')) {
        suggestions.push('Increase the build timeout in configuration');
      }
      break;

    case ErrorCategory.AUTH_ERROR:
      suggestions.push('Verify your AWS credentials are valid');
      suggestions.push('Check IAM permissions for Cognito operations');
      if (message.includes('token')) {
        suggestions.push('Refresh your authentication token');
        suggestions.push('Re-authenticate with Cognito');
      }
      break;

    case ErrorCategory.DEPLOYMENT_ERROR:
      suggestions.push('Check Bedrock AgentCore Runtime service availability');
      suggestions.push('Verify the container image was built successfully');
      suggestions.push('Ensure authentication is configured correctly');
      if (message.includes('health')) {
        suggestions.push('Check MCP server logs for startup errors');
        suggestions.push('Verify the container configuration is correct');
      }
      break;

    case ErrorCategory.RUNTIME_ERROR:
      suggestions.push('Check the MCP server logs for details');
      suggestions.push('Verify the service is running and healthy');
      suggestions.push('Try restarting the deployment');
      break;
  }

  // Always add a generic suggestion if no specific ones were added
  if (suggestions.length === 0) {
    suggestions.push('Check the error details above for more information');
    suggestions.push('Run with --verbose flag for detailed logs');
  }

  return suggestions;
}

/**
 * Formats a categorized error into a user-friendly message
 * Requirement 7.3: Output error messages with cause and suggestions
 */
export function formatErrorMessage(error: CategorizedError): UserMessage {
  const suggestions = generateSuggestions(error);

  return {
    level: 'error',
    code: error.code,
    message: error.message,
    details: error.details,
    suggestions,
    documentation: getDocumentationLink(error.category)
  };
}

/**
 * Gets documentation link based on error category
 */
function getDocumentationLink(category: ErrorCategory): string | undefined {
  switch (category) {
    case ErrorCategory.CONFIG_ERROR:
      return 'https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html';
    case ErrorCategory.BUILD_ERROR:
      return 'https://docs.aws.amazon.com/codebuild/latest/userguide/troubleshooting.html';
    case ErrorCategory.AUTH_ERROR:
      return 'https://docs.aws.amazon.com/cognito/latest/developerguide/what-is-amazon-cognito.html';
    case ErrorCategory.DEPLOYMENT_ERROR:
      return 'https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html';
    default:
      return undefined;
  }
}

/**
 * Formats a simple error message for display
 */
export function formatSimpleError(message: string, suggestions?: string[]): UserMessage {
  return {
    level: 'error',
    code: 'ERROR',
    message,
    suggestions: suggestions || ['Check the error details and try again']
  };
}

/**
 * Formats a warning message
 */
export function formatWarning(message: string, suggestions?: string[]): UserMessage {
  return {
    level: 'warning',
    code: 'WARNING',
    message,
    suggestions: suggestions || []
  };
}

/**
 * Formats an info message
 */
export function formatInfo(message: string): UserMessage {
  return {
    level: 'info',
    code: 'INFO',
    message,
    suggestions: []
  };
}
