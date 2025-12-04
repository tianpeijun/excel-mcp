/**
 * Streamable HTTP response handler
 * Requirements: 5.2, 5.3
 */

import { IncomingRequest, StreamableResponse } from '../types/http';
import { MCPRequest, StreamChunk } from '../types/mcp';

export class StreamHandler {
  /**
   * Create a streaming response from MCP server response
   * @param mcpResponse Response from MCP server
   * @returns Streamable response with chunked transfer encoding
   */
  async createStreamingResponse(
    mcpResponse: Response
  ): Promise<StreamableResponse> {
    if (!mcpResponse.body) {
      throw new Error('Response body is null');
    }

    // Create a transform stream to handle chunked data
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        // Forward chunks as they arrive
        controller.enqueue(chunk);
      },
    });

    // Pipe the response body through the transform stream
    mcpResponse.body.pipeTo(transformStream.writable);

    return {
      status: mcpResponse.status,
      headers: {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      body: transformStream.readable,
    };
  }

  /**
   * Stream response data with proper chunking
   * @param request Incoming request
   * @param mcpResponse Response from MCP server
   * @returns Async iterator of chunks
   */
  async *streamResponse(
    request: IncomingRequest,
    mcpResponse: Response
  ): AsyncIterableIterator<StreamChunk> {
    if (!mcpResponse.body) {
      yield {
        type: 'error',
        payload: { message: 'No response body' },
        timestamp: new Date(),
      };
      return;
    }

    const reader = mcpResponse.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          yield {
            type: 'end',
            payload: null,
            timestamp: new Date(),
          };
          break;
        }

        // Decode chunk and yield
        const text = decoder.decode(value, { stream: true });
        
        yield {
          type: 'data',
          payload: text,
          timestamp: new Date(),
        };
      }
    } catch (error: any) {
      yield {
        type: 'error',
        payload: { message: error.message },
        timestamp: new Date(),
      };
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Maintain connection for bidirectional streaming
   * @param request Incoming request
   * @param mcpServerUrl MCP server URL
   * @returns Connection handler
   */
  createPersistentConnection(
    request: IncomingRequest,
    mcpServerUrl: string
  ): {
    send: (data: MCPRequest) => Promise<Response>;
    close: () => void;
  } {
    let isActive = true;

    return {
      async send(data: MCPRequest): Promise<Response> {
        if (!isActive) {
          throw new Error('Connection closed');
        }

        const response = await fetch(mcpServerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Connection': 'keep-alive',
          },
          body: JSON.stringify(data),
          keepalive: true,
        });

        return response;
      },

      close() {
        isActive = false;
      },
    };
  }

  /**
   * Handle backpressure during streaming
   * @param reader ReadableStream reader
   * @param writer WritableStream writer
   */
  async handleBackpressure(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    writer: WritableStreamDefaultWriter<Uint8Array>
  ): Promise<void> {
    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          await writer.close();
          break;
        }

        // Wait for writer to be ready (handles backpressure)
        await writer.ready;
        await writer.write(value);
      }
    } catch (error) {
      await writer.abort(error);
      throw error;
    } finally {
      reader.releaseLock();
      writer.releaseLock();
    }
  }

  /**
   * Create a chunked response body
   * @param chunks Async iterable of chunks
   * @returns ReadableStream
   */
  createChunkedBody(
    chunks: AsyncIterableIterator<StreamChunk>
  ): ReadableStream {
    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of chunks) {
            const encoder = new TextEncoder();
            const data = encoder.encode(JSON.stringify(chunk) + '\n');
            controller.enqueue(data);

            if (chunk.type === 'end' || chunk.type === 'error') {
              controller.close();
              break;
            }
          }
        } catch (error) {
          controller.error(error);
        }
      },
    });
  }
}
