/**
 * Generate Dockerfile and buildspec.yml for CodeBuild
 */

import { Config } from '../types';

export interface GeneratedBuildFiles {
  dockerfile: string;
  buildspec: string;
}

/**
 * Generate both Dockerfile and buildspec.yml based on configuration
 */
export function generateBuildFiles(config: Config): GeneratedBuildFiles {
  return {
    dockerfile: generateDockerfile(config),
    buildspec: generateBuildspec(config),
  };
}

/**
 * Generate Dockerfile content based on configuration
 * Handles uvx installation and MCP server package installation
 */
export function generateDockerfile(config: Config): string {
  const mcpPackage = config.server.args.join(' ');
  const port = config.server.port || 8080;
  
  // Generate environment variable declarations
  const envVars = Object.entries(config.server.environment)
    .map(([key, value]) => `ENV ${key}="${value}"`)
    .join('\n');
  
  // Build CMD array with proper arguments
  const cmdArgs = [
    'uvx',
    mcpPackage,
    '--transport',
    config.server.transport,
    '--port',
    port.toString()
  ];
  
  const cmdLine = JSON.stringify(cmdArgs);
  
  const dockerfile = `FROM python:3.11-slim

# Install uv and uvx
RUN pip install --no-cache-dir uv

# Set working directory
WORKDIR /app

# Install MCP server package using uvx
RUN uvx install ${mcpPackage}

${envVars ? envVars + '\n' : ''}# Expose port for Streamable HTTP
EXPOSE ${port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:${port}/health || exit 1

# Start MCP server with uvx
# Uses uvx command with transport and port parameters (Requirement 8.3)
CMD ${cmdLine}
`;

  return dockerfile;
}

/**
 * Generate buildspec.yml content for CodeBuild
 * Handles Docker build, ECR login, and image push
 */
export function generateBuildspec(config: Config): string {
  const imageTag = config.build.imageTag || 'latest';
  const mcpPackage = config.server.args.join(' ');
  const port = config.server.port || 8080;
  
  const buildspec = `version: 0.2

env:
  variables:
    IMAGE_REPO_NAME: "${config.build.ecrRepository}"
    IMAGE_TAG: "${imageTag}"
    AWS_DEFAULT_REGION: "${config.project.region}"
    MCP_PACKAGE: "${mcpPackage}"
    MCP_PORT: "${port}"
    MCP_TRANSPORT: "${config.server.transport}"

phases:
  pre_build:
    commands:
      - echo Logging in to Amazon ECR...
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com
      - echo Logged in to ECR
      - echo Creating ECR repository if it does not exist...
      - aws ecr describe-repositories --repository-names $IMAGE_REPO_NAME --region $AWS_DEFAULT_REGION || aws ecr create-repository --repository-name $IMAGE_REPO_NAME --region $AWS_DEFAULT_REGION
      
  build:
    commands:
      - echo "Building MCP Server container..."
      - echo "Creating Dockerfile..."
      - echo "FROM public.ecr.aws/docker/library/python:3.11-slim" > Dockerfile
      - echo "RUN pip install --no-cache-dir uv" >> Dockerfile
      - echo "WORKDIR /app" >> Dockerfile
      - echo "EXPOSE $MCP_PORT" >> Dockerfile
      - echo 'CMD ["uvx", "'$MCP_PACKAGE'", "--transport", "'$MCP_TRANSPORT'", "--port", "'$MCP_PORT'"]' >> Dockerfile
      - cat Dockerfile
      - echo "Building Docker image..."
      - docker build -t $IMAGE_REPO_NAME:$IMAGE_TAG .
      - echo "Tagging image..."
      - docker tag $IMAGE_REPO_NAME:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$IMAGE_REPO_NAME:$IMAGE_TAG
      
  post_build:
    commands:
      - echo "Pushing image to ECR..."
      - docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$IMAGE_REPO_NAME:$IMAGE_TAG
      - echo "Writing image URI to file..."
      - echo $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$IMAGE_REPO_NAME:$IMAGE_TAG > imageUri.txt
      - echo "Build completed successfully"

artifacts:
  files:
    - imageUri.txt
  name: BuildArtifacts

cache:
  paths:
    - '/root/.cache/pip/**/*'
    - '/root/.cache/uv/**/*'
`;

  return buildspec;
}

/**
 * Parse uvx command to extract package name and version for Docker build
 */
export function parseUvxPackage(command: string): { package: string; version?: string } {
  // Expected format: "uvx package-name" or "uvx package-name@version"
  const parts = command.trim().split(/\s+/);
  
  if (parts.length < 2 || parts[0] !== 'uvx') {
    throw new Error(`Invalid uvx command format: ${command}`);
  }
  
  const packageSpec = parts[1];
  const atIndex = packageSpec.indexOf('@');
  
  if (atIndex === -1) {
    return { package: packageSpec };
  }
  
  return {
    package: packageSpec.substring(0, atIndex),
    version: packageSpec.substring(atIndex + 1),
  };
}

/**
 * Validate Dockerfile content
 */
export function validateDockerfile(dockerfile: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!dockerfile.includes('FROM')) {
    errors.push('Dockerfile must contain a FROM instruction');
  }
  
  if (!dockerfile.includes('CMD') && !dockerfile.includes('ENTRYPOINT')) {
    errors.push('Dockerfile must contain a CMD or ENTRYPOINT instruction');
  }
  
  if (!dockerfile.includes('uvx')) {
    errors.push('Dockerfile must use uvx to run MCP server');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate buildspec content
 */
export function validateBuildspec(buildspec: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!buildspec.includes('version:')) {
    errors.push('Buildspec must contain a version field');
  }
  
  if (!buildspec.includes('phases:')) {
    errors.push('Buildspec must contain phases');
  }
  
  if (!buildspec.includes('docker build')) {
    errors.push('Buildspec must contain docker build command');
  }
  
  if (!buildspec.includes('docker push')) {
    errors.push('Buildspec must contain docker push command');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
