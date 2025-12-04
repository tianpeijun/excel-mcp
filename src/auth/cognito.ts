/**
 * Amazon Cognito integration for MCP server authentication
 */

import {
  CognitoIdentityProviderClient,
  CreateUserPoolCommand,
  DescribeUserPoolCommand,
  CreateUserPoolClientCommand,
  ListUserPoolsCommand,
  ResourceNotFoundException,
  UserPoolType,
  UserPoolClientType
} from '@aws-sdk/client-cognito-identity-provider';
import { DeploymentAuthConfig } from '../types/deployment';

export interface CognitoSetupOptions {
  projectName: string;
  region: string;
  tokenValidityHours?: number;
}

export interface CognitoSetupResult {
  userPoolId: string;
  clientId: string;
  region: string;
  userPoolArn?: string;
}

/**
 * Create or get existing Cognito user pool for MCP server authentication
 */
export async function setupCognitoAuth(
  client: CognitoIdentityProviderClient,
  options: CognitoSetupOptions
): Promise<CognitoSetupResult> {
  const userPoolName = `${options.projectName}-mcp-pool`;
  const clientName = `${options.projectName}-mcp-client`;

  // Try to find existing user pool
  const existingPool = await findUserPoolByName(client, userPoolName);
  
  let userPoolId: string;
  let userPoolArn: string | undefined;

  if (existingPool) {
    userPoolId = existingPool.Id!;
    userPoolArn = existingPool.Arn;
  } else {
    // Create new user pool
    const poolResult = await createUserPool(client, userPoolName);
    userPoolId = poolResult.userPoolId;
    userPoolArn = poolResult.userPoolArn;
  }

  // Create app client
  const clientId = await createAppClient(
    client,
    userPoolId,
    clientName,
    options.tokenValidityHours || 24
  );

  return {
    userPoolId,
    clientId,
    region: options.region,
    userPoolArn
  };
}

/**
 * Find user pool by name
 */
async function findUserPoolByName(
  client: CognitoIdentityProviderClient,
  poolName: string
): Promise<UserPoolType | null> {
  try {
    const command = new ListUserPoolsCommand({
      MaxResults: 60
    });
    
    const response = await client.send(command);
    
    if (response.UserPools) {
      const pool = response.UserPools.find(p => p.Name === poolName);
      return pool || null;
    }
    
    return null;
  } catch (error) {
    // If listing fails, assume pool doesn't exist
    return null;
  }
}

/**
 * Create a new Cognito user pool
 */
async function createUserPool(
  client: CognitoIdentityProviderClient,
  poolName: string
): Promise<{ userPoolId: string; userPoolArn?: string }> {
  const command = new CreateUserPoolCommand({
    PoolName: poolName,
    Policies: {
      PasswordPolicy: {
        MinimumLength: 8,
        RequireUppercase: true,
        RequireLowercase: true,
        RequireNumbers: true,
        RequireSymbols: false
      }
    },
    AutoVerifiedAttributes: ['email'],
    MfaConfiguration: 'OFF',
    AccountRecoverySetting: {
      RecoveryMechanisms: [
        {
          Name: 'verified_email',
          Priority: 1
        }
      ]
    }
  });

  const response = await client.send(command);
  
  if (!response.UserPool?.Id) {
    throw new Error('Failed to create user pool: No ID returned');
  }

  return {
    userPoolId: response.UserPool.Id,
    userPoolArn: response.UserPool.Arn
  };
}

/**
 * Create app client for the user pool
 */
async function createAppClient(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  clientName: string,
  tokenValidityHours: number
): Promise<string> {
  const command = new CreateUserPoolClientCommand({
    UserPoolId: userPoolId,
    ClientName: clientName,
    GenerateSecret: false,
    ExplicitAuthFlows: [
      'ALLOW_USER_PASSWORD_AUTH',
      'ALLOW_REFRESH_TOKEN_AUTH',
      'ALLOW_USER_SRP_AUTH'
    ],
    AccessTokenValidity: tokenValidityHours,
    IdTokenValidity: tokenValidityHours,
    RefreshTokenValidity: 30, // 30 days
    TokenValidityUnits: {
      AccessToken: 'hours',
      IdToken: 'hours',
      RefreshToken: 'days'
    },
    PreventUserExistenceErrors: 'ENABLED'
  });

  const response = await client.send(command);
  
  if (!response.UserPoolClient?.ClientId) {
    throw new Error('Failed to create app client: No client ID returned');
  }

  return response.UserPoolClient.ClientId;
}

/**
 * Get user pool details
 */
export async function getUserPoolDetails(
  client: CognitoIdentityProviderClient,
  userPoolId: string
): Promise<UserPoolType> {
  const command = new DescribeUserPoolCommand({
    UserPoolId: userPoolId
  });

  const response = await client.send(command);
  
  if (!response.UserPool) {
    throw new Error(`User pool ${userPoolId} not found`);
  }

  return response.UserPool;
}

/**
 * Convert CognitoSetupResult to DeploymentAuthConfig
 */
export function toDeploymentAuthConfig(result: CognitoSetupResult): DeploymentAuthConfig {
  return {
    cognitoUserPoolId: result.userPoolId,
    cognitoClientId: result.clientId,
    cognitoRegion: result.region
  };
}
