/**
 * Token validation middleware for Streamable HTTP runtime
 * Requirements: 3.4, 3.5
 */

import {
  CognitoIdentityProviderClient,
  GetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { TokenValidationResult } from '../types/http';
import { ErrorCategory } from '../types/errors';

export class AuthMiddleware {
  private cognitoClient: CognitoIdentityProviderClient;

  constructor(region: string) {
    this.cognitoClient = new CognitoIdentityProviderClient({ region });
  }

  /**
   * Extract Authorization header from request
   * @param headers Request headers
   * @returns Access token or null if not found
   */
  extractToken(headers: Record<string, string>): string | null {
    const authHeader = headers['authorization'] || headers['Authorization'];
    
    if (!authHeader) {
      return null;
    }

    // Expected format: "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Validate Cognito token
   * @param token Access token to validate
   * @returns Validation result with user info or error
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      const command = new GetUserCommand({
        AccessToken: token,
      });

      const response = await this.cognitoClient.send(command);

      return {
        valid: true,
        userId: response.Username,
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Token validation failed',
      };
    }
  }

  /**
   * Validate request authentication
   * @param headers Request headers
   * @returns Validation result
   */
  async validateRequest(
    headers: Record<string, string>
  ): Promise<TokenValidationResult> {
    const token = this.extractToken(headers);

    if (!token) {
      return {
        valid: false,
        error: 'Missing or invalid Authorization header',
      };
    }

    return this.validateToken(token);
  }

  /**
   * Create 401 Unauthorized response
   * @param error Error message
   * @returns Response object
   */
  createUnauthorizedResponse(error: string): {
    status: number;
    headers: Record<string, string>;
    body: string;
  } {
    return {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer',
      },
      body: JSON.stringify({
        error: ErrorCategory.AUTH_ERROR,
        message: 'Unauthorized',
        details: error,
      }),
    };
  }
}
