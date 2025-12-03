# MCP Apps Playground

A minimal, educational playground to understand the **Model Context Protocol (MCP) Apps** architecture. This project demonstrates how MCP servers can return interactive UI components that communicate with their host through a secure, sandboxed environment.

## What are MCP Apps?

**MCP Apps** are interactive UI components that can be returned by MCP servers and rendered in a sandboxed iframe. They enable:

- **Interactive workflows**: Users can interact with UI elements directly
- **Secure execution**: Apps run in isolated iframes with limited permissions
- **Bidirectional communication**: Apps and hosts exchange messages via JSON-RPC 2.0
- **Framework agnostic**: Apps can be built with any web technology (React, Vue, vanilla JS, etc.)

Think of MCP Apps as "mini applications" that MCP servers can provide to create richer, more interactive experiences beyond simple text responses.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                       Host Application                   │
│  ┌────────────────────────────────────────────────────┐ │
│  │              AppHost Component                      │ │
│  │  - Manages iframe lifecycle                        │ │
│  │  - Creates AppBridge for communication             │ │
│  │  - Exposes host methods (notifications, actions)   │ │
│  └──────────────────┬─────────────────────────────────┘ │
│                     │ AppBridge                           │
│                     │ (JSON-RPC over PostMessage)         │
└─────────────────────┼─────────────────────────────────────┘
                      │
                      │ Secure PostMessage
                      │ Cross-origin communication
                      │
┌─────────────────────┼─────────────────────────────────────┐
│                     │         Sandboxed Iframe            │
│  ┌──────────────────▼───────────────────────────────┐   │
│  │              MCP App                              │   │
│  │  - Renders interactive UI                        │   │
│  │  - Creates AppBridge to communicate with host    │   │
│  │  - Calls host methods (showNotification, etc.)   │   │
│  │  - Responds to host requests (sendData, etc.)    │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  Limited permissions: allow-scripts allow-same-origin    │
└───────────────────────────────────────────────────────────┘
```

### Key Components

1. **AppHost**: React component that hosts MCP Apps
   - Renders apps in sandboxed iframes
   - Manages AppBridge lifecycle
   - Exposes host capabilities to apps

2. **AppBridge**: Communication layer
   - Implements JSON-RPC 2.0 over PostMessage
   - Bidirectional request/response and notifications
   - Type-safe message handling

3. **MCP Apps**: Interactive applications
   - Run in isolated iframes
   - Communicate only through AppBridge
   - Can be built with any web framework

## Key Concepts

### 1. AppBridge Communication

The **AppBridge** wraps PostMessage in a JSON-RPC 2.0 protocol, providing:

- **Requests**: Send a message and wait for a response
  ```typescript
  const result = await bridge.request('host.showNotification', {
    message: 'Hello!',
    type: 'info'
  });
  ```

- **Notifications**: Send a one-way message (no response expected)
  ```typescript
  bridge.notify('counter.changed', { count: 5 });
  ```

- **Handlers**: Register handlers for incoming messages
  ```typescript
  bridge.onRequest('app.sendData', async (params) => {
    // Handle data from host
    return { success: true };
  });
  ```

### 2. Iframe Sandboxing

Apps run in sandboxed iframes with restricted permissions:

```html
<iframe
  sandbox="allow-scripts allow-same-origin"
  src="app-url"
/>
```

This provides security by:
- Isolating app execution from the host page
- Preventing direct DOM access to the host
- Limiting what the app can do (no popups, forms, etc. unless allowed)

### 3. PostMessage Transport

Communication uses browser's **PostMessage API**:

- **Secure**: Origin validation prevents unauthorized access
- **Cross-origin**: Works across different domains
- **Async**: Non-blocking message passing
- **Standard**: Built into all modern browsers

### 4. App Lifecycle

Apps can implement lifecycle methods:

```typescript
class MyApp implements App {
  async onMount(bridge: AppBridge) {
    // Called when app is initialized
    this.bridge = bridge;
  }

  async onUnmount() {
    // Called when app is being destroyed
    this.bridge.close();
  }
}
```

## Getting Started

### Installation

```bash
# Install dependencies
npm install
```

### Running the Project

#### Option 1: Frontend Only (Demo Mode)
```bash
npm run dev
```
Visit `http://localhost:3000` for the playground or `/chat.html` for chat interface with simulated responses.

#### Option 2: With AI-Powered Backend (Recommended)
```bash
# Terminal 1: Start the backend server
npm run dev:server

# Terminal 2: Start the frontend
npm run dev

# Or run both together:
npm run dev:all
```

The backend server runs on `http://localhost:3001` and provides AI-powered responses that intelligently decide when to return MCP Apps.

### Two Ways to Experience MCP Apps

1. **Playground Mode** (`/`) - Select and test individual apps with direct controls
2. **Chat Interface** (`/chat.html`) - AI-powered chat that intelligently returns interactive apps based on your requests

### Project Structure

```
mcp-apps-playground/
├── src/
│   ├── app/
│   │   └── HelloWorldApp.tsx      # Minimal example
│   ├── host/
│   │   └── AppHost.tsx            # Host component
│   ├── bridge/
│   │   └── AppBridge.ts           # Communication layer
│   ├── chat/
│   │   ├── ChatInterface.tsx      # Chat UI with embedded apps
│   │   └── chat-main.tsx          # Chat entry point
│   ├── types/
│   │   └── index.ts               # TypeScript types
│   └── main.tsx                   # Demo application
├── examples/
│   ├── counter/
│   │   └── CounterApp.tsx         # Interactive counter
│   └── form/
│       └── FormApp.tsx            # Form submission
├── server/
│   ├── index.js                   # AI-powered backend server
│   └── README.md                  # Server documentation
├── docs/
│   └── ARCHITECTURE.md            # Detailed architecture
├── index.html                     # Playground entry point
├── chat.html                      # Chat interface entry
├── hello.html                     # Hello app entry
├── counter.html                   # Counter app entry
├── form.html                      # Form app entry
└── package.json
```

## Examples

### AI-Powered Chat Interface

**NEW!** Experience MCP Apps with an AI-powered backend at `/chat.html`

The chat interface demonstrates how an MCP server with AI capabilities can intelligently decide when to return interactive MCP Apps:

#### Features
- **AI Decision Engine**: Backend server analyzes your message and decides if an app would be helpful
- **Natural language interaction**: Simply describe what you need in plain English
- **Smart app selection**: The AI returns the most appropriate app (counter, form, or demo)
- **Conversation context**: The server maintains conversation history for better responses
- **Multiple apps in one chat**: Create and interact with several apps simultaneously

#### How It Works

```
User: "I need to track some numbers"
  ↓
AI Server analyzes intent
  ↓
Returns: Counter App + explanatory text
  ↓
App rendered in chat message
```

**Try it**: 
- Start the backend server: `npm run dev:server`
- Visit `/chat.html`
- Type natural language requests like:
  - "Create a counter for me"
  - "I need a form to collect user data"
  - "Show me how MCP Apps work"
- The AI will intelligently return the appropriate interactive component

**Technical Note**: The current implementation uses smart pattern matching that can be easily upgraded to use GPT-4, Claude, or local LLMs. See `server/README.md` for integration details.

### 1. Hello World App

The simplest possible MCP App:
- Shows basic AppBridge setup
- Demonstrates host method calls
- Displays status updates

**Try it**: Click "Send Message to Host" to see host communication

### 2. Counter App

Interactive state management:
- Local state management within the app
- Bidirectional communication (app ↔ host)
- Activity history tracking
- Host can control the counter via AppBridge

**Try it**: 
- Increment/decrement locally
- Watch the activity log
- Check browser console for communication logs

### 3. Form App

Form handling and data submission:
- Input validation
- Form state management
- Structured data submission to host
- Error handling and feedback

**Try it**: 
- Fill out the form
- Submit to see host interaction
- Check browser console for submitted data

## Standard Methods

### Host Methods (callable by apps)

```typescript
// Show a notification
bridge.request('host.showNotification', {
  message: 'Hello!',
  type: 'info'
});

// Execute an action
bridge.request('host.executeAction', {
  action: 'save',
  data: { ... }
});

// Get host capabilities
const caps = await bridge.request('host.getCapabilities');

// Log a message (debugging)
bridge.request('host.log', {
  level: 'info',
  message: 'Debug info'
});
```

### App Methods (callable by host)

```typescript
// Initialize the app
bridge.request('app.initialize', {
  initialCount: 5
});

// Send data to the app
bridge.request('app.sendData', {
  formData: { name: 'John' }
});

// Request app to perform an action
bridge.request('app.performAction', {
  action: 'reset'
});
```

## Building Your Own App

### Step 1: Create the App Component

```tsx
import React, { useEffect, useState } from 'react';
import { AppBridge } from '../bridge/AppBridge';

const MyApp: React.FC = () => {
  const [bridge, setBridge] = useState<AppBridge | null>(null);

  useEffect(() => {
    // Connect to host
    const appBridge = new AppBridge(window.parent, '*');
    setBridge(appBridge);

    // Register handlers for host requests
    appBridge.onRequest('app.doSomething', async (params) => {
      return { success: true };
    });

    return () => {
      appBridge.close();
    };
  }, []);

  return <div>My App Content</div>;
};
```

### Step 2: Create an HTML Entry Point

```html
<!DOCTYPE html>
<html>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/app/MyApp.tsx"></script>
  </body>
</html>
```

### Step 3: Use AppHost to Render It

```tsx
<AppHost
  appUrl="/my-app.html"
  title="My App"
  height="400px"
  onReady={(bridge) => {
    console.log('App ready!');
  }}
/>
```

## Development Tips

1. **Open Browser Console**: Communication logs are very helpful for debugging
2. **Check Network Tab**: See if iframe loads correctly
3. **Origin Validation**: In production, use specific origins instead of `'*'`
4. **Error Handling**: Always handle promise rejections from bridge requests
5. **TypeScript**: Use the provided types for better developer experience

## Security Considerations

1. **Sandbox Attributes**: Carefully choose iframe sandbox permissions
2. **Origin Validation**: Validate message origins in production
3. **Input Validation**: Sanitize all data from the app before using it
4. **CSP Headers**: Consider Content Security Policy for additional protection
5. **HTTPS**: Always use HTTPS in production

## References

- **MCP-UI PR #147**: [React renderer for MCP Apps by ochafik](https://github.com/MCP-UI-Org/mcp-ui/pull/147)
  - Implementation reference for MCP Apps in React
  
- **modelcontextprotocol/ext-apps**: [Official MCP Apps SDK](https://github.com/modelcontextprotocol/ext-apps)
  - TypeScript SDK for building MCP Apps
  - SEP-1865 specification
  
- **JSON-RPC 2.0**: [Specification](https://www.jsonrpc.org/specification)
  - Communication protocol used by AppBridge

## Contributing

This is an educational playground. Feel free to:
- Add more example apps
- Improve documentation
- Fix bugs or issues
- Share feedback

## License

MIT License - feel free to use this for learning and building your own MCP Apps!

---

**Happy Building!** 🚀

If you have questions or want to learn more about MCP Apps, check out the [detailed architecture documentation](docs/ARCHITECTURE.md).
