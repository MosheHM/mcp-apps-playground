/**
 * MCP Apps Backend Server
 * 
 * This server demonstrates how an MCP server with AI capabilities
 * can intelligently decide when to return interactive MCP Apps
 * as part of its responses.
 * 
 * NOTE: This uses a lightweight pattern-matching approach that can be
 * easily replaced with actual LLM integration (GPT-4, Claude, or local models).
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * AI Decision Engine
 * 
 * This simulates an LLM's decision-making process to determine:
 * 1. Whether to return an MCP App
 * 2. Which app to return
 * 3. What textual response to provide
 * 
 * In a real implementation, this would be replaced with:
 * - OpenAI GPT-4 API call
 * - Anthropic Claude API call
 * - Local LLM via llama.cpp
 * - Any other AI model
 */
class AIDecisionEngine {
  constructor() {
    // Define patterns that trigger specific apps
    this.appPatterns = [
      {
        keywords: ['counter', 'count', 'increment', 'decrement', 'number', 'track'],
        appType: 'counter',
        responses: [
          "I've created an interactive counter for you. You can increment, decrement, or reset the value.",
          "Here's a counter app. Use the + and - buttons to adjust the count.",
          "Perfect! I'll set up a counter. Try incrementing or decrementing it.",
        ]
      },
      {
        keywords: ['form', 'input', 'submit', 'data', 'fill', 'information', 'details'],
        appType: 'form',
        responses: [
          "I've created a form for you to fill out. Submit it when you're done!",
          "Here's a form to collect your information. All fields are validated.",
          "Let me set up a form for you. Fill in the details and hit submit.",
        ]
      },
      {
        keywords: ['hello', 'hi', 'hey', 'start', 'begin', 'example', 'demo', 'show'],
        appType: 'hello',
        responses: [
          "Let me show you a simple example of how MCP Apps work!",
          "Here's a basic hello world app to demonstrate the concept.",
          "I'll create a simple demo app for you. Check out how it communicates with the host!",
        ]
      },
    ];

    // Conversation context
    this.conversationHistory = [];
  }

  /**
   * Process a user message and decide what to return
   */
  async processMessage(userMessage) {
    const messageLower = userMessage.toLowerCase();
    
    // Store in conversation history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });

    // Check if user is asking for help or general info
    if (this.isGeneralQuery(messageLower)) {
      return {
        text: this.generateGeneralResponse(messageLower),
        app: null
      };
    }

    // Find matching app pattern
    for (const pattern of this.appPatterns) {
      if (this.matchesPattern(messageLower, pattern.keywords)) {
        const response = {
          text: this.selectRandomResponse(pattern.responses),
          app: this.getAppConfig(pattern.appType)
        };
        
        this.conversationHistory.push({
          role: 'assistant',
          content: response.text,
          app: pattern.appType,
          timestamp: new Date()
        });
        
        return response;
      }
    }

    // Default response when no pattern matches
    return {
      text: "I can create interactive apps for you! Try asking for:\n• A counter to track numbers\n• A form to collect information\n• Or just say hello to see a basic example",
      app: null
    };
  }

  /**
   * Check if the message matches a pattern
   */
  matchesPattern(message, keywords) {
    return keywords.some(keyword => message.includes(keyword));
  }

  /**
   * Check if this is a general query (not app-specific)
   */
  isGeneralQuery(message) {
    const generalKeywords = [
      'what can you do',
      'help',
      'how does this work',
      'explain',
      'what is',
      'capabilities',
    ];
    
    return generalKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * Generate a general response for non-app queries
   */
  generateGeneralResponse(message) {
    if (message.includes('what can you do') || message.includes('capabilities')) {
      return "I'm an MCP server that can return interactive UI components! I can create:\n\n" +
             "• **Interactive Counters** - Track and increment numbers\n" +
             "• **Forms** - Collect structured data from users\n" +
             "• **Various Apps** - Any interactive component you need\n\n" +
             "Just ask me to create something, and I'll return an interactive app you can use directly in this chat!";
    }
    
    if (message.includes('how') && message.includes('work')) {
      return "I use the Model Context Protocol (MCP) to return interactive apps as part of my responses. " +
             "When you ask for something that would benefit from interaction, I return an MCP App that:\n\n" +
             "• Runs in a sandboxed iframe for security\n" +
             "• Communicates via JSON-RPC over PostMessage\n" +
             "• Maintains its own state and can interact bidirectionally\n\n" +
             "Try asking me to 'create a counter' or 'show me a form' to see it in action!";
    }

    return "I'm here to help! I can create interactive apps for you. What would you like me to build?";
  }

  /**
   * Select a random response from the available options
   */
  selectRandomResponse(responses) {
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Get app configuration based on type
   */
  getAppConfig(appType) {
    const apps = {
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
    };

    return apps[appType] || null;
  }

  /**
   * Get conversation history
   */
  getHistory() {
    return this.conversationHistory;
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
  }
}

// Create AI engine instance
const aiEngine = new AIDecisionEngine();

/**
 * API Endpoints
 */

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MCP Apps server is running' });
});

// Chat endpoint - process user message and return response with optional app
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`[Chat] Processing message: ${message}`);

    // Process message through AI engine
    const response = await aiEngine.processMessage(message);

    console.log(`[Chat] Response:`, {
      text: response.text,
      hasApp: !!response.app,
      appType: response.app?.title
    });

    res.json({
      message: response.text,
      app: response.app,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Chat] Error:', error);
    res.status(500).json({ 
      error: 'Failed to process message',
      details: error.message 
    });
  }
});

// Get conversation history
app.get('/api/history', (req, res) => {
  res.json({
    history: aiEngine.getHistory()
  });
});

// Clear conversation history
app.post('/api/history/clear', (req, res) => {
  aiEngine.clearHistory();
  res.json({ message: 'History cleared' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 MCP Apps Server Running                             ║
║                                                           ║
║   Port: ${PORT}                                             ║
║   Endpoint: http://localhost:${PORT}/api/chat              ║
║                                                           ║
║   This server simulates an AI-powered MCP server that    ║
║   intelligently returns interactive apps as responses.   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
