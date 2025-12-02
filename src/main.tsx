/**
 * Main Demo Application
 * 
 * This is the host application that demonstrates how to use AppHost
 * to render different MCP Apps in sandboxed iframes.
 */

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppHost } from './host/AppHost';

/**
 * Main demo component
 */
const Demo: React.FC = () => {
  const [selectedApp, setSelectedApp] = useState('hello');

  const apps = {
    hello: {
      name: 'Hello World',
      url: '/hello.html',
      description: 'A minimal example showing basic AppBridge communication',
    },
    counter: {
      name: 'Interactive Counter',
      url: '/counter.html',
      description: 'Demonstrates state management and bidirectional communication',
    },
    form: {
      name: 'Form Submission',
      url: '/form.html',
      description: 'Shows form handling and data submission to the host',
    },
  };

  const currentApp = apps[selectedApp as keyof typeof apps];

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '20px',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            marginBottom: '8px',
            color: '#1f2937',
          }}>
            MCP Apps Playground
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
          }}>
            Interactive examples of Model Context Protocol Apps with AppBridge communication
          </p>
        </div>
      </header>

      {/* Main content */}
      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px',
      }}>
        {/* App selector */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '12px',
            color: '#374151',
          }}>
            Select an example:
          </label>
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
          }}>
            {Object.entries(apps).map(([key, app]) => (
              <button
                key={key}
                onClick={() => setSelectedApp(key)}
                style={{
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: selectedApp === key ? 'white' : '#374151',
                  backgroundColor: selectedApp === key ? '#3b82f6' : 'white',
                  border: selectedApp === key ? 'none' : '2px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                {app.name}
              </button>
            ))}
          </div>
          <p style={{
            fontSize: '13px',
            color: '#6b7280',
            marginTop: '12px',
          }}>
            {currentApp.description}
          </p>
        </div>

        {/* App host container */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
        }}>
          <AppHost
            key={selectedApp}
            appUrl={currentApp.url}
            title={currentApp.name}
            height="500px"
            onReady={(bridge) => {
              console.log('[Demo] App is ready, bridge:', bridge);
            }}
            onNotification={(method, params) => {
              console.log('[Demo] Notification received:', method, params);
            }}
          />
        </div>

        {/* Information panel */}
        <div style={{
          marginTop: '24px',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          padding: '20px',
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 600,
            marginBottom: '12px',
            color: '#1f2937',
          }}>
            How it works
          </h2>
          <ul style={{
            fontSize: '14px',
            color: '#4b5563',
            lineHeight: '1.6',
            paddingLeft: '20px',
          }}>
            <li>Each app runs in a sandboxed iframe with limited permissions</li>
            <li>Communication uses PostMessage (secure cross-origin messaging)</li>
            <li>AppBridge wraps PostMessage in a JSON-RPC 2.0 protocol</li>
            <li>Apps can call host methods and the host can call app methods</li>
            <li>Open your browser console to see the communication logs</li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px',
        fontSize: '13px',
        color: '#6b7280',
        textAlign: 'center',
      }}>
        Learn more about MCP Apps: {' '}
        <a
          href="https://github.com/modelcontextprotocol/ext-apps"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#3b82f6' }}
        >
          modelcontextprotocol/ext-apps
        </a>
        {' '} | {' '}
        <a
          href="https://github.com/MCP-UI-Org/mcp-ui/pull/147"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#3b82f6' }}
        >
          MCP-UI PR #147
        </a>
      </footer>
    </div>
  );
};

// Bootstrap the demo
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<Demo />);
}
