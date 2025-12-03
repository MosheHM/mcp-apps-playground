/**
 * TypeScript type definitions for MCP Apps
 * 
 * MCP Apps are interactive UI components that can be returned by MCP servers
 * and rendered in a sandboxed iframe with bidirectional communication via AppBridge.
 */

/**
 * JSON-RPC 2.0 message types for communication between host and app
 */
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export type JsonRpcMessage = JsonRpcRequest | JsonRpcResponse | JsonRpcNotification;

/**
 * AppBridge - Core communication interface between host and app
 * 
 * This bridge enables bidirectional JSON-RPC messaging over PostMessage,
 * allowing the app to call host methods and vice versa.
 */
export interface AppBridge {
  /**
   * Send a request to the other side and wait for response
   */
  request(method: string, params?: unknown): Promise<unknown>;

  /**
   * Send a one-way notification (no response expected)
   */
  notify(method: string, params?: unknown): void;

  /**
   * Register a handler for incoming requests
   */
  onRequest(method: string, handler: (params: unknown) => unknown | Promise<unknown>): void;

  /**
   * Register a handler for incoming notifications
   */
  onNotification(method: string, handler: (params: unknown) => void): void;

  /**
   * Close the bridge and cleanup resources
   */
  close(): void;
}

/**
 * App lifecycle interface that MCP Apps should implement
 * 
 * This follows the pattern from the modelcontextprotocol/ext-apps SDK.
 */
export interface App {
  /**
   * Called when the app is initialized with its bridge
   */
  onMount(bridge: AppBridge): void | Promise<void>;

  /**
   * Called when the app is being destroyed
   */
  onUnmount?(): void | Promise<void>;
}

/**
 * Configuration for hosting an MCP App
 */
export interface AppHostConfig {
  /**
   * URL of the app to load in the iframe
   */
  appUrl: string;

  /**
   * Optional sandbox permissions for the iframe
   * Default: 'allow-scripts allow-same-origin'
   */
  sandbox?: string;

  /**
   * Optional title for the iframe
   */
  title?: string;

  /**
   * Optional width
   */
  width?: string | number;

  /**
   * Optional height
   */
  height?: string | number;
}

/**
 * Message envelope for PostMessage transport
 */
export interface PostMessageEnvelope {
  type: 'mcp-app-message';
  message: JsonRpcMessage;
}

/**
 * App metadata that can be provided by the MCP server
 */
export interface AppMetadata {
  /**
   * Unique identifier for the app
   */
  id: string;

  /**
   * Human-readable name
   */
  name: string;

  /**
   * Description of what the app does
   */
  description?: string;

  /**
   * Version of the app
   */
  version?: string;

  /**
   * URL to load the app from
   */
  url: string;
}

/**
 * Host capabilities that can be exposed to apps
 */
export interface HostCapabilities {
  /**
   * Host can display notifications
   */
  notifications?: boolean;

  /**
   * Host can execute actions
   */
  actions?: boolean;

  /**
   * Host supports file uploads
   */
  fileUpload?: boolean;
}

/**
 * Standard methods that apps can call on the host
 */
export const HostMethods = {
  /**
   * Show a notification to the user
   */
  SHOW_NOTIFICATION: 'host.showNotification',

  /**
   * Execute an action on the host
   */
  EXECUTE_ACTION: 'host.executeAction',

  /**
   * Get host capabilities
   */
  GET_CAPABILITIES: 'host.getCapabilities',

  /**
   * Log a message (useful for debugging)
   */
  LOG: 'host.log',
} as const;

/**
 * Standard methods that the host can call on apps
 */
export const AppMethods = {
  /**
   * Initialize the app
   */
  INITIALIZE: 'app.initialize',

  /**
   * Send data to the app
   */
  SEND_DATA: 'app.sendData',

  /**
   * Request app to perform an action
   */
  PERFORM_ACTION: 'app.performAction',
} as const;
