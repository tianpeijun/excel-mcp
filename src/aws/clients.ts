/**
 * AWS SDK client configuration and initialization
 */

import { CodeBuildClient } from '@aws-sdk/client-codebuild';
import { ECRClient } from '@aws-sdk/client-ecr';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

export interface AWSClients {
  codeBuild: CodeBuildClient;
  ecr: ECRClient;
  cognito: CognitoIdentityProviderClient;
}

export interface AWSClientConfig {
  region: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
}

/**
 * Initialize AWS SDK clients with the provided configuration
 */
export function initializeAWSClients(config: AWSClientConfig): AWSClients {
  const clientConfig = {
    region: config.region,
    requestHandler: {
      requestTimeout: 30000, // 30 seconds
      httpsAgent: { keepAlive: true }
    },
    maxAttempts: 3,
    ...(config.credentials && { credentials: config.credentials })
  };

  return {
    codeBuild: new CodeBuildClient(clientConfig),
    ecr: new ECRClient(clientConfig),
    cognito: new CognitoIdentityProviderClient(clientConfig)
  };
}

/**
 * Validate AWS region
 */
export function isValidAWSRegion(region: string): boolean {
  const validRegions = [
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1',
    'ap-northeast-1', 'ap-northeast-2', 'ap-southeast-1', 'ap-southeast-2',
    'ap-south-1', 'sa-east-1', 'ca-central-1'
  ];
  
  return validRegions.includes(region);
}
