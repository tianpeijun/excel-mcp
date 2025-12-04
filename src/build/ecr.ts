/**
 * Amazon ECR (Elastic Container Registry) integration
 */

import {
  ECRClient,
  CreateRepositoryCommand,
  DescribeRepositoriesCommand,
  DescribeImagesCommand,
  PutLifecyclePolicyCommand,
  RepositoryNotFoundException,
  ImageIdentifier,
} from '@aws-sdk/client-ecr';
import { Config } from '../types';

export interface ECRService {
  ensureRepository(repositoryName: string): Promise<string>;
  verifyImagePushed(repositoryName: string, imageTag: string): Promise<boolean>;
  getImageUri(repositoryName: string, imageTag: string, region: string): string;
  listImages(repositoryName: string): Promise<ImageIdentifier[]>;
}

/**
 * Create an ECR service instance
 */
export function createECRService(client: ECRClient, accountId: string): ECRService {
  return {
    ensureRepository: async (repositoryName: string): Promise<string> => {
      try {
        // Check if repository exists
        const describeCommand = new DescribeRepositoriesCommand({
          repositoryNames: [repositoryName],
        });
        
        const response = await client.send(describeCommand);
        
        if (response.repositories && response.repositories.length > 0) {
          return response.repositories[0].repositoryUri || '';
        }
      } catch (error) {
        if (error instanceof RepositoryNotFoundException) {
          // Repository doesn't exist, create it
          const createCommand = new CreateRepositoryCommand({
            repositoryName,
            imageScanningConfiguration: {
              scanOnPush: true,
            },
            imageTagMutability: 'MUTABLE',
          });
          
          const createResponse = await client.send(createCommand);
          
          // Set lifecycle policy to keep only recent images
          await setLifecyclePolicy(client, repositoryName);
          
          return createResponse.repository?.repositoryUri || '';
        }
        throw error;
      }
      
      throw new Error(`Failed to ensure repository ${repositoryName}`);
    },

    verifyImagePushed: async (repositoryName: string, imageTag: string): Promise<boolean> => {
      try {
        const command = new DescribeImagesCommand({
          repositoryName,
          imageIds: [
            {
              imageTag,
            },
          ],
        });
        
        const response = await client.send(command);
        
        return (response.imageDetails && response.imageDetails.length > 0) || false;
      } catch (error) {
        // Image not found
        return false;
      }
    },

    getImageUri: (repositoryName: string, imageTag: string, region: string): string => {
      return `${accountId}.dkr.ecr.${region}.amazonaws.com/${repositoryName}:${imageTag}`;
    },

    listImages: async (repositoryName: string): Promise<ImageIdentifier[]> => {
      try {
        const command = new DescribeImagesCommand({
          repositoryName,
        });
        
        const response = await client.send(command);
        
        return response.imageDetails?.map(detail => ({
          imageTag: detail.imageTags?.[0],
          imageDigest: detail.imageDigest,
        })) || [];
      } catch (error) {
        return [];
      }
    },
  };
}

/**
 * Set lifecycle policy to automatically clean up old images
 */
async function setLifecyclePolicy(client: ECRClient, repositoryName: string): Promise<void> {
  const lifecyclePolicy = {
    rules: [
      {
        rulePriority: 1,
        description: 'Keep only the last 10 images',
        selection: {
          tagStatus: 'any',
          countType: 'imageCountMoreThan',
          countNumber: 10,
        },
        action: {
          type: 'expire',
        },
      },
    ],
  };
  
  const command = new PutLifecyclePolicyCommand({
    repositoryName,
    lifecyclePolicyText: JSON.stringify(lifecyclePolicy),
  });
  
  try {
    await client.send(command);
  } catch (error) {
    // Lifecycle policy is optional, don't fail if it can't be set
    console.warn(`Failed to set lifecycle policy for ${repositoryName}:`, error);
  }
}

/**
 * Get AWS account ID from ECR client
 * This is a helper function to extract account ID from the caller identity
 */
export async function getAccountId(client: ECRClient): Promise<string> {
  // In a real implementation, this would use STS GetCallerIdentity
  // For now, we'll extract it from the repository URI after creating a test repo
  // or require it to be passed in configuration
  throw new Error('Account ID must be provided in configuration');
}

/**
 * Parse ECR image URI to extract components
 */
export function parseImageUri(imageUri: string): {
  accountId: string;
  region: string;
  repositoryName: string;
  imageTag: string;
} {
  // Format: 123456789012.dkr.ecr.us-east-1.amazonaws.com/repo-name:tag
  const regex = /^(\d+)\.dkr\.ecr\.([^.]+)\.amazonaws\.com\/([^:]+):(.+)$/;
  const match = imageUri.match(regex);
  
  if (!match) {
    throw new Error(`Invalid ECR image URI format: ${imageUri}`);
  }
  
  return {
    accountId: match[1],
    region: match[2],
    repositoryName: match[3],
    imageTag: match[4],
  };
}

/**
 * Validate ECR repository name
 */
export function validateRepositoryName(name: string): { valid: boolean; error?: string } {
  // ECR repository names must be lowercase, can contain hyphens and slashes
  const regex = /^[a-z0-9]+(?:[._-][a-z0-9]+)*(?:\/[a-z0-9]+(?:[._-][a-z0-9]+)*)*$/;
  
  if (!regex.test(name)) {
    return {
      valid: false,
      error: 'Repository name must be lowercase and can only contain letters, numbers, hyphens, underscores, periods, and forward slashes',
    };
  }
  
  if (name.length > 256) {
    return {
      valid: false,
      error: 'Repository name must be 256 characters or less',
    };
  }
  
  return { valid: true };
}
