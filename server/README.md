# MCP Apps Backend Server

This is an AI-powered backend server that demonstrates how an MCP server can intelligently decide when to return interactive MCP Apps as part of its responses.

## How It Works

The server uses an **AI Decision Engine** that:

1. **Analyzes user messages** to understand intent
2. **Decides if an interactive app would be beneficial**
3. **Returns the appropriate MCP App** along with a text response
4. **Maintains conversation context** for better responses

## Architecture

```
User Message
    ↓
AI Decision Engine
    ↓
Response Decision:
    - Text only
    - Text + MCP App
    ↓
Send to Chat Interface
    ↓
App rendered in iframe
```

## Current Implementation

The current implementation uses **intelligent pattern matching** that simulates AI decision-making. This approach:

- ✅ Works immediately without external dependencies
- ✅ Demonstrates the MCP Apps concept clearly
- ✅ Can be easily replaced with real LLM integration

### Supported Patterns

- **Counter requests**: "create a counter", "track numbers", "increment"
- **Form requests**: "show me a form", "collect data", "input fields"
- **Demo requests**: "hello", "show example", "demo"

## Upgrading to Real LLM

The `AIDecisionEngine` class can be easily replaced with actual AI models:

### Option 1: OpenAI GPT-4

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async processMessage(userMessage) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are an MCP server that returns interactive apps. Decide if user needs: counter, form, or hello app."
      },
      {
        role: "user",
        content: userMessage
      }
    ]
  });
  
  // Parse response and return app config
}
```

### Option 2: Anthropic Claude

```javascript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async processMessage(userMessage) {
  const message = await anthropic.messages.create({
    model: "claude-3-sonnet-20240229",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: userMessage
    }]
  });
  
  // Parse response and return app config
}
```

### Option 3: Local LLM with llama.cpp

```javascript
import { LlamaModel, LlamaContext, LlamaChatSession } from 'node-llama-cpp';

const model = new LlamaModel({ modelPath: './models/llama-model.gguf' });
const context = new LlamaContext({ model });
const session = new LlamaChatSession({ context });

async processMessage(userMessage) {
  const response = await session.prompt(userMessage);
  // Parse response and return app config
}
```

## API Endpoints

### POST `/api/chat`

Process a user message and return a response with optional app.

**Request:**
```json
{
  "message": "Create a counter for me"
}
```

**Response:**
```json
{
  "message": "I've created an interactive counter for you.",
  "app": {
    "url": "/counter.html",
    "title": "Interactive Counter",
    "description": "A stateful counter with bidirectional communication"
  },
  "timestamp": "2024-12-02T22:50:00.000Z"
}
```

### GET `/api/history`

Get conversation history.

**Response:**
```json
{
  "history": [
    {
      "role": "user",
      "content": "Create a counter",
      "timestamp": "2024-12-02T22:50:00.000Z"
    },
    {
      "role": "assistant",
      "content": "I've created an interactive counter for you.",
      "app": "counter",
      "timestamp": "2024-12-02T22:50:01.000Z"
    }
  ]
}
```

### POST `/api/history/clear`

Clear conversation history.

## Running the Server

### Development Mode

```bash
# Run server only
npm run dev:server

# Run server + frontend together
npm run dev:all
```

### Production Mode

```bash
# Build and run
npm run build
node server/index.js
```

## Environment Variables

For production deployment with real LLMs:

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Server Config
PORT=3001
NODE_ENV=production
```

## Adding New App Types

To add new MCP Apps that the AI can return:

1. Create the app component (e.g., `src/app/NewApp.tsx`)
2. Create HTML entry point (e.g., `new-app.html`)
3. Add pattern to `AIDecisionEngine`:

```javascript
{
  keywords: ['new', 'feature', 'example'],
  appType: 'newapp',
  responses: [
    "Here's the new app you requested!"
  ]
}
```

4. Add app config:

```javascript
newapp: {
  url: '/new-app.html',
  title: 'New App',
  description: 'Description of the new app'
}
```

## Prompt Engineering Tips

When integrating with real LLMs, use structured prompts:

```
You are an MCP server assistant that can return interactive UI components.

User request: {user_message}

Analyze the request and respond with JSON:
{
  "text": "Your response to the user",
  "app_type": "counter|form|hello|null"
}

Return an app only when interaction would enhance the user experience.
```

## Security Considerations

1. **Rate limiting**: Add rate limiting to prevent abuse
2. **Input validation**: Sanitize all user inputs
3. **CORS**: Configure CORS properly for production
4. **API keys**: Never expose API keys in client code
5. **Content filtering**: Filter inappropriate requests

## Performance

- Current response time: ~50-100ms (pattern matching)
- With OpenAI GPT-4: ~1-3 seconds
- With local LLM: ~500ms-2s (depends on model size)

## Monitoring

Add logging and monitoring for production:

```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log all requests
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    path: req.path,
    timestamp: new Date()
  });
  next();
});
```

## Next Steps

1. **Deploy the server** to a cloud platform
2. **Integrate a real LLM** for better decision-making
3. **Add more app types** (charts, calendars, etc.)
4. **Implement user authentication**
5. **Add conversation memory** for context-aware responses
