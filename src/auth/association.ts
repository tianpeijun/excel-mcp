/**
 * Authentication information association and client code generation
 * Requirement 3.3: Associate authentication information with deployment
 */

import { Config, AuthConfig } from '../types/config';
import { DeploymentAuthConfig } from '../types/deployment';
import { saveConfig, loadConfig } from '../config/persistence';

/**
 * Update configuration with Cognito authentication information
 * Requirement 3.3: Save Cognito configuration to deployment configuration
 */
export async function associateAuthWithConfig(
  authConfig: DeploymentAuthConfig,
  configPath?: string
): Promise<Config> {
  // Load existing config
  const config = await loadConfig(configPath);

  // Update auth section
  config.auth = {
    cognitoUserPoolId: authConfig.cognitoUserPoolId,
    cognitoClientId: authConfig.cognitoClientId,
    cognitoRegion: authConfig.cognitoRegion
  };

  // Save updated config
  await saveConfig(config, configPath);

  return config;
}

/**
 * Generate Python client authentication example code
 * Requirement 3.3: Generate client authentication example code
 */
export function generatePythonAuthExample(authConfig: DeploymentAuthConfig): string {
  return `"""
MCP Client Authentication Example
Generated for project with Cognito User Pool: ${authConfig.cognitoUserPoolId}
"""

import boto3
from typing import Optional

class MCPAuthenticator:
    """Handle authentication with Amazon Cognito for MCP server access"""
    
    def __init__(
        self,
        user_pool_id: str = "${authConfig.cognitoUserPoolId}",
        client_id: str = "${authConfig.cognitoClientId}",
        region: str = "${authConfig.cognitoRegion}"
    ):
        self.user_pool_id = user_pool_id
        self.client_id = client_id
        self.region = region
        self.cognito_client = boto3.client('cognito-idp', region_name=region)
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
    
    def authenticate(self, username: str, password: str) -> str:
        """
        Authenticate with username and password
        
        Args:
            username: User's email or username
            password: User's password
            
        Returns:
            Access token for API requests
        """
        try:
            response = self.cognito_client.initiate_auth(
                ClientId=self.client_id,
                AuthFlow='USER_PASSWORD_AUTH',
                AuthParameters={
                    'USERNAME': username,
                    'PASSWORD': password
                }
            )
            
            auth_result = response['AuthenticationResult']
            self.access_token = auth_result['AccessToken']
            self.refresh_token = auth_result.get('RefreshToken')
            
            return self.access_token
            
        except Exception as e:
            raise Exception(f"Authentication failed: {str(e)}")
    
    def refresh_access_token(self) -> str:
        """
        Refresh the access token using refresh token
        
        Returns:
            New access token
        """
        if not self.refresh_token:
            raise Exception("No refresh token available. Please authenticate first.")
        
        try:
            response = self.cognito_client.initiate_auth(
                ClientId=self.client_id,
                AuthFlow='REFRESH_TOKEN_AUTH',
                AuthParameters={
                    'REFRESH_TOKEN': self.refresh_token
                }
            )
            
            auth_result = response['AuthenticationResult']
            self.access_token = auth_result['AccessToken']
            
            return self.access_token
            
        except Exception as e:
            raise Exception(f"Token refresh failed: {str(e)}")
    
    def get_authorization_header(self) -> dict:
        """
        Get authorization header for API requests
        
        Returns:
            Dictionary with Authorization header
        """
        if not self.access_token:
            raise Exception("Not authenticated. Please call authenticate() first.")
        
        return {
            'Authorization': f'Bearer {self.access_token}'
        }


# Usage example:
if __name__ == "__main__":
    # Initialize authenticator
    auth = MCPAuthenticator()
    
    # Authenticate with username and password
    username = "user@example.com"
    password = "your-password"
    
    try:
        token = auth.authenticate(username, password)
        print(f"Successfully authenticated!")
        print(f"Access token: {token[:20]}...")
        
        # Get authorization header for API requests
        headers = auth.get_authorization_header()
        print(f"Authorization header: {headers}")
        
        # Use this header when making requests to your MCP server endpoint
        # Example:
        # import requests
        # response = requests.post(
        #     "https://your-mcp-endpoint.amazonaws.com",
        #     headers=headers,
        #     json={"method": "your_method", "params": {}}
        # )
        
    except Exception as e:
        print(f"Error: {e}")
`;
}

/**
 * Generate JavaScript/TypeScript client authentication example code
 * Requirement 3.3: Generate client authentication example code
 */
export function generateJavaScriptAuthExample(authConfig: DeploymentAuthConfig): string {
  return `/**
 * MCP Client Authentication Example
 * Generated for project with Cognito User Pool: ${authConfig.cognitoUserPoolId}
 */

import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';

interface AuthConfig {
  userPoolId: string;
  clientId: string;
  region: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
}

class MCPAuthenticator {
  private cognitoClient: CognitoIdentityProviderClient;
  private config: AuthConfig;
  private tokens: AuthTokens | null = null;

  constructor(config?: Partial<AuthConfig>) {
    this.config = {
      userPoolId: config?.userPoolId || '${authConfig.cognitoUserPoolId}',
      clientId: config?.clientId || '${authConfig.cognitoClientId}',
      region: config?.region || '${authConfig.cognitoRegion}'
    };

    this.cognitoClient = new CognitoIdentityProviderClient({
      region: this.config.region
    });
  }

  /**
   * Authenticate with username and password
   */
  async authenticate(username: string, password: string): Promise<string> {
    try {
      const command = new InitiateAuthCommand({
        ClientId: this.config.clientId,
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password
        }
      });

      const response = await this.cognitoClient.send(command);
      
      if (!response.AuthenticationResult) {
        throw new Error('No authentication result returned');
      }

      this.tokens = {
        accessToken: response.AuthenticationResult.AccessToken!,
        refreshToken: response.AuthenticationResult.RefreshToken,
        idToken: response.AuthenticationResult.IdToken
      };

      return this.tokens.accessToken;
    } catch (error) {
      throw new Error(\`Authentication failed: \${error}\`);
    }
  }

  /**
   * Refresh the access token
   */
  async refreshAccessToken(): Promise<string> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available. Please authenticate first.');
    }

    try {
      const command = new InitiateAuthCommand({
        ClientId: this.config.clientId,
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        AuthParameters: {
          REFRESH_TOKEN: this.tokens.refreshToken
        }
      });

      const response = await this.cognitoClient.send(command);
      
      if (!response.AuthenticationResult) {
        throw new Error('No authentication result returned');
      }

      this.tokens.accessToken = response.AuthenticationResult.AccessToken!;
      
      return this.tokens.accessToken;
    } catch (error) {
      throw new Error(\`Token refresh failed: \${error}\`);
    }
  }

  /**
   * Get authorization header for API requests
   */
  getAuthorizationHeader(): Record<string, string> {
    if (!this.tokens?.accessToken) {
      throw new Error('Not authenticated. Please call authenticate() first.');
    }

    return {
      'Authorization': \`Bearer \${this.tokens.accessToken}\`
    };
  }

  /**
   * Check if currently authenticated
   */
  isAuthenticated(): boolean {
    return this.tokens !== null && this.tokens.accessToken !== undefined;
  }
}

// Usage example:
async function main() {
  const auth = new MCPAuthenticator();

  try {
    // Authenticate
    const token = await auth.authenticate('user@example.com', 'your-password');
    console.log('Successfully authenticated!');
    console.log(\`Access token: \${token.substring(0, 20)}...\`);

    // Get authorization header
    const headers = auth.getAuthorizationHeader();
    console.log('Authorization header:', headers);

    // Use this header when making requests to your MCP server endpoint
    // Example with fetch:
    // const response = await fetch('https://your-mcp-endpoint.amazonaws.com', {
    //   method: 'POST',
    //   headers: {
    //     ...headers,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     method: 'your_method',
    //     params: {}
    //   })
    // });

  } catch (error) {
    console.error('Error:', error);
  }
}

export { MCPAuthenticator, AuthConfig, AuthTokens };
`;
}

/**
 * Generate authentication example code in the specified language
 */
export function generateAuthExample(
  authConfig: DeploymentAuthConfig,
  language: 'python' | 'javascript' | 'typescript' = 'python'
): string {
  switch (language) {
    case 'python':
      return generatePythonAuthExample(authConfig);
    case 'javascript':
    case 'typescript':
      return generateJavaScriptAuthExample(authConfig);
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}

/**
 * Save authentication example code to a file
 */
export async function saveAuthExample(
  authConfig: DeploymentAuthConfig,
  outputPath: string,
  language: 'python' | 'javascript' | 'typescript' = 'python'
): Promise<void> {
  const fs = await import('fs');
  const code = generateAuthExample(authConfig, language);
  
  return new Promise((resolve, reject) => {
    fs.writeFile(outputPath, code, 'utf8', (error) => {
      if (error) {
        reject(new Error(`Failed to save auth example: ${error.message}`));
      } else {
        resolve();
      }
    });
  });
}
