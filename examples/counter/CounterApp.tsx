/**
 * CounterApp - Interactive State Management Example
 * 
 * This MCP App demonstrates:
 * 1. Managing local state within an app
 * 2. Bidirectional communication with the host
 * 3. Responding to host requests
 * 4. Sending state updates back to the host
 * 
 * The counter can be controlled both from within the app and by the host,
 * showcasing the bidirectional nature of the AppBridge.
 */

import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../../src/lib/ext-apps/app';
import { PostMessageTransport } from '../../src/lib/ext-apps/message-transport';
import { AppMethods, HostMethods } from '../../src/types';
import { z } from 'zod';

/**
 * CounterApp Component
 */
const CounterApp: React.FC = () => {
  const [app, setApp] = useState<App | null>(null);
  const [count, setCount] = useState(0);
  const [history, setHistory] = useState<string[]>([]);

  // Use ref to access current count in handlers without closure staleness
  const countRef = useRef(count);
  useEffect(() => {
    countRef.current = count;
  }, [count]);

  useEffect(() => {
    // Create the App instance
    const mcpApp = new App(
      { name: "Counter App", version: "1.0.0" },
      { capabilities: { tools: {}, resources: {} } }
    );

    // Register handlers for host requests

    // Handle initialization
    const InitializeSchema = z.object({
      method: z.literal(AppMethods.INITIALIZE),
      params: z.object({
        initialCount: z.number().optional()
      }).optional()
    });

    mcpApp.setRequestHandler(InitializeSchema, async (request) => {
      const initialCount = request.params?.initialCount ?? 0;
      setCount(initialCount);
      addToHistory(`Initialized with count: ${initialCount}`);
      return { success: true, count: initialCount };
    });

    // Handle data from host
    const SendDataSchema = z.object({
      method: z.literal(AppMethods.SEND_DATA),
      params: z.object({
        action: z.string(),
        value: z.number().optional()
      })
    });

    mcpApp.setRequestHandler(SendDataSchema, async (request) => {
      const { action, value } = request.params;

      if (action === 'setCount' && typeof value === 'number') {
        setCount(value);
        addToHistory(`Host set count to: ${value}`);
        return { success: true, count: value };
      }

      if (action === 'increment') {
        const incrementValue = value || 1;
        setCount(prev => {
          const newCount = prev + incrementValue;
          addToHistory(`Host incremented by ${incrementValue}`);
          return newCount;
        });
        return { success: true };
      }

      if (action === 'decrement') {
        const decrementValue = value || 1;
        setCount(prev => {
          const newCount = prev - decrementValue;
          addToHistory(`Host decremented by ${decrementValue}`);
          return newCount;
        });
        return { success: true };
      }

      return { success: false, error: 'Unknown action' };
    });

    // Handle action requests
    const PerformActionSchema = z.object({
      method: z.literal(AppMethods.PERFORM_ACTION),
      params: z.object({
        action: z.string()
      })
    });

    mcpApp.setRequestHandler(PerformActionSchema, async (request) => {
      const { action } = request.params;

      if (action === 'reset') {
        setCount(0);
        addToHistory('Host requested reset');
        return { success: true, count: 0 };
      }

      return { success: false, error: 'Unknown action' };
    });

    // Connect to host
    mcpApp.connect(new PostMessageTransport(window.parent, window))
      .then(() => {
        setApp(mcpApp);
        // Log initialization
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
            message: 'CounterApp initialized',
          }
        }, LogSchema);
      })
      .catch(console.error);

    function addToHistory(message: string) {
      setHistory(prev => [
        ...prev.slice(-9), // Keep last 9 items
        `${new Date().toLocaleTimeString()}: ${message}`
      ]);
    }

    return () => {
      mcpApp.close();
    };
  }, []);

  // Notify host when count changes (using a custom notification if supported, or just log)
  // The old AppBridge had .notify(). The new App has .notification().
  useEffect(() => {
    if (app && count !== 0) {
      app.notification({
        method: 'counter.changed',
        params: { count }
      }).catch(console.error);
    }
  }, [count, app]);

  const increment = async () => {
    const newCount = count + 1;
    setCount(newCount);
    setHistory(prev => [
      ...prev.slice(-9),
      `${new Date().toLocaleTimeString()}: Incremented to ${newCount}`
    ]);

    // Notify host of the change
    if (app) {
      const LogSchema = z.object({
        method: z.literal(HostMethods.LOG),
        params: z.object({
          level: z.string().optional(),
          message: z.string()
        })
      });
      await app.request({
        method: HostMethods.LOG,
        params: {
          level: 'info',
          message: `Counter incremented to ${newCount}`,
        }
      }, LogSchema).catch(console.error);
    }
  };

  const decrement = async () => {
    const newCount = count - 1;
    setCount(newCount);
    setHistory(prev => [
      ...prev.slice(-9),
      `${new Date().toLocaleTimeString()}: Decremented to ${newCount}`
    ]);

    if (app) {
      const LogSchema = z.object({
        method: z.literal(HostMethods.LOG),
        params: z.object({
          level: z.string().optional(),
          message: z.string()
        })
      });
      await app.request({
        method: HostMethods.LOG,
        params: {
          level: 'info',
          message: `Counter decremented to ${newCount}`,
        }
      }, LogSchema).catch(console.error);
    }
  };

  const reset = async () => {
    setCount(0);
    setHistory(prev => [
      ...prev.slice(-9),
      `${new Date().toLocaleTimeString()}: Reset to 0`
    ]);

    if (app) {
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
          message: 'Counter has been reset!',
          type: 'info',
        }
      }, ShowNotificationSchema).catch(console.error);
    }
  };

  const sendToHost = async () => {
    if (!app) return;

    try {
      const ExecuteActionSchema = z.object({
        method: z.literal(HostMethods.EXECUTE_ACTION),
        params: z.object({
          action: z.string(),
          data: z.unknown().optional()
        })
      });
      await app.request({
        method: HostMethods.EXECUTE_ACTION,
        params: {
          action: 'saveCounter',
          data: { count, timestamp: new Date().toISOString() },
        }
      }, ExecuteActionSchema);

      setHistory(prev => [
        ...prev.slice(-9),
        `${new Date().toLocaleTimeString()}: Sent count to host`
      ]);
    } catch (error) {
      console.error('Failed to send to host:', error);
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
        🔢 Interactive Counter
      </h1>

      <p style={{
        fontSize: '14px',
        color: '#6b7280',
        marginBottom: '24px',
      }}>
        This app demonstrates state management and bidirectional communication.
        The counter can be controlled from both the app and the host.
      </p>

      <div style={{
        backgroundColor: '#f9fafb',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        padding: '32px',
        textAlign: 'center',
        marginBottom: '24px',
      }}>
        <div style={{
          fontSize: '64px',
          fontWeight: 700,
          color: count >= 0 ? '#3b82f6' : '#ef4444',
          marginBottom: '16px',
        }}>
          {count}
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <button
            onClick={decrement}
            disabled={!app}
            style={{
              padding: '12px 24px',
              fontSize: '18px',
              fontWeight: 600,
              color: 'white',
              backgroundColor: app ? '#ef4444' : '#9ca3af',
              border: 'none',
              borderRadius: '8px',
              cursor: app ? 'pointer' : 'not-allowed',
              minWidth: '60px',
            }}
          >
            −
          </button>

          <button
            onClick={reset}
            disabled={!app}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 600,
              color: app ? '#374151' : '#9ca3af',
              backgroundColor: app ? '#f3f4f6' : '#e5e7eb',
              border: app ? '2px solid #d1d5db' : '2px solid #e5e7eb',
              borderRadius: '8px',
              cursor: app ? 'pointer' : 'not-allowed',
            }}
          >
            Reset
          </button>

          <button
            onClick={increment}
            disabled={!app}
            style={{
              padding: '12px 24px',
              fontSize: '18px',
              fontWeight: 600,
              color: 'white',
              backgroundColor: app ? '#10b981' : '#9ca3af',
              border: 'none',
              borderRadius: '8px',
              cursor: app ? 'pointer' : 'not-allowed',
              minWidth: '60px',
            }}
          >
            +
          </button>
        </div>
      </div>

      <button
        onClick={sendToHost}
        disabled={!app}
        style={{
          width: '100%',
          padding: '12px',
          fontSize: '14px',
          fontWeight: 600,
          color: 'white',
          backgroundColor: app ? '#8b5cf6' : '#9ca3af',
          border: 'none',
          borderRadius: '8px',
          cursor: app ? 'pointer' : 'not-allowed',
          marginBottom: '24px',
        }}
      >
        📤 Send Current Count to Host
      </button>

      {history.length > 0 && (
        <div style={{
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px',
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '12px',
            color: '#374151',
          }}>
            Activity History
          </h3>
          <div style={{
            maxHeight: '150px',
            overflow: 'auto',
            fontSize: '12px',
            fontFamily: 'monospace',
          }}>
            {history.map((item, i) => (
              <div key={i} style={{ padding: '4px 0', color: '#6b7280' }}>
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Bootstrap the app
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<CounterApp />);
}
