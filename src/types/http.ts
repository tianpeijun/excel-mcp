/**
 * HTTP handler types for Streamable HTTP runtime
 */

export interface IncomingRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
}

export interface StreamableResponse {
  status: number;
  headers: Record<string, string>;
  body: ReadableStream | string;
}

export interface TokenValidationResult {
  valid: boolean;
  userId?: string;
  error?: string;
}

export interface MCPConnection {
  url: string;
  connected: boolean;
  send(data: any): Promise<void>;
  receive(): AsyncIterator<any>;
  close(): Promise<void>;
}
