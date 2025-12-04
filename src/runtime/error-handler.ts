/**
 * Transmission error handling for Streamable HTTP runtime
 * Requirements: 5.4
 */

import { ErrorCategory, CategorizedError } from '../types/errors';
import { StreamableResponse } from '../types/http';

export class TransmissionErrorHandler {
  /**
   * Categorize transmission errors
   * @param error Error object
   * @returns Categorized error
   */
  categorizeError(error: Error): CategorizedError {
    const message = error.message.toLowerCase();

    // Network/connection errors
    if (
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('econnrefused')
    ) {
      return {
        category: ErrorCategory.RUNTIME_ERROR,
        code: 'TRANSMISSION_001',
        message: 'Network connection error',
        details: error.message,
        originalError: error,
      };
    }

    // Stream errors
    if (
      message.includes('stream') ||
      message.includes('pipe') ||
      message.includes('closed')
    ) {
      return {
        category: ErrorCategory.RUNTIME_ERROR,
        code: 'TRANSMISSION_002',
        message: 'Stream transmission error',
        details: error.message,
        originalError: error,
      };
    }

    // Authentication errors
    if (
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('token')
    ) {
      return {
        category: ErrorCategory.AUTH_ERROR,
        code: 'TRANSMISSION_003',
        message: 'Authentication error during transmission',
        details: error.message,
        originalError: error,
      };
    }

    // MCP server errors
    if (message.includes('mcp') || message.includes('server')) {
      return {
        category: ErrorCategory.RUNTIME_ERROR,
        code: 'TRANSMISSION_004',
        message: 'MCP server error',
        details: error.message,
        originalError: error,
      };
    }

    // Generic transmission error
    return {
      category: ErrorCategory.RUNTIME_ERROR,
      code: 'TRANSMISSION_000',
      message: 'Transmission error',
      details: error.message,
      originalError: error,
    };
  }

  /**
   * Create error response with clear information
   * @param error Categorized error
   * @returns Error response
   */
  createErrorResponse(error: CategorizedError): StreamableResponse {
    const statusCode = this.getStatusCode(error);
    const errorBody = {
      error: {
        category: error.category,
        code: error.code,
        message: error.message,
        details: error.details,
        suggestions: this.getSuggestions(error),
      },
      timestamp: new Date().toISOString(),
    };

    return {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(errorBody),
    };
  }

  /**
   * Get HTTP status code for error
   * @param error Categorized error
   * @returns HTTP status code
   */
  private getStatusCode(error: CategorizedError): number {
    switch (error.category) {
      case ErrorCategory.AUTH_ERROR:
        return 401;
      case ErrorCategory.CONFIG_ERROR:
        return 400;
      case ErrorCategory.RUNTIME_ERROR:
        if (error.code === 'TRANSMISSION_001') {
          return 503; // Service Unavailable
        }
        if (error.code === 'TRANSMISSION_002') {
          return 500; // Internal Server Error
        }
        return 500;
      default:
        return 500;
    }
  }

  /**
   * Get suggestions for error resolution
   * @param error Categorized error
   * @returns Array of suggestions
   */
  private getSuggestions(error: CategorizedError): string[] {
    switch (error.code) {
      case 'TRANSMISSION_001':
        return [
          'Check if the MCP server is running and accessible',
          'Verify network connectivity',
          'Check firewall settings',
          'Retry the request after a short delay',
        ];
      case 'TRANSMISSION_002':
        return [
          'The connection was interrupted during transmission',
          'Retry the request',
          'Check for network stability issues',
        ];
      case 'TRANSMISSION_003':
        return [
          'Verify your authentication token is valid',
          'Obtain a new token if the current one has expired',
          'Check that you have permission to access this resource',
        ];
      case 'TRANSMISSION_004':
        return [
          'The MCP server encountered an error',
          'Check MCP server logs for details',
          'Verify the request format is correct',
          'Contact the server administrator if the problem persists',
        ];
      default:
        return [
          'An unexpected error occurred during transmission',
          'Retry the request',
          'Contact support if the problem persists',
        ];
    }
  }

  /**
   * Handle streaming errors gracefully
   * @param error Error object
   * @param onError Callback for error handling
   */
  async handleStreamError(
    error: Error,
    onError?: (error: CategorizedError) => void
  ): Promise<void> {
    const categorized = this.categorizeError(error);

    // Log error
    console.error('Transmission error:', {
      category: categorized.category,
      code: categorized.code,
      message: categorized.message,
      details: categorized.details,
    });

    // Call error callback if provided
    if (onError) {
      onError(categorized);
    }
  }

  /**
   * Wrap async operation with error handling
   * @param operation Async operation to execute
   * @returns Result or error response
   */
  async withErrorHandling<T>(
    operation: () => Promise<T>
  ): Promise<T | StreamableResponse> {
    try {
      return await operation();
    } catch (error: any) {
      const categorized = this.categorizeError(error);
      return this.createErrorResponse(categorized);
    }
  }
}
