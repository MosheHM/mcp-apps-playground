/**
 * AppHost Component
 * 
 * This React component hosts MCP Apps in a sandboxed iframe and manages
 * the AppBridge communication. It serves as the "host" side of the host-app
 * relationship.
 * 
 * Key responsibilities:
 * 1. Render the app in a sandboxed iframe
 * 2. Create and manage the AppBridge for communication
 * 3. Expose host methods that apps can call
 * 4. Handle app lifecycle (mounting/unmounting)
 */

import React, { useEffect, useRef, useState } from 'react';
import { AppBridge } from '../bridge/AppBridge';
import { AppHostConfig, HostMethods, HostCapabilities } from '../types';

interface AppHostProps extends AppHostConfig {
  /**
   * Callback when the app is ready
   */
  onReady?: (bridge: AppBridge) => void;

  /**
   * Callback for app notifications
   */
  onNotification?: (method: string, params: unknown) => void;

  /**
   * Custom host capabilities
   */
  capabilities?: HostCapabilities;
}

/**
 * AppHost component that renders MCP Apps in a sandboxed iframe
 */
export const AppHost: React.FC<AppHostProps> = ({
  appUrl,
  sandbox = 'allow-scripts allow-same-origin',
  title = 'MCP App',
  width = '100%',
  height = '400px',
  onReady,
  onNotification,
  capabilities = {
    notifications: true,
    actions: true,
    fileUpload: false,
  },
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bridgeRef = useRef<AppBridge | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Wait for iframe to load
    const handleLoad = () => {
      const contentWindow = iframe.contentWindow;
      if (!contentWindow) {
        console.error('Failed to get iframe contentWindow');
        return;
      }

      // Create the AppBridge
      // Note: In production, you should specify the exact origin instead of '*'
      const bridge = new AppBridge(contentWindow, '*');
      bridgeRef.current = bridge;

      // Register host methods that apps can call

      // Host method: Show notification
      bridge.onRequest(HostMethods.SHOW_NOTIFICATION, async (params) => {
        const { message, type = 'info' } = params as { message: string; type?: string };
        console.log(`[Host] Notification (${type}):`, message);
        
        // In a real application, you'd show a proper notification UI
        alert(`${type.toUpperCase()}: ${message}`);
        
        return { success: true };
      });

      // Host method: Execute action
      bridge.onRequest(HostMethods.EXECUTE_ACTION, async (params) => {
        const { action, data } = params as { action: string; data?: unknown };
        console.log(`[Host] Executing action:`, action, data);
        
        // Handle the action (this is application-specific)
        return { success: true, action, data };
      });

      // Host method: Get capabilities
      bridge.onRequest(HostMethods.GET_CAPABILITIES, async () => {
        return capabilities;
      });

      // Host method: Log message (useful for debugging)
      bridge.onRequest(HostMethods.LOG, async (params) => {
        const { level = 'info', message } = params as { level?: string; message: string };
        const logMessage = `[App ${level.toUpperCase()}] ${message}`;
        console.log(logMessage);
        setLogs(prev => [...prev, logMessage]);
        return { success: true };
      });

      // Listen for notifications from the app
      bridge.onNotification('*', (params) => {
        console.log('[Host] Received notification:', params);
        if (onNotification) {
          // Extract method from the notification context if available
          onNotification('notification', params);
        }
      });

      setIsReady(true);

      // Notify parent that the bridge is ready
      if (onReady) {
        onReady(bridge);
      }

      console.log('[Host] AppBridge initialized and ready');
    };

    iframe.addEventListener('load', handleLoad);

    // Cleanup on unmount
    return () => {
      iframe.removeEventListener('load', handleLoad);
      if (bridgeRef.current) {
        bridgeRef.current.close();
        bridgeRef.current = null;
      }
    };
  }, [appUrl, onReady, onNotification, capabilities]);

  return (
    <div className="app-host-container" style={{ width: '100%', maxWidth: width }}>
      <div className="app-host-header" style={{
        padding: '8px 12px',
        backgroundColor: '#f5f5f5',
        borderBottom: '1px solid #ddd',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontWeight: 600 }}>{title}</span>
        <span style={{
          fontSize: '12px',
          color: isReady ? '#22c55e' : '#9ca3af',
        }}>
          {isReady ? '● Ready' : '○ Loading...'}
        </span>
      </div>
      
      <iframe
        ref={iframeRef}
        src={appUrl}
        sandbox={sandbox}
        title={title}
        style={{
          width: '100%',
          height,
          border: '1px solid #ddd',
          borderTop: 'none',
        }}
      />
      
      {logs.length > 0 && (
        <details style={{
          marginTop: '8px',
          padding: '8px',
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '12px',
        }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
            Logs ({logs.length})
          </summary>
          <div style={{ marginTop: '8px', maxHeight: '200px', overflow: 'auto' }}>
            {logs.map((log, i) => (
              <div key={i} style={{ padding: '2px 0' }}>{log}</div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};
