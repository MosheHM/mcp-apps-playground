/**
 * MCP Apps Backend Server
 * 
 * This server demonstrates how an MCP server with AI capabilities
 * can intelligently decide when to return interactive MCP Apps
 * as part of its responses.
 */

import express from 'express';
import cors from 'cors';
import ollama from 'ollama';

// ============================================================================
// Constants
// ============================================================================

const PORT = 3001;
const MODEL = 'gemma';

const APP_CONFIGS = Object.freeze({
  counter: {
    url: '/counter.html',
    title: 'Interactive Counter',
    description: 'A stateful counter with bidirectional communication'
  },
  form: {
    url: '/form.html',
    title: 'Form Submission',
    description: 'A form that validates input and submits data'
  },
  hello: {
    url: '/hello.html',
    title: 'Hello World',
    description: 'A minimal MCP App example'
  }
});

const SYSTEM_PROMPT = `You are an intelligent assistant for an MCP (Model Context Protocol) Apps server.
Your goal is to help the user and optionally return an interactive UI component (MCP App) if it would be helpful.

Available MCP Apps:
1. "counter": A simple counter app. Use this when the user wants to count things, track numbers, or asks for a counter.
2. "form": A form app. Use this when the user wants to submit data, fill out a form, or provide structured input.
3. "hello": A hello world demo app. Use this when the user asks for a demo, example, or says hello.

Rules:
- Analyze the user's request.
- If an app is appropriate, strictly return the app type ("counter", "form", or "hello").
- If no app is needed, return null for the app.
- Provide a helpful text response to accompany the app or to answer the user.
- You MUST return a valid JSON object in the following format:
{
  "text": "Your helpful text response here",
  "app": "counter" | "form" | "hello" | null
}
- Do NOT return markdown formatting (like \`\`\`json). Just the raw JSON object.`;

// ============================================================================
// Pure Functions
// ============================================================================

/**
 * Get app configuration by type
 */
const getAppConfig = (appType) => APP_CONFIGS[appType] ?? null;

/**
 * Build messages array for Ollama chat
 */
const buildMessages = (conversationHistory) => [
  { role: 'system', content: SYSTEM_PROMPT },
  ...conversationHistory.map(({ role, content }) => ({ role, content }))
];

/**
 * Parse AI response safely
 */
const parseAIResponse = (content) => {
  try {
    return JSON.parse(content);
  } catch {
    return { text: content, app: null };
  }
};

/**
 * Create a conversation entry
 */
const createMessage = (role, content) => Object.freeze({ role, content });

/**
 * Process message through Ollama and return result
 */
const callOllama = async (messages) => {
  console.log(`[Ollama] Sending request to ${MODEL}...`);

  const response = await ollama.chat({
    model: MODEL,
    messages,
    format: 'json',
    stream: false,
  });

  console.log(`[Ollama] Raw response:`, response.message.content);
  return parseAIResponse(response.message.content);
};

/**
 * Process a user message and return response with updated history
 */
const processMessage = async (userMessage, history) => {
  const updatedHistory = [...history, createMessage('user', userMessage)];

  try {
    const messages = buildMessages(updatedHistory);
    const parsedResponse = await callOllama(messages);
    const appConfig = getAppConfig(parsedResponse.app);

    const finalHistory = [
      ...updatedHistory,
      createMessage('assistant', parsedResponse.text)
    ];

    return {
      response: {
        text: parsedResponse.text,
        app: appConfig
      },
      history: finalHistory
    };
  } catch (error) {
    console.error('[Ollama] Error:', error);

    const errorText = "I'm sorry, I encountered an error communicating with my AI brain. Please ensure Ollama is running and the gemma model is pulled.";

    return {
      response: {
        text: errorText,
        app: null
      },
      history: [...updatedHistory, createMessage('assistant', errorText)]
    };
  }
};

// ============================================================================
// Server Setup
// ============================================================================

const app = express();

// Conversation state (in production, use a proper store)
let conversationHistory = [];

// Middleware
app.use(cors());
app.use(express.json());

// ============================================================================
// API Endpoints
// ============================================================================

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'MCP Apps server is running' });
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  console.log(`[Chat] Processing message: ${message}`);

  const result = await processMessage(message, conversationHistory);
  conversationHistory = result.history;

  console.log(`[Chat] Response:`, {
    text: result.response.text,
    hasApp: !!result.response.app,
    appType: result.response.app?.title
  });

  res.json({
    message: result.response.text,
    app: result.response.app,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/history', (_req, res) => {
  res.json({ history: conversationHistory });
});

app.post('/api/history/clear', (_req, res) => {
  conversationHistory = [];
  res.json({ message: 'History cleared' });
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 MCP Apps Server Running                             ║
║                                                           ║
║   Port: ${PORT}                                             ║
║   Endpoint: http://localhost:${PORT}/api/chat              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
