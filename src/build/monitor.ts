/**
 * Build progress monitoring and logging
 */

import {
  CodeBuildClient,
  BatchGetBuildsCommand,
  Build,
  BuildPhase,
  StatusType,
} from '@aws-sdk/client-codebuild';
import { BuildProgress, BuildResult } from '../types';

export interface BuildMonitor {
  monitorBuild(buildId: string, onProgress: (progress: BuildProgress) => void): Promise<BuildResult>;
  getBuildLogs(buildId: string): Promise<string[]>;
  waitForCompletion(buildId: string, pollIntervalMs?: number): Promise<BuildResult>;
}

/**
 * Create a build monitor instance
 */
export function createBuildMonitor(client: CodeBuildClient): BuildMonitor {
  return {
    monitorBuild: async (
      buildId: string,
      onProgress: (progress: BuildProgress) => void
    ): Promise<BuildResult> => {
      let lastPhase = '';
      let isComplete = false;
      
      while (!isComplete) {
        const command = new BatchGetBuildsCommand({
          ids: [buildId],
        });
        
        const response = await client.send(command);
        
        if (!response.builds || response.builds.length === 0) {
          throw new Error(`Build ${buildId} not found`);
        }
        
        const build = response.builds[0];
        const currentPhase = build.currentPhase || 'SUBMITTED';
        
        // Report progress if phase changed
        if (currentPhase !== lastPhase) {
          const progress = buildToBuildProgress(build);
          onProgress(progress);
          lastPhase = currentPhase;
        }
        
        // Check if build is complete
        isComplete = build.buildComplete === true;
        
        if (!isComplete) {
          // Wait before polling again
          await sleep(5000); // 5 seconds
        } else {
          // Final progress update
          const progress = buildToBuildProgress(build);
          onProgress(progress);
          
          return buildToBuildResult(build);
        }
      }
      
      throw new Error('Build monitoring loop exited unexpectedly');
    },

    getBuildLogs: async (buildId: string): Promise<string[]> => {
      const command = new BatchGetBuildsCommand({
        ids: [buildId],
      });
      
      const response = await client.send(command);
      
      if (!response.builds || response.builds.length === 0) {
        throw new Error(`Build ${buildId} not found`);
      }
      
      const build = response.builds[0];
      const logs: string[] = [];
      
      // Add CloudWatch logs link
      if (build.logs?.deepLink) {
        logs.push(`CloudWatch Logs: ${build.logs.deepLink}`);
      }
      
      // Add phase information
      if (build.phases) {
        logs.push('\nBuild Phases:');
        for (const phase of build.phases) {
          logs.push(
            `  ${phase.phaseType}: ${phase.phaseStatus} (${formatDuration(phase.durationInSeconds)})`
          );
          
          if (phase.contexts) {
            for (const context of phase.contexts) {
              logs.push(`    ${context.statusCode}: ${context.message}`);
            }
          }
        }
      }
      
      return logs;
    },

    waitForCompletion: async (buildId: string, pollIntervalMs = 5000): Promise<BuildResult> => {
      while (true) {
        const command = new BatchGetBuildsCommand({
          ids: [buildId],
        });
        
        const response = await client.send(command);
        
        if (!response.builds || response.builds.length === 0) {
          throw new Error(`Build ${buildId} not found`);
        }
        
        const build = response.builds[0];
        
        if (build.buildComplete === true) {
          return buildToBuildResult(build);
        }
        
        await sleep(pollIntervalMs);
      }
    },
  };
}

/**
 * Convert AWS Build object to BuildProgress
 */
function buildToBuildProgress(build: Build): BuildProgress {
  const currentPhase = build.currentPhase || 'SUBMITTED';
  const phases = build.phases || [];
  
  // Calculate progress based on completed phases
  const phaseOrder = [
    'SUBMITTED',
    'QUEUED',
    'PROVISIONING',
    'DOWNLOAD_SOURCE',
    'INSTALL',
    'PRE_BUILD',
    'BUILD',
    'POST_BUILD',
    'UPLOAD_ARTIFACTS',
    'FINALIZING',
    'COMPLETED',
  ];
  
  const currentIndex = phaseOrder.indexOf(currentPhase);
  const percentage = currentIndex >= 0 ? Math.floor((currentIndex / phaseOrder.length) * 100) : 0;
  
  return {
    phase: currentPhase,
    status: build.buildStatus || 'IN_PROGRESS',
    percentage,
    message: getPhaseMessage(currentPhase, build.buildStatus),
  };
}

/**
 * Convert AWS Build object to BuildResult
 */
function buildToBuildResult(build: Build): BuildResult {
  const isSuccess = build.buildStatus === 'SUCCEEDED';
  
  // Extract image URI from environment variables or artifacts
  let imageUri: string | undefined;
  if (build.environment?.environmentVariables) {
    const repoName = build.environment.environmentVariables.find(
      v => v.name === 'IMAGE_REPO_NAME'
    )?.value;
    const imageTag = build.environment.environmentVariables.find(
      v => v.name === 'IMAGE_TAG'
    )?.value;
    const region = build.environment.environmentVariables.find(
      v => v.name === 'AWS_DEFAULT_REGION'
    )?.value;
    const accountId = build.environment.environmentVariables.find(
      v => v.name === 'AWS_ACCOUNT_ID'
    )?.value;
    
    if (repoName && imageTag && region && accountId) {
      imageUri = `${accountId}.dkr.ecr.${region}.amazonaws.com/${repoName}:${imageTag}`;
    }
  }
  
  const logs: string[] = [];
  if (build.logs?.deepLink) {
    logs.push(build.logs.deepLink);
  }
  
  return {
    success: isSuccess,
    buildId: build.id,
    imageUri,
    error: isSuccess ? undefined : build.buildStatus,
    logs,
  };
}

/**
 * Get human-readable message for build phase
 */
function getPhaseMessage(phase: string, status?: string): string {
  const messages: Record<string, string> = {
    SUBMITTED: 'Build submitted to queue',
    QUEUED: 'Build queued, waiting for resources',
    PROVISIONING: 'Provisioning build environment',
    DOWNLOAD_SOURCE: 'Downloading source code',
    INSTALL: 'Installing dependencies',
    PRE_BUILD: 'Running pre-build commands (ECR login)',
    BUILD: 'Building Docker container image',
    POST_BUILD: 'Pushing image to Amazon ECR',
    UPLOAD_ARTIFACTS: 'Uploading build artifacts',
    FINALIZING: 'Finalizing build',
    COMPLETED: status === 'SUCCEEDED' ? 'Build completed successfully' : 'Build failed',
  };
  
  return messages[phase] || `Build phase: ${phase}`;
}

/**
 * Format duration in seconds to human-readable string
 */
function formatDuration(seconds?: number): string {
  if (!seconds) {
    return '0s';
  }
  
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Handle build failure and extract error information
 */
export function handleBuildFailure(build: Build): {
  message: string;
  suggestions: string[];
  logs?: string;
} {
  const failedPhase = build.phases?.find(p => p.phaseStatus === 'FAILED');
  
  let message = 'Build failed';
  const suggestions: string[] = [];
  
  if (failedPhase) {
    message = `Build failed during ${failedPhase.phaseType} phase`;
    
    // Extract error context
    if (failedPhase.contexts && failedPhase.contexts.length > 0) {
      const errorContext = failedPhase.contexts[0];
      message += `: ${errorContext.message}`;
    }
    
    // Provide phase-specific suggestions
    switch (failedPhase.phaseType) {
      case 'PRE_BUILD':
        suggestions.push('Check ECR repository permissions');
        suggestions.push('Verify AWS credentials are configured correctly');
        break;
      case 'BUILD':
        suggestions.push('Check Dockerfile syntax');
        suggestions.push('Verify MCP server package name is correct');
        suggestions.push('Check if uvx can install the specified package');
        break;
      case 'POST_BUILD':
        suggestions.push('Verify ECR repository exists');
        suggestions.push('Check network connectivity to ECR');
        break;
      default:
        suggestions.push('Check CloudWatch logs for detailed error information');
    }
  }
  
  return {
    message,
    suggestions,
    logs: build.logs?.deepLink,
  };
}
