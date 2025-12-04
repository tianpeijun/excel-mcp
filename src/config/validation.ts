/**
 * Configuration validation logic
 * Requirements: 1.1, 1.2, 1.3, 8.1
 */

import { Config, ValidationResult, ConfigureOptions } from '../types/config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * List of valid AWS regions
 * This is a subset of commonly used regions. In production, this could be fetched from AWS API.
 */
const VALID_AWS_REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1',
  'ap-northeast-1', 'ap-northeast-2', 'ap-southeast-1', 'ap-southeast-2',
  'ap-south-1', 'sa-east-1', 'ca-central-1'
];

/**
 * Parsed uvx command structure
 */
export interface UvxCommand {
  command: string;
  packageName: string;
  version?: string;
  args: string[];
}

/**
 * Validates a complete configuration object
 * Requirement 1.1: Collect and validate all required deployment configuration parameters
 * Requirement 1.5: Provide clear error information for missing or invalid parameters
 */
export function validateConfig(config: Config): ValidationResult {
  const errors: string[] = [];

  // Validate version
  if (!config.version || config.version.trim() === '') {
    errors.push('Configuration version is required');
  }

  // Validate project configuration
  if (!config.project) {
    errors.push('Project configuration is required');
  } else {
    if (!config.project.name || config.project.name.trim() === '') {
      errors.push('Project name is required');
    } else if (!/^[a-zA-Z0-9-_]+$/.test(config.project.name)) {
      errors.push('Project name must contain only alphanumeric characters, hyphens, and underscores');
    }

    // Validate AWS region
    const regionValidation = validateAwsRegion(config.project.region);
    if (!regionValidation.valid) {
      errors.push(...regionValidation.errors);
    }
  }

  // Validate server configuration
  if (!config.server) {
    errors.push('Server configuration is required');
  } else {
    if (!config.server.command || config.server.command.trim() === '') {
      errors.push('Server command is required');
    }

    if (!config.server.args || config.server.args.length === 0) {
      errors.push('Server args are required');
    }

    if (config.server.transport !== 'streamable-http') {
      errors.push('Transport must be "streamable-http"');
    }

    if (!config.server.environment) {
      errors.push('Server environment must be defined (can be empty object)');
    }
  }

  // Validate build configuration
  if (!config.build) {
    errors.push('Build configuration is required');
  } else {
    if (!config.build.codebuildProject || config.build.codebuildProject.trim() === '') {
      errors.push('CodeBuild project name is required');
    }

    if (!config.build.ecrRepository || config.build.ecrRepository.trim() === '') {
      errors.push('ECR repository name is required');
    }
  }

  // Validate auth configuration (can be empty initially)
  if (!config.auth) {
    errors.push('Auth configuration must be defined (can have empty fields)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates AWS region
 * Requirement 1.3: Validate region availability and save configuration
 */
export function validateAwsRegion(region: string): ValidationResult {
  const errors: string[] = [];

  if (!region || region.trim() === '') {
    errors.push('AWS region is required');
  } else if (!VALID_AWS_REGIONS.includes(region)) {
    errors.push(
      `Invalid AWS region "${region}". Valid regions include: ${VALID_AWS_REGIONS.join(', ')}`
    );
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates source path
 * Requirement 1.2: Validate source path validity and record configuration
 */
export function validateSourcePath(sourcePath: string): ValidationResult {
  const errors: string[] = [];

  if (!sourcePath || sourcePath.trim() === '') {
    errors.push('Source path is required');
    return { valid: false, errors };
  }

  // Check if path exists
  try {
    const resolvedPath = path.resolve(sourcePath);
    if (!fs.existsSync(resolvedPath)) {
      errors.push(`Source path does not exist: ${sourcePath}`);
    } else {
      const stats = fs.statSync(resolvedPath);
      if (!stats.isDirectory() && !stats.isFile()) {
        errors.push(`Source path must be a file or directory: ${sourcePath}`);
      }
    }
  } catch (error) {
    errors.push(`Cannot access source path: ${sourcePath}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Parses uvx command format
 * Requirement 8.1: Parse command parameters to extract server package name and version
 * 
 * Supports formats:
 * - "uvx package-name"
 * - "uvx package-name@version"
 * - "uvx package-name arg1 arg2"
 * - "uvx package-name@version arg1 arg2"
 */
export function parseUvxCommand(commandString: string): UvxCommand {
  const trimmed = commandString.trim();
  
  if (trimmed === '') {
    throw new Error('Command string is empty');
  }
  
  const parts = trimmed.split(/\s+/);

  const command = parts[0];
  if (command !== 'uvx') {
    throw new Error(`Expected command to start with "uvx", got "${command}"`);
  }

  if (parts.length < 2) {
    throw new Error('uvx command must include a package name');
  }

  const packagePart = parts[1];
  const additionalArgs = parts.slice(2);

  // Parse package name and version
  let packageName: string;
  let version: string | undefined;

  if (packagePart.includes('@')) {
    const atIndex = packagePart.indexOf('@');
    packageName = packagePart.substring(0, atIndex);
    version = packagePart.substring(atIndex + 1);

    if (!packageName) {
      throw new Error('Package name cannot be empty');
    }
    if (!version) {
      throw new Error('Version cannot be empty when @ is present');
    }
  } else {
    packageName = packagePart;
  }

  return {
    command,
    packageName,
    version,
    args: additionalArgs
  };
}

/**
 * Validates configure options from CLI
 * Requirement 1.1: Collect and validate all required deployment configuration parameters
 */
export function validateConfigureOptions(options: ConfigureOptions): ValidationResult {
  const errors: string[] = [];

  // Validate server command
  if (!options.server || options.server.trim() === '') {
    errors.push('Server command is required');
  } else {
    try {
      parseUvxCommand(options.server);
    } catch (error) {
      errors.push(`Invalid server command: ${(error as Error).message}`);
    }
  }

  // Validate transport
  if (!options.transport || options.transport !== 'streamable-http') {
    errors.push('Transport must be "streamable-http"');
  }

  // Validate region
  const regionValidation = validateAwsRegion(options.region);
  if (!regionValidation.valid) {
    errors.push(...regionValidation.errors);
  }

  // Validate project name
  if (!options.projectName || options.projectName.trim() === '') {
    errors.push('Project name is required');
  } else if (!/^[a-zA-Z0-9-_]+$/.test(options.projectName)) {
    errors.push('Project name must contain only alphanumeric characters, hyphens, and underscores');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
