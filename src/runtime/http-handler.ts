/**
 * Main Streamable HTTP handler
 * Integrates authentication, request forwarding, streaming, and error handling
 */

import { AuthMiddleware } from './auth-middleware';
import { MCPConnector } from './mcp-connector';
import { StreamHandler } from './stream-handler';
import { TransmissionErrorHandler } from './error-handler';
import { IncomingRequest, StreamableResponse } from '../types/http';
import { MCPRequest } from '../types/mcp';

export interface HttpHandlerConfig {
  region: string;
  mcpServerUrl: string;
}

export class StreamableHttpHandler {
  private authMiddleware: AuthMiddleware;
  private mcpConnector: MCPConnector;
  private streamHandler: StreamHandler;
  private errorHandler: TransmissionErrorHandler;
  private mcpServerUrl: string;

  constructor(config: HttpHandlerConfig) {
    this.authMiddleware = new AuthMiddleware(config.region);
    this.mcpConnector = new MCPConnector();
    this.streamHandler = new StreamHandler();
    this.errorHandler = new TransmissionErrorHandler();
    this.mcpServerUrl = config.mcpServerUrl;
  }

  /**
   * Handle incoming HTTP request
   * @param request Incoming request
   * @returns Streamable response
   */
  async handleRequest(
    request: IncomingRequest
  ): Promise<StreamableResponse> {
    return this.errorHandler.withErrorHandling(async () => {
      // Step 1: Validate authentication token
      const validationResult = await this.authMiddleware.validateRequest(
        request.headers
      );

      if (!validationResult.valid) {
        return this.authMiddleware.createUnauthorizedResponse(
          validationResult.error || 'Invalid token'
        );
      }

      // Step 2: Parse MCP request from body
      const mcpRequest: MCPRequest = this.parseMCPRequest(request.body);

      // Step 3: Forward request to MCP server
      const mcpResponse = await this.mcpConnector.forwardRequest(
        this.mcpServerUrl,
        mcpRequest
      );

      // Step 4: Create streaming response
      const streamingResponse = await this.streamHandler.createStreamingResponse(
        mcpResponse
      );

      return streamingResponse;
    }) as Promise<StreamableResponse>;
  }

  /**
   * Parse MCP request from request body
   * @param body Request body
   * @returns MCP request object
   */
  private parseMCPRequest(body: any): MCPRequest {
    if (typeof body === 'string') {
      return JSON.parse(body);
    }
    return body;
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await this.mcpConnector.disconnectAll();
  }
}
