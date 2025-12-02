/**
 * AppBridge Implementation
 * 
 * This module implements bidirectional JSON-RPC 2.0 communication over PostMessage.
 * It provides a type-safe way for the host and app to communicate across iframe boundaries.
 * 
 * Communication pattern:
 * 1. Host creates AppBridge with iframe's contentWindow
 * 2. App creates AppBridge with window.parent
 * 3. Both sides can send requests/notifications and register handlers
 * 4. PostMessage is used as the transport layer
 */

import {
  AppBridge as IAppBridge,
  JsonRpcMessage,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcNotification,
  PostMessageEnvelope,
} from '../types';

type RequestHandler = (params: unknown) => unknown | Promise<unknown>;
type NotificationHandler = (params: unknown) => void;

/**
 * Implementation of AppBridge for JSON-RPC communication over PostMessage
 */
export class AppBridge implements IAppBridge {
  private target: Window;
  private targetOrigin: string;
  private requestHandlers = new Map<string, RequestHandler>();
  private notificationHandlers = new Map<string, NotificationHandler>();
  private pendingRequests = new Map<string | number, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }>();
  private messageListener: (event: MessageEvent) => void;
  private nextId = 1;
  private closed = false;

  /**
   * Create a new AppBridge
   * 
   * @param target - The window to communicate with (iframe.contentWindow or window.parent)
   * @param targetOrigin - The expected origin of the target window (use '*' for any, but be careful)
   */
  constructor(target: Window, targetOrigin: string = '*') {
    this.target = target;
    this.targetOrigin = targetOrigin;

    // Bind the message listener to handle incoming messages
    this.messageListener = this.handleMessage.bind(this);
    window.addEventListener('message', this.messageListener);
  }

  /**
   * Handle incoming PostMessage events
   */
  private handleMessage(event: MessageEvent): void {
    // Validate origin if specified
    if (this.targetOrigin !== '*' && event.origin !== this.targetOrigin) {
      console.warn('Received message from unexpected origin:', event.origin);
      return;
    }

    // Check if this is an MCP App message
    const envelope = event.data as PostMessageEnvelope;
    if (!envelope || envelope.type !== 'mcp-app-message') {
      return;
    }

    const message = envelope.message;
    if (!message || message.jsonrpc !== '2.0') {
      console.warn('Invalid JSON-RPC message:', message);
      return;
    }

    this.handleJsonRpcMessage(message);
  }

  /**
   * Handle incoming JSON-RPC messages
   */
  private handleJsonRpcMessage(message: JsonRpcMessage): void {
    // Check if it's a response to a pending request
    if ('result' in message || 'error' in message) {
      this.handleResponse(message as JsonRpcResponse);
      return;
    }

    // Check if it's a request or notification
    const rpcMessage = message as JsonRpcRequest | JsonRpcNotification;
    const isRequest = 'id' in rpcMessage;

    if (isRequest) {
      this.handleRequest(rpcMessage as JsonRpcRequest);
    } else {
      this.handleNotification(rpcMessage as JsonRpcNotification);
    }
  }

  /**
   * Handle incoming responses
   */
  private handleResponse(response: JsonRpcResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) {
      console.warn('Received response for unknown request:', response.id);
      return;
    }

    this.pendingRequests.delete(response.id);

    if (response.error) {
      pending.reject(new Error(response.error.message));
    } else {
      pending.resolve(response.result);
    }
  }

  /**
   * Handle incoming requests
   */
  private async handleRequest(request: JsonRpcRequest): Promise<void> {
    const handler = this.requestHandlers.get(request.method);

    if (!handler) {
      // Send error response for unhandled method
      this.sendMessage({
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32601,
          message: `Method not found: ${request.method}`,
        },
      });
      return;
    }

    try {
      const result = await handler(request.params);
      this.sendMessage({
        jsonrpc: '2.0',
        id: request.id,
        result,
      });
    } catch (error) {
      this.sendMessage({
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      });
    }
  }

  /**
   * Handle incoming notifications
   */
  private handleNotification(notification: JsonRpcNotification): void {
    const handler = this.notificationHandlers.get(notification.method);
    if (handler) {
      handler(notification.params);
    }
  }

  /**
   * Send a JSON-RPC message via PostMessage
   */
  private sendMessage(message: JsonRpcMessage): void {
    if (this.closed) {
      throw new Error('AppBridge is closed');
    }

    const envelope: PostMessageEnvelope = {
      type: 'mcp-app-message',
      message,
    };

    this.target.postMessage(envelope, this.targetOrigin);
  }

  /**
   * Send a request and wait for response
   */
  public async request(method: string, params?: unknown): Promise<unknown> {
    const id = this.nextId++;

    const promise = new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });

    this.sendMessage({
      jsonrpc: '2.0',
      id,
      method,
      params,
    });

    return promise;
  }

  /**
   * Send a notification (no response expected)
   */
  public notify(method: string, params?: unknown): void {
    this.sendMessage({
      jsonrpc: '2.0',
      method,
      params,
    });
  }

  /**
   * Register a handler for incoming requests
   * 
   * Note: Only one handler per method is supported in this simple implementation.
   * Registering a new handler for the same method will replace the previous one.
   */
  public onRequest(method: string, handler: RequestHandler): void {
    this.requestHandlers.set(method, handler);
  }

  /**
   * Register a handler for incoming notifications
   * 
   * Note: Only one handler per method is supported in this simple implementation.
   * Registering a new handler for the same method will replace the previous one.
   */
  public onNotification(method: string, handler: NotificationHandler): void {
    this.notificationHandlers.set(method, handler);
  }

  /**
   * Close the bridge and cleanup resources
   */
  public close(): void {
    if (this.closed) return;

    this.closed = true;
    window.removeEventListener('message', this.messageListener);

    // Reject all pending requests
    for (const pending of this.pendingRequests.values()) {
      pending.reject(new Error('AppBridge closed'));
    }
    this.pendingRequests.clear();

    this.requestHandlers.clear();
    this.notificationHandlers.clear();
  }
}
