/**
 * ChatInterface Component
 * 
 * A chat interface that demonstrates how MCP Apps can be embedded
 * in a conversational context. This shows how MCP servers can return
 * interactive apps as part of chat responses.
 */

import React, { useState, useRef, useEffect } from 'react';
import { AppHost } from '../host/AppHost';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  app?: {
    url: string;
    title: string;
    description?: string;
  };
}

/**
 * ChatInterface component that embeds MCP Apps in conversations
 */
export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I can help you with interactive tasks. Try asking me to create a counter, a form, or just say hello!',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    // Simulate processing and determine response
    setTimeout(() => {
      const response = generateResponse(input.toLowerCase());
      setMessages(prev => [...prev, response]);
      setIsProcessing(false);
      inputRef.current?.focus();
    }, 500);
  };

  const generateResponse = (userInput: string): Message => {
    const baseResponse: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    // Match user intent and return appropriate response with app
    if (userInput.includes('counter') || userInput.includes('count')) {
      return {
        ...baseResponse,
        content: 'Here\'s an interactive counter for you! You can increment, decrement, or reset the value.',
        app: {
          url: '/counter.html',
          title: 'Interactive Counter',
          description: 'A stateful counter with bidirectional communication',
        },
      };
    }

    if (userInput.includes('form') || userInput.includes('submit') || userInput.includes('data')) {
      return {
        ...baseResponse,
        content: 'I\'ve created a form for you to fill out. Submit it when you\'re done!',
        app: {
          url: '/form.html',
          title: 'Form Submission',
          description: 'A form that validates input and submits data',
        },
      };
    }

    if (userInput.includes('hello') || userInput.includes('hi') || userInput.includes('start')) {
      return {
        ...baseResponse,
        content: 'Let me show you a simple example of how MCP Apps work!',
        app: {
          url: '/hello.html',
          title: 'Hello World',
          description: 'A minimal MCP App example',
        },
      };
    }

    // Default response
    return {
      ...baseResponse,
      content: 'I can create interactive apps for you! Try asking for:\n• A counter\n• A form\n• Or just say hello',
    };
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: '#f9fafb',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 24px',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h1 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#1f2937',
              margin: 0,
            }}>
              💬 MCP Apps Chat Interface
            </h1>
            <p style={{
              fontSize: '13px',
              color: '#6b7280',
              margin: '4px 0 0 0',
            }}>
              Interactive chat with embedded MCP Apps
            </p>
          </div>
          <a
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#374151',
              backgroundColor: '#f9fafb',
              textDecoration: 'none',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
            }}
          >
            ← Back to Playground
          </a>
        </div>
      </header>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {messages.map(message => (
          <div
            key={message.id}
            style={{
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={{
              maxWidth: message.app ? '900px' : '600px',
              width: message.app ? '100%' : 'auto',
            }}>
              {/* Message bubble */}
              <div style={{
                display: 'inline-block',
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: message.role === 'user' ? '#3b82f6' : 'white',
                color: message.role === 'user' ? 'white' : '#1f2937',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                border: message.role === 'assistant' ? '1px solid #e5e7eb' : 'none',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {message.content}
              </div>

              {/* Timestamp */}
              <div style={{
                fontSize: '11px',
                color: '#9ca3af',
                marginTop: '4px',
                textAlign: message.role === 'user' ? 'right' : 'left',
              }}>
                {formatTime(message.timestamp)}
              </div>

              {/* Embedded App */}
              {message.app && (
                <div style={{
                  marginTop: '12px',
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  overflow: 'hidden',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}>
                  {message.app.description && (
                    <div style={{
                      padding: '12px 16px',
                      backgroundColor: '#f9fafb',
                      borderBottom: '1px solid #e5e7eb',
                      fontSize: '13px',
                      color: '#6b7280',
                    }}>
                      📱 {message.app.description}
                    </div>
                  )}
                  <AppHost
                    appUrl={message.app.url}
                    title={message.app.title}
                    height="450px"
                    onReady={(bridge) => {
                      console.log('[Chat] App ready:', message.app?.title, bridge);
                    }}
                    onNotification={(method, params) => {
                      console.log('[Chat] App notification:', method, params);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Processing indicator */}
        {isProcessing && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
          }}>
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              color: '#6b7280',
              fontSize: '14px',
            }}>
              <span style={{
                display: 'inline-block',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}>
                Thinking...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        backgroundColor: 'white',
        borderTop: '1px solid #e5e7eb',
        padding: '16px 24px',
        boxShadow: '0 -1px 2px 0 rgba(0, 0, 0, 0.05)',
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          maxWidth: '900px',
          margin: '0 auto',
        }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask for a counter, form, or say hello..."
            disabled={isProcessing}
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              outline: 'none',
              backgroundColor: isProcessing ? '#f9fafb' : 'white',
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isProcessing}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 600,
              color: 'white',
              backgroundColor: input.trim() && !isProcessing ? '#3b82f6' : '#9ca3af',
              border: 'none',
              borderRadius: '8px',
              cursor: input.trim() && !isProcessing ? 'pointer' : 'not-allowed',
            }}
          >
            Send
          </button>
        </div>

        {/* Quick suggestions */}
        <div style={{
          marginTop: '12px',
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          maxWidth: '900px',
          margin: '12px auto 0',
        }}>
          {['Create a counter', 'Show me a form', 'Hello'].map(suggestion => (
            <button
              key={suggestion}
              onClick={() => {
                setInput(suggestion);
                inputRef.current?.focus();
              }}
              disabled={isProcessing}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                color: '#6b7280',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Add pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};
