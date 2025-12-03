# MCP Apps Architecture Deep Dive

This document provides a comprehensive technical overview of the MCP Apps architecture, including implementation details, design patterns, and best practices.

## Table of Contents

1. [Overview](#overview)
2. [Architecture Components](#architecture-components)
3. [Communication Protocol](#communication-protocol)
4. [Security Model](#security-model)
5. [Implementation Details](#implementation-details)
6. [Design Patterns](#design-patterns)
7. [Best Practices](#best-practices)
8. [Common Pitfalls](#common-pitfalls)

## Overview

MCP Apps extend the Model Context Protocol with interactive UI capabilities. Unlike traditional MCP responses (text, tool calls), MCP Apps provide:

- **Interactive UI**: Rich user interfaces beyond text
- **State Management**: Apps maintain their own state
- **Bidirectional Communication**: Real-time messaging between host and app
- **Security Isolation**: Apps run in sandboxed environments

### Use Cases

- **Forms and Data Collection**: Gather structured input from users
- **Visualization**: Display charts, graphs, and interactive visualizations
- **Configuration**: Interactive settings and preferences
- **Workflows**: Multi-step processes with user interaction
- **File Management**: Upload, download, and manage files

## Architecture Components

### 1. AppHost Component

**Purpose**: Manages the lifecycle of MCP Apps in the host application.

**Responsibilities**:
- Render apps in sandboxed iframes
- Create and manage AppBridge instances
- Expose host capabilities to apps
- Handle app lifecycle events

**Key Features**:
```typescript
interface AppHostProps {
  appUrl: string;              // URL of the app to load
  sandbox?: string;            // Iframe sandbox permissions
  title?: string;              // Display title
  width?: string | number;     // Container width
  height?: string | number;    // Container height
  onReady?: (bridge) => void;  // Called when app is ready
  onNotification?: (method, params) => void;  // App notifications
  capabilities?: HostCapabilities;  // Host capabilities
}
```

**Lifecycle**:
1. Mount: Render iframe with app URL
2. Load: Wait for iframe to load
3. Initialize: Create AppBridge
4. Ready: Notify parent that app is ready
5. Active: Handle ongoing communication
6. Unmount: Cleanup and close bridge

### 2. AppBridge

**Purpose**: Provides type-safe, bidirectional communication over PostMessage.

**Architecture**:
```
┌─────────────────────────────────────────┐
│           AppBridge                      │
├─────────────────────────────────────────┤
│  Message Handling                       │
│  - Request/Response tracking            │
│  - Handler registration                 │
│  - Error handling                       │
├─────────────────────────────────────────┤
│  JSON-RPC 2.0 Protocol                  │
│  - Message formatting                   │
│  - ID generation                        │
│  - Error codes                          │
├─────────────────────────────────────────┤
│  PostMessage Transport                  │
│  - Origin validation                    │
│  - Message envelope                     │
│  - Event listeners                      │
└─────────────────────────────────────────┘
```

**Message Types**:

1. **Request**: Expects a response
   ```typescript
   {
     jsonrpc: '2.0',
     id: 1,
     method: 'host.showNotification',
     params: { message: 'Hello' }
   }
   ```

2. **Response**: Reply to a request
   ```typescript
   {
     jsonrpc: '2.0',
     id: 1,
     result: { success: true }
   }
   ```

3. **Notification**: One-way message
   ```typescript
   {
     jsonrpc: '2.0',
     method: 'counter.changed',
     params: { count: 5 }
   }
   ```

4. **Error Response**: Error reply
   ```typescript
   {
     jsonrpc: '2.0',
     id: 1,
     error: {
       code: -32601,
       message: 'Method not found'
     }
   }
   ```

### 3. MCP Apps

**Purpose**: Interactive UI components that run in sandboxed iframes.

**Structure**:
```typescript
// React component for UI
const MyApp: React.FC = () => {
  const [bridge, setBridge] = useState<AppBridge | null>(null);
  
  useEffect(() => {
    const appBridge = new AppBridge(window.parent, '*');
    setBridge(appBridge);
    
    // Register handlers
    appBridge.onRequest('app.method', handler);
    
    return () => appBridge.close();
  }, []);
  
  return <div>App UI</div>;
};

// App class for lifecycle
class MyAppImpl implements App {
  async onMount(bridge: AppBridge) { }
  async onUnmount() { }
}
```

## Communication Protocol

### JSON-RPC 2.0

MCP Apps use JSON-RPC 2.0 for structured communication.

**Why JSON-RPC?**
- Industry standard protocol
- Well-defined error handling
- Request/response correlation via IDs
- Supports both sync and async patterns

**Message Flow**:

```
Host                                    App
 │                                       │
 │  ─────── Request (id: 1) ────────►   │
 │  method: 'app.initialize'            │
 │  params: { config: {...} }           │
 │                                       │
 │  ◄────── Response (id: 1) ──────     │
 │  result: { success: true }           │
 │                                       │
 │  ◄────── Notification ──────────     │
 │  method: 'app.stateChanged'          │
 │  params: { state: {...} }            │
 │                                       │
```

### PostMessage Envelope

All messages are wrapped in a typed envelope:

```typescript
interface PostMessageEnvelope {
  type: 'mcp-app-message';  // Message type identifier
  message: JsonRpcMessage;   // The actual JSON-RPC message
}
```

**Why an envelope?**
- Distinguish MCP messages from other PostMessage traffic
- Add metadata without modifying JSON-RPC format
- Enable future extensions

### Error Handling

**Standard JSON-RPC Error Codes**:
- `-32700`: Parse error
- `-32600`: Invalid request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error

**Custom Error Codes**:
- `-32000` to `-32099`: Server-defined errors
- App-specific error codes should use this range

## Security Model

### Iframe Sandboxing

**Default Sandbox Attributes**:
```html
<iframe sandbox="allow-scripts allow-same-origin">
```

**Available Permissions**:
- `allow-scripts`: Enable JavaScript (required)
- `allow-same-origin`: Treat content as same-origin (for storage access)
- `allow-forms`: Allow form submission
- `allow-popups`: Allow popups
- `allow-modals`: Allow modal dialogs
- `allow-downloads`: Allow downloads

**Security Recommendations**:
1. Use minimal permissions required
2. Never use `allow-top-navigation` (allows breaking out of frame)
3. Consider `allow-same-origin` implications carefully
4. In production, use specific CSP headers

### Origin Validation

**Development**:
```typescript
// Accept all origins (convenient but insecure)
new AppBridge(window.parent, '*');
```

**Production**:
```typescript
// Validate specific origin
new AppBridge(window.parent, 'https://your-host.com');
```

**Best Practice**:
```typescript
// Use environment variable
const targetOrigin = import.meta.env.VITE_HOST_ORIGIN || '*';
new AppBridge(window.parent, targetOrigin);
```

### Input Validation

**Always validate data from apps**:
```typescript
bridge.onRequest('host.executeAction', async (params) => {
  // Validate params structure
  if (!params || typeof params !== 'object') {
    throw new Error('Invalid params');
  }
  
  const { action, data } = params as { action: string; data: unknown };
  
  // Validate action
  if (!ALLOWED_ACTIONS.includes(action)) {
    throw new Error('Invalid action');
  }
  
  // Validate and sanitize data
  const sanitized = sanitizeData(data);
  
  // Process safely
  return executeAction(action, sanitized);
});
```

### Content Security Policy

**Recommended CSP for Host**:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               frame-src 'self' https://trusted-app-domain.com;
               script-src 'self' 'unsafe-inline';
               style-src 'self' 'unsafe-inline';">
```

**Recommended CSP for Apps**:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               connect-src 'self';
               img-src 'self' data: https:;
               style-src 'self' 'unsafe-inline';">
```

## Implementation Details

### AppBridge Internals

**Request/Response Tracking**:
```typescript
private pendingRequests = new Map<
  string | number,
  {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }
>();
```

**ID Generation**:
```typescript
private nextId = 1;

public async request(method: string, params?: unknown): Promise<unknown> {
  const id = this.nextId++;
  // ... send request with id
}
```

**Message Routing**:
```typescript
private handleJsonRpcMessage(message: JsonRpcMessage): void {
  // Response to our request?
  if ('result' in message || 'error' in message) {
    this.handleResponse(message as JsonRpcResponse);
    return;
  }
  
  // Request or notification from other side
  const rpcMessage = message as JsonRpcRequest | JsonRpcNotification;
  if ('id' in rpcMessage) {
    this.handleRequest(rpcMessage);
  } else {
    this.handleNotification(rpcMessage);
  }
}
```

### Lifecycle Management

**Host Side**:
```typescript
useEffect(() => {
  const iframe = iframeRef.current;
  if (!iframe) return;
  
  const handleLoad = () => {
    const bridge = new AppBridge(iframe.contentWindow, '*');
    bridgeRef.current = bridge;
    
    // Setup handlers
    setupHostHandlers(bridge);
    
    // Notify ready
    onReady?.(bridge);
  };
  
  iframe.addEventListener('load', handleLoad);
  
  return () => {
    iframe.removeEventListener('load', handleLoad);
    bridgeRef.current?.close();
  };
}, [appUrl]);
```

**App Side**:
```typescript
useEffect(() => {
  const bridge = new AppBridge(window.parent, '*');
  setBridge(bridge);
  
  // Setup handlers
  setupAppHandlers(bridge);
  
  // Cleanup
  return () => {
    bridge.close();
  };
}, []);
```

## Design Patterns

### 1. Request-Response Pattern

Use for operations that need confirmation:
```typescript
// Host
const result = await bridge.request('app.saveData', { data });
if (result.success) {
  console.log('Data saved');
}

// App
bridge.onRequest('app.saveData', async (params) => {
  await saveToStorage(params.data);
  return { success: true };
});
```

### 2. Notification Pattern

Use for events that don't need responses:
```typescript
// App (notify about state changes)
useEffect(() => {
  bridge?.notify('app.stateChanged', { count });
}, [count]);

// Host (listen for notifications)
bridge.onNotification('app.stateChanged', (params) => {
  console.log('App state:', params);
});
```

### 3. Capability Discovery

Let apps discover what the host supports:
```typescript
// App queries capabilities
const capabilities = await bridge.request('host.getCapabilities');

if (capabilities.notifications) {
  // Can use showNotification
}

if (capabilities.fileUpload) {
  // Can upload files
}
```

### 4. Error Propagation

Propagate errors properly:
```typescript
// App
try {
  const result = await bridge.request('host.executeAction', { action });
  handleSuccess(result);
} catch (error) {
  handleError(error);
}

// Host
bridge.onRequest('host.executeAction', async (params) => {
  if (!isValidAction(params.action)) {
    throw new Error('Invalid action: ' + params.action);
  }
  
  try {
    return await executeAction(params);
  } catch (error) {
    throw new Error('Execution failed: ' + error.message);
  }
});
```

## Best Practices

### 1. Error Handling

```typescript
// Always handle promise rejections
try {
  await bridge.request('host.method', params);
} catch (error) {
  console.error('Failed to call host:', error);
  // Show user-friendly error
}
```

### 2. Cleanup

```typescript
// Always cleanup in useEffect
useEffect(() => {
  const bridge = new AppBridge(window.parent, '*');
  
  return () => {
    bridge.close();  // Important!
  };
}, []);
```

### 3. Type Safety

```typescript
// Define types for your methods
interface ShowNotificationParams {
  message: string;
  type: 'info' | 'warning' | 'error';
}

// Use typed handlers
bridge.onRequest('host.showNotification', async (params) => {
  const { message, type } = params as ShowNotificationParams;
  // TypeScript knows the structure
});
```

### 4. Logging

```typescript
// Use host.log for debugging
if (process.env.NODE_ENV === 'development') {
  bridge.request('host.log', {
    level: 'debug',
    message: 'Operation completed',
    data: result
  });
}
```

### 5. Progressive Enhancement

```typescript
// Check if host supports a feature
try {
  await bridge.request('host.advancedFeature', {});
} catch (error) {
  // Fallback to basic approach
  await bridge.request('host.basicFeature', {});
}
```

## Common Pitfalls

### 1. Forgetting to Close Bridge

**Problem**:
```typescript
useEffect(() => {
  const bridge = new AppBridge(window.parent, '*');
  setBridge(bridge);
  // Missing cleanup!
}, []);
```

**Solution**:
```typescript
useEffect(() => {
  const bridge = new AppBridge(window.parent, '*');
  setBridge(bridge);
  
  return () => {
    bridge.close();  // Always cleanup
  };
}, []);
```

### 2. Not Handling Promise Rejections

**Problem**:
```typescript
bridge.request('host.method', {});  // Unhandled rejection!
```

**Solution**:
```typescript
bridge.request('host.method', {})
  .then(result => console.log(result))
  .catch(error => console.error(error));
```

### 3. Using Wrong Origin

**Problem**:
```typescript
// In production with '*' origin
new AppBridge(window.parent, '*');  // Insecure!
```

**Solution**:
```typescript
const origin = process.env.NODE_ENV === 'production' 
  ? 'https://your-host.com' 
  : '*';
new AppBridge(window.parent, origin);
```

### 4. Not Validating Input

**Problem**:
```typescript
bridge.onRequest('host.executeAction', async (params: any) => {
  // Directly using params without validation
  return executeAction(params.action);
});
```

**Solution**:
```typescript
bridge.onRequest('host.executeAction', async (params) => {
  if (!params || typeof params !== 'object') {
    throw new Error('Invalid params');
  }
  
  const { action } = params as { action: string };
  if (!isValidAction(action)) {
    throw new Error('Invalid action');
  }
  
  return executeAction(action);
});
```

### 5. Race Conditions

**Problem**:
```typescript
// Sending request before bridge is ready
const MyApp = () => {
  const [bridge, setBridge] = useState<AppBridge | null>(null);
  
  useEffect(() => {
    const br = new AppBridge(window.parent, '*');
    setBridge(br);
    
    // This might run before state updates!
    bridge?.request('host.method', {});
  }, []);
};
```

**Solution**:
```typescript
useEffect(() => {
  const br = new AppBridge(window.parent, '*');
  setBridge(br);
  
  // Use the local variable, not state
  br.request('host.method', {});
}, []);
```

## Performance Considerations

### 1. Message Batching

Avoid sending too many small messages:
```typescript
// Bad: Many small messages
for (const item of items) {
  await bridge.request('host.addItem', { item });
}

// Good: Batch messages
await bridge.request('host.addItems', { items });
```

### 2. Debouncing

Debounce frequent events:
```typescript
const debouncedNotify = debounce((value) => {
  bridge.notify('input.changed', { value });
}, 300);

<input onChange={(e) => debouncedNotify(e.target.value)} />
```

### 3. Memory Management

Clean up resources:
```typescript
class MyApp implements App {
  private subscriptions: Subscription[] = [];
  
  async onMount(bridge: AppBridge) {
    this.subscriptions.push(
      someObservable.subscribe(...)
    );
  }
  
  async onUnmount() {
    // Clean up all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }
}
```

## Future Enhancements

Potential improvements to consider:

1. **Streaming Support**: Large data transfer via streams
2. **File Transfer**: Direct file upload/download via AppBridge
3. **State Synchronization**: Automatic state sync between host and app
4. **Hot Reload**: App updates without page refresh
5. **Multi-App Communication**: Apps communicating with each other
6. **Persistent Storage**: Shared storage between host and apps

---

For more examples and practical usage, see the [main README](../README.md) and explore the example apps in the playground.
