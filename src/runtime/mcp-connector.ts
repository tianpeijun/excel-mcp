/**
 * MCP Server connection and request forwarding
 * Requirements: 5.1
 */

import { MCPRequest, MCPResponse } from '../types/mcp';
import { MCPConnection } from '../types/http';

export class MCPConnector {
  private connections: Map<string, MCPConnection>;

  constructor() {
    this.connections = new Map();
  }

  /**
   * Establish connection to MCP server
   * @param serverUrl MCP server URL
   * @returns Connection object
   */
  async connect(serverUrl: string): Promise<MCPConnection> {
    // Check if connection already exists
    const existing = this.connections.get(serverUrl);
    if (existing && existing.connected) {
      return existing;
    }

    // Create new connection
    const connection = await this.createConnection(serverUrl);
    this.connections.set(serverUrl, connection);
    return connection;
  }

  /**
   * Create a new connection to MCP server
   * @param serverUrl MCP server URL
   * @returns Connection object
   */
  private async createConnection(serverUrl: string): Promise<MCPConnection> {
    // In a real implementation, this would establish an HTTP/WebSocket connection
    // For now, we'll create a mock connection structure
    
    const connection: MCPConnection = {
      url: serverUrl,
      connected: true,
      
      async send(data: any): Promise<void> {
        // Send data to MCP server via HTTP POST
        const response = await fetch(serverUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(`Failed to send request: ${response.statusText}`);
        }
      },

      async *receive(): AsyncIterator<any> {
        // This would be implemented based on the actual streaming protocol
        // For streamable HTTP, we'd read chunks from the response
        throw new Error('Not implemented in base connection');
      },

      async close(): Promise<void> {
        this.connected = false;
      },
    };

    return connection;
  }

  /**
   * Forward request to MCP server
   * @param serverUrl MCP server URL
   * @param request MCP request
   * @returns Response stream
   */
  async forwardRequest(
    serverUrl: string,
    request: MCPRequest
  ): Promise<Response> {
    const connection = await this.connect(serverUrl);

    // Forward the request using fetch with streaming support
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(
        `MCP server returned error: ${response.status} ${response.statusText}`
      );
    }

    return response;
  }

  /**
   * Close connection to MCP server
   * @param serverUrl MCP server URL
   */
  async disconnect(serverUrl: string): Promise<void> {
    const connection = this.connections.get(serverUrl);
    if (connection) {
      await connection.close();
      this.connections.delete(serverUrl);
    }
  }

  /**
   * Close all connections
   */
  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.connections.keys()).map((url) =>
      this.disconnect(url)
    );
    await Promise.all(promises);
  }
}
