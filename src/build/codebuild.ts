/**
 * CodeBuild integration for building MCP server container images
 */

import {
  CodeBuildClient,
  CreateProjectCommand,
  StartBuildCommand,
  BatchGetBuildsCommand,
  BatchGetProjectsCommand,
  ComputeType,
  EnvironmentType,
  Build,
  BuildPhase,
} from '@aws-sdk/client-codebuild';
import { Config, BuildResult, BuildProgress } from '../types';
import { generateBuildspec } from './generator';

export interface BuildService {
  ensureProject(config: Config): Promise<string>;
  triggerBuild(config: Config, projectName: string): Promise<string>;
  pollBuildStatus(buildId: string): Promise<BuildResult>;
  getBuildProgress(buildId: string): Promise<BuildProgress>;
}

/**
 * Create a CodeBuild service instance
 */
export function createBuildService(client: CodeBuildClient): BuildService {
  return {
    ensureProject: async (config: Config): Promise<string> => {
      const projectName = config.build.codebuildProject;
      
      // Check if project exists
      try {
        const getProjectResponse = await client.send(
          new BatchGetProjectsCommand({
            names: [projectName],
          })
        );
        
        if (getProjectResponse.projects && getProjectResponse.projects.length > 0) {
          return projectName;
        }
      } catch (error) {
        // Project doesn't exist, will create it
      }
      
      // Get AWS account ID from STS
      const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
      const stsClient = new STSClient({ region: config.project.region });
      const identity = await stsClient.send(new GetCallerIdentityCommand({}));
      const accountId = identity.Account;
      
      // Create the project
      const buildspecContent = generateBuildspec(config);
      const createProjectCommand = new CreateProjectCommand({
        name: projectName,
        description: `Build MCP server container for ${config.project.name}`,
        source: {
          type: 'NO_SOURCE',
          buildspec: buildspecContent,
        },
        artifacts: {
          type: 'NO_ARTIFACTS',
        },
        environment: {
          type: EnvironmentType.LINUX_CONTAINER,
          image: 'aws/codebuild/standard:7.0',
          computeType: ComputeType.BUILD_GENERAL1_SMALL,
          privilegedMode: true, // Required for Docker builds
          environmentVariables: [
            {
              name: 'AWS_DEFAULT_REGION',
              value: config.project.region,
            },
            {
              name: 'AWS_ACCOUNT_ID',
              value: accountId,
            },
            {
              name: 'IMAGE_REPO_NAME',
              value: config.build.ecrRepository,
            },
            {
              name: 'IMAGE_TAG',
              value: config.build.imageTag || 'latest',
            },
            {
              name: 'MCP_SERVER_COMMAND',
              value: config.server.command,
            },
            {
              name: 'MCP_SERVER_ARGS',
              value: config.server.args.join(' '),
            },
          ],
        },
        serviceRole: `arn:aws:iam::${accountId}:role/CodeBuildServiceRole`,
        timeoutInMinutes: config.build.buildTimeout || 30,
      });
      
      await client.send(createProjectCommand);
      return projectName;
    },

    triggerBuild: async (config: Config, projectName: string): Promise<string> => {
      const startBuildCommand = new StartBuildCommand({
        projectName,
        environmentVariablesOverride: Object.entries(config.server.environment).map(
          ([name, value]) => ({
            name,
            value,
            type: 'PLAINTEXT',
          })
        ),
      });
      
      const response = await client.send(startBuildCommand);
      
      if (!response.build?.id) {
        throw new Error('Failed to start build: No build ID returned');
      }
      
      return response.build.id;
    },

    pollBuildStatus: async (buildId: string): Promise<BuildResult> => {
      const command = new BatchGetBuildsCommand({
        ids: [buildId],
      });
      
      const response = await client.send(command);
      
      if (!response.builds || response.builds.length === 0) {
        throw new Error(`Build ${buildId} not found`);
      }
      
      const build = response.builds[0];
      
      return buildToBuildResult(build);
    },

    getBuildProgress: async (buildId: string): Promise<BuildProgress> => {
      const command = new BatchGetBuildsCommand({
        ids: [buildId],
      });
      
      const response = await client.send(command);
      
      if (!response.builds || response.builds.length === 0) {
        throw new Error(`Build ${buildId} not found`);
      }
      
      const build = response.builds[0];
      
      return buildToBuildProgress(build);
    },
  };
}

/**
 * Convert AWS Build object to BuildResult
 */
function buildToBuildResult(build: Build): BuildResult {
  const isComplete = build.buildComplete === true;
  const isSuccess = build.buildStatus === 'SUCCEEDED';
  
  return {
    success: isSuccess,
    buildId: build.id,
    imageUri: extractImageUri(build),
    error: isSuccess ? undefined : build.buildStatus,
    logs: build.logs?.deepLink ? [build.logs.deepLink] : undefined,
  };
}

/**
 * Convert AWS Build object to BuildProgress
 */
function buildToBuildProgress(build: Build): BuildProgress {
  const currentPhase = build.currentPhase || 'SUBMITTED';
  const phases = build.phases || [];
  
  // Calculate progress based on completed phases
  const totalPhases = 5; // SUBMITTED, PROVISIONING, DOWNLOAD_SOURCE, BUILD, UPLOAD_ARTIFACTS
  const completedPhases = phases.filter(p => p.phaseStatus === 'SUCCEEDED').length;
  const percentage = Math.floor((completedPhases / totalPhases) * 100);
  
  return {
    phase: currentPhase,
    status: build.buildStatus || 'IN_PROGRESS',
    percentage,
    message: getPhaseMessage(currentPhase, build.buildStatus),
  };
}

/**
 * Extract image URI from build artifacts
 */
function extractImageUri(build: Build): string | undefined {
  // In a real implementation, this would parse the artifacts
  // For now, we construct it from the environment variables
  return undefined;
}

/**
 * Get human-readable message for build phase
 */
function getPhaseMessage(phase: string, status?: string): string {
  const messages: Record<string, string> = {
    SUBMITTED: 'Build submitted',
    QUEUED: 'Build queued',
    PROVISIONING: 'Provisioning build environment',
    DOWNLOAD_SOURCE: 'Downloading source',
    INSTALL: 'Installing dependencies',
    PRE_BUILD: 'Running pre-build commands',
    BUILD: 'Building container image',
    POST_BUILD: 'Pushing image to ECR',
    UPLOAD_ARTIFACTS: 'Uploading artifacts',
    FINALIZING: 'Finalizing build',
    COMPLETED: status === 'SUCCEEDED' ? 'Build completed successfully' : 'Build failed',
  };
  
  return messages[phase] || `Build phase: ${phase}`;
}
