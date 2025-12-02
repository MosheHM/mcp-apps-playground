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
import { AppBridge } from '../bridge/AppBridge';
import { App, HostMethods } from '../types';

/**
 * HelloWorldApp Component
 */
const HelloWorldApp: React.FC = () => {
  const [bridge, setBridge] = useState<AppBridge | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [status, setStatus] = useState('Initializing...');

  useEffect(() => {
    // Create the AppBridge to communicate with the host
    // The app connects to window.parent (the host's window)
    const appBridge = new AppBridge(window.parent, '*');
    
    setBridge(appBridge);
    setStatus('Connected to host');

    // Log that we're ready
    appBridge.request(HostMethods.LOG, {
      level: 'info',
      message: 'HelloWorldApp initialized',
    }).catch(err => {
      console.error('Failed to log to host:', err);
    });

    // Cleanup on unmount
    return () => {
      appBridge.close();
    };
  }, []);

  const handleSendMessage = async () => {
    if (!bridge) return;

    try {
      // Send a notification to the host
      await bridge.request(HostMethods.SHOW_NOTIFICATION, {
        message: `Hello from the app! Message #${messageCount + 1}`,
        type: 'info',
      });

      setMessageCount(prev => prev + 1);
      setStatus(`Sent ${messageCount + 1} message(s)`);
    } catch (error) {
      console.error('Failed to send message:', error);
      setStatus('Error sending message');
    }
  };

  const handleExecuteAction = async () => {
    if (!bridge) return;

    try {
      const result = await bridge.request(HostMethods.EXECUTE_ACTION, {
        action: 'greet',
        data: { name: 'MCP App User' },
      });

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
          disabled={!bridge}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            color: 'white',
            backgroundColor: bridge ? '#3b82f6' : '#9ca3af',
            border: 'none',
            borderRadius: '6px',
            cursor: bridge ? 'pointer' : 'not-allowed',
          }}
        >
          Send Message to Host
        </button>

        <button
          onClick={handleExecuteAction}
          disabled={!bridge}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            color: 'white',
            backgroundColor: bridge ? '#10b981' : '#9ca3af',
            border: 'none',
            borderRadius: '6px',
            cursor: bridge ? 'pointer' : 'not-allowed',
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

/**
 * App class implementation for lifecycle management
 */
class HelloWorldAppImpl implements App {
  private bridge: AppBridge | null = null;

  async onMount(bridge: AppBridge): Promise<void> {
    this.bridge = bridge;
    console.log('HelloWorldApp mounted with bridge');
  }

  async onUnmount(): Promise<void> {
    if (this.bridge) {
      this.bridge.close();
      this.bridge = null;
    }
    console.log('HelloWorldApp unmounted');
  }
}

// Bootstrap the app
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<HelloWorldApp />);
}

// Export the app instance for use with lifecycle management
export const app = new HelloWorldAppImpl();
