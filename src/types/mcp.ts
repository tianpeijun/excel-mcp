/**
 * MCP protocol types
 */

export interface MCPRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id: string | number;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: MCPError;
  id: string | number;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface StreamChunk {
  type: 'data' | 'error' | 'end';
  payload: any;
  timestamp: Date;
}
