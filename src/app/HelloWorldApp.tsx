/**
 * HelloWorldApp - Minimal MCP App Example
 * 
 * This is the simplest possible MCP App that demonstrates:
 * 1. How to implement the App interface
 * 2. How to use AppBridge for communication with the host
 * 3. Basic interaction patterns
 * 
 * This app runs in a sandboxed iframe and communicates with the host
 * via JSON-RPC messages over PostMessage.
 */

import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../lib/ext-apps/app';
import { PostMessageTransport } from '../lib/ext-apps/message-transport';
import { HostMethods } from '../types';
import { z } from 'zod';

/**
 * HelloWorldApp Component
 */
const HelloWorldApp: React.FC = () => {
  const [app, setApp] = useState<App | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [status, setStatus] = useState('Initializing...');

  useEffect(() => {
    // Create the App instance
    const mcpApp = new App(
      { name: "Hello World App", version: "1.0.0" },
      { capabilities: { tools: {}, resources: {} } }
    );

    // Connect to host
    mcpApp.connect(new PostMessageTransport(window.parent, window))
      .then(() => {
        setApp(mcpApp);
        setStatus('Connected to host');

        // Log that we're ready
        const LogSchema = z.object({
          method: z.literal(HostMethods.LOG),
          params: z.object({
            level: z.string().optional(),
            message: z.string()
          })
        });
        return mcpApp.request({
          method: HostMethods.LOG,
          params: {
            level: 'info',
            message: 'HelloWorldApp initialized',
          }
        }, LogSchema);
      })
      .catch(err => {
        console.error('Failed to connect/log to host:', err);
        setStatus('Connection failed');
      });

    // Cleanup on unmount
    return () => {
      mcpApp.close();
    };
  }, []);

  const handleSendMessage = async () => {
    if (!app) return;

    try {
      // Send a notification to the host
      const ShowNotificationSchema = z.object({
        method: z.literal(HostMethods.SHOW_NOTIFICATION),
        params: z.object({
          message: z.string(),
          type: z.string().optional()
        })
      });
      await app.request({
        method: HostMethods.SHOW_NOTIFICATION,
        params: {
          message: `Hello from the app! Message #${messageCount + 1}`,
          type: 'info',
        }
      }, ShowNotificationSchema);

      setMessageCount(prev => prev + 1);
      setStatus(`Sent ${messageCount + 1} message(s)`);
    } catch (error) {
      console.error('Failed to send message:', error);
      setStatus('Error sending message');
    }
  };

  const handleExecuteAction = async () => {
    if (!app) return;

    try {
      const ExecuteActionSchema = z.object({
        method: z.literal(HostMethods.EXECUTE_ACTION),
        params: z.object({
          action: z.string(),
          data: z.unknown().optional()
        })
      });
      const result = await app.request({
        method: HostMethods.EXECUTE_ACTION,
        params: {
          action: 'greet',
          data: { name: 'MCP App User' },
        }
      }, ExecuteActionSchema);

      console.log('Action result:', result);
      setStatus('Action executed successfully');
    } catch (error) {
      console.error('Failed to execute action:', error);
      setStatus('Error executing action');
    }
  };

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '24px',
      maxWidth: '600px',
      margin: '0 auto',
    }}>
      <h1 style={{
        fontSize: '24px',
        fontWeight: 700,
        marginBottom: '8px',
        color: '#1f2937',
      }}>
        👋 Hello, MCP Apps!
      </h1>

      <p style={{
        fontSize: '14px',
        color: '#6b7280',
        marginBottom: '24px',
      }}>
        This is a minimal MCP App running in a sandboxed iframe.
        It communicates with the host via AppBridge using JSON-RPC messages.
      </p>

      <div style={{
        backgroundColor: '#f3f4f6',
        padding: '12px 16px',
        borderRadius: '6px',
        marginBottom: '24px',
        fontSize: '14px',
      }}>
        <strong>Status:</strong> {status}
      </div>

      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <button
          onClick={handleSendMessage}
          disabled={!app}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            color: 'white',
            backgroundColor: app ? '#3b82f6' : '#9ca3af',
            border: 'none',
            borderRadius: '6px',
            cursor: app ? 'pointer' : 'not-allowed',
          }}
        >
          Send Message to Host
        </button>

        <button
          onClick={handleExecuteAction}
          disabled={!app}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            color: 'white',
            backgroundColor: app ? '#10b981' : '#9ca3af',
            border: 'none',
            borderRadius: '6px',
            cursor: app ? 'pointer' : 'not-allowed',
          }}
        >
          Execute Action
        </button>
      </div>

      <div style={{
        marginTop: '32px',
        padding: '16px',
        backgroundColor: '#fef3c7',
        borderLeft: '4px solid #f59e0b',
        borderRadius: '4px',
        fontSize: '13px',
        lineHeight: '1.5',
      }}>
        <strong>💡 How it works:</strong>
        <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
          <li>This app runs in an isolated iframe with limited permissions</li>
          <li>Communication happens via PostMessage (secure cross-origin messaging)</li>
          <li>AppBridge wraps PostMessage in a JSON-RPC 2.0 protocol</li>
          <li>The app can call host methods like showNotification or executeAction</li>
        </ul>
      </div>
    </div>
  );
};

// Bootstrap the app
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<HelloWorldApp />);
}
