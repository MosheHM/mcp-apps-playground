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

import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppBridge } from '../../src/bridge/AppBridge';
import { App, AppMethods, HostMethods } from '../../src/types';

/**
 * CounterApp Component
 */
const CounterApp: React.FC = () => {
  const [bridge, setBridge] = useState<AppBridge | null>(null);
  const [count, setCount] = useState(0);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    // Create the AppBridge
    const appBridge = new AppBridge(window.parent, '*');
    setBridge(appBridge);

    // Register handlers for host requests
    
    // Handle initialization
    appBridge.onRequest(AppMethods.INITIALIZE, async (params) => {
      const { initialCount = 0 } = params as { initialCount?: number };
      setCount(initialCount);
      addToHistory(`Initialized with count: ${initialCount}`);
      return { success: true, count: initialCount };
    });

    // Handle data from host
    appBridge.onRequest(AppMethods.SEND_DATA, async (params) => {
      const { action, value } = params as { action: string; value?: number };
      
      if (action === 'setCount' && typeof value === 'number') {
        setCount(value);
        addToHistory(`Host set count to: ${value}`);
        return { success: true, count: value };
      }
      
      if (action === 'increment') {
        setCount(prev => {
          const newCount = prev + (value || 1);
          addToHistory(`Host incremented by ${value || 1}`);
          return newCount;
        });
        return { success: true };
      }
      
      if (action === 'decrement') {
        setCount(prev => {
          const newCount = prev - (value || 1);
          addToHistory(`Host decremented by ${value || 1}`);
          return newCount;
        });
        return { success: true };
      }
      
      return { success: false, error: 'Unknown action' };
    });

    // Handle action requests
    appBridge.onRequest(AppMethods.PERFORM_ACTION, async (params) => {
      const { action } = params as { action: string };
      
      if (action === 'reset') {
        setCount(0);
        addToHistory('Host requested reset');
        return { success: true, count: 0 };
      }
      
      return { success: false, error: 'Unknown action' };
    });

    // Log initialization
    appBridge.request(HostMethods.LOG, {
      level: 'info',
      message: 'CounterApp initialized',
    }).catch(console.error);

    function addToHistory(message: string) {
      setHistory(prev => [
        ...prev.slice(-9), // Keep last 9 items
        `${new Date().toLocaleTimeString()}: ${message}`
      ]);
    }

    return () => {
      appBridge.close();
    };
  }, []);

  // Notify host when count changes
  useEffect(() => {
    if (bridge && count !== 0) {
      bridge.notify('counter.changed', { count });
    }
  }, [count, bridge]);

  const increment = async () => {
    const newCount = count + 1;
    setCount(newCount);
    setHistory(prev => [
      ...prev.slice(-9),
      `${new Date().toLocaleTimeString()}: Incremented to ${newCount}`
    ]);
    
    // Notify host of the change
    if (bridge) {
      await bridge.request(HostMethods.LOG, {
        level: 'info',
        message: `Counter incremented to ${newCount}`,
      });
    }
  };

  const decrement = async () => {
    const newCount = count - 1;
    setCount(newCount);
    setHistory(prev => [
      ...prev.slice(-9),
      `${new Date().toLocaleTimeString()}: Decremented to ${newCount}`
    ]);
    
    if (bridge) {
      await bridge.request(HostMethods.LOG, {
        level: 'info',
        message: `Counter decremented to ${newCount}`,
      });
    }
  };

  const reset = async () => {
    setCount(0);
    setHistory(prev => [
      ...prev.slice(-9),
      `${new Date().toLocaleTimeString()}: Reset to 0`
    ]);
    
    if (bridge) {
      await bridge.request(HostMethods.SHOW_NOTIFICATION, {
        message: 'Counter has been reset!',
        type: 'info',
      });
    }
  };

  const sendToHost = async () => {
    if (!bridge) return;
    
    try {
      await bridge.request(HostMethods.EXECUTE_ACTION, {
        action: 'saveCounter',
        data: { count, timestamp: new Date().toISOString() },
      });
      
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
            disabled={!bridge}
            style={{
              padding: '12px 24px',
              fontSize: '18px',
              fontWeight: 600,
              color: 'white',
              backgroundColor: bridge ? '#ef4444' : '#9ca3af',
              border: 'none',
              borderRadius: '8px',
              cursor: bridge ? 'pointer' : 'not-allowed',
              minWidth: '60px',
            }}
          >
            −
          </button>
          
          <button
            onClick={reset}
            disabled={!bridge}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 600,
              color: bridge ? '#374151' : '#9ca3af',
              backgroundColor: bridge ? '#f3f4f6' : '#e5e7eb',
              border: bridge ? '2px solid #d1d5db' : '2px solid #e5e7eb',
              borderRadius: '8px',
              cursor: bridge ? 'pointer' : 'not-allowed',
            }}
          >
            Reset
          </button>
          
          <button
            onClick={increment}
            disabled={!bridge}
            style={{
              padding: '12px 24px',
              fontSize: '18px',
              fontWeight: 600,
              color: 'white',
              backgroundColor: bridge ? '#10b981' : '#9ca3af',
              border: 'none',
              borderRadius: '8px',
              cursor: bridge ? 'pointer' : 'not-allowed',
              minWidth: '60px',
            }}
          >
            +
          </button>
        </div>
      </div>

      <button
        onClick={sendToHost}
        disabled={!bridge}
        style={{
          width: '100%',
          padding: '12px',
          fontSize: '14px',
          fontWeight: 600,
          color: 'white',
          backgroundColor: bridge ? '#8b5cf6' : '#9ca3af',
          border: 'none',
          borderRadius: '8px',
          cursor: bridge ? 'pointer' : 'not-allowed',
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

/**
 * App class implementation
 */
class CounterAppImpl implements App {
  private bridge: AppBridge | null = null;

  async onMount(bridge: AppBridge): Promise<void> {
    this.bridge = bridge;
    console.log('CounterApp mounted');
  }

  async onUnmount(): Promise<void> {
    if (this.bridge) {
      this.bridge.close();
      this.bridge = null;
    }
    console.log('CounterApp unmounted');
  }
}

// Bootstrap the app
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<CounterApp />);
}

export const app = new CounterAppImpl();
