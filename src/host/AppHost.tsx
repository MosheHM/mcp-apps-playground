/**
 * AppHost Component
 * 
 * Hosts MCP Apps in a sandboxed iframe and manages AppBridge communication.
 * Serves as the "host" side of the host-app relationship.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { AppBridge } from '../lib/ext-apps/app-bridge';
import { AppHostConfig, HostMethods, HostCapabilities } from '../types';
import { AppRenderer } from './AppRenderer';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { z } from 'zod';

// ============================================================================
// Constants & Types
// ============================================================================

const DEFAULT_CAPABILITIES: HostCapabilities = Object.freeze({
  notifications: true,
  actions: true,
  fileUpload: false,
});

const DUMMY_SERVER_RESPONSE = Object.freeze({
  protocolVersion: '2024-11-05',
  capabilities: {
    tools: {},
    resources: {},
    prompts: {},
    logging: {}
  },
  serverInfo: {
    name: "DummyServer",
    version: "1.0.0"
  }
});

// ============================================================================
// Schemas (extracted for reusability)
// ============================================================================

const ShowNotificationSchema = z.object({
  method: z.literal(HostMethods.SHOW_NOTIFICATION),
  params: z.object({
    message: z.string(),
    type: z.string().optional()
  })
});

const ExecuteActionSchema = z.object({
  method: z.literal(HostMethods.EXECUTE_ACTION),
  params: z.object({
    action: z.string(),
    data: z.unknown().optional()
  })
});

const GetCapabilitiesSchema = z.object({
  method: z.literal(HostMethods.GET_CAPABILITIES),
  params: z.unknown().optional()
});

const LogSchema = z.object({
  method: z.literal(HostMethods.LOG),
  params: z.object({
    level: z.string().optional(),
    message: z.string()
  })
});

// ============================================================================
// DummyTransport (for local-only apps without MCP server)
// ============================================================================

class DummyTransport implements Transport {
  onmessage?: (message: JSONRPCMessage) => void;
  onclose?: () => void;
  onerror?: (error: Error) => void;

  async start(): Promise<void> { }

  async send(message: JSONRPCMessage): Promise<void> {
    // Handle initialization handshake to satisfy Client requirements
    const msg = message as { method?: string; id?: string | number };
    if (msg.method === 'initialize' && msg.id !== undefined) {
      setTimeout(() => {
        this.onmessage?.({
          jsonrpc: '2.0',
          id: msg.id,
          result: DUMMY_SERVER_RESPONSE
        } as JSONRPCMessage);
      }, 0);
    }
  }

  async close(): Promise<void> {
    this.onclose?.();
  }
}

// ============================================================================
// Component Props
// ============================================================================

interface AppHostProps extends AppHostConfig {
  onReady?: (bridge: AppBridge) => void;
  onNotification?: (method: string, params: unknown) => void;
  capabilities?: HostCapabilities;
}

// ============================================================================
// Component
// ============================================================================

export const AppHost: React.FC<AppHostProps> = ({
  appUrl,
  sandbox = 'allow-scripts allow-same-origin allow-forms',
  title = 'MCP App',
  width = '100%',
  height = '400px',
  onReady,
  capabilities = DEFAULT_CAPABILITIES,
}) => {
  const [isReady, setIsReady] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isClientConnected, setIsClientConnected] = useState(false);

  // Create client once
  const client = useMemo(() => {
    const transport = new DummyTransport();
    const mcpClient = new Client(
      { name: "MCP Playground Host", version: "1.0.0" },
      { capabilities: {} }
    );

    mcpClient.connect(transport)
      .then(() => {
        console.log("[Host] Dummy client connected");
        setIsClientConnected(true);
      })
      .catch(console.error);

    return mcpClient;
  }, []);

  // Handler registration (memoized)
  const handleSetup = useCallback((bridge: AppBridge) => {
    bridge.setRequestHandler(ShowNotificationSchema, async (request) => {
      const { message, type = 'info' } = request.params;
      console.log(`[Host] Notification (${type}):`, message);
      alert(`${type.toUpperCase()}: ${message}`);
      return { success: true };
    });

    bridge.setRequestHandler(ExecuteActionSchema, async (request) => {
      const { action, data } = request.params;
      console.log(`[Host] Executing action:`, action, data);
      return { success: true, action, data };
    });

    bridge.setRequestHandler(GetCapabilitiesSchema, async () => capabilities);

    bridge.setRequestHandler(LogSchema, async (request) => {
      const { level = 'info', message } = request.params;
      const logMessage = `[App ${level.toUpperCase()}] ${message}`;
      console.log(logMessage);
      setLogs(prev => [...prev, logMessage]);
      return { success: true };
    });
  }, [capabilities]);

  const handleReady = useCallback((bridge: AppBridge) => {
    setIsReady(true);
    console.log('[Host] AppBridge initialized and ready');
    onReady?.(bridge);
  }, [onReady]);

  return (
    <div className="app-host-container" style={{ width: '100%', maxWidth: width }}>
      <Header title={title} isReady={isReady} />

      <div style={containerStyle(height)}>
        {isClientConnected ? (
          <AppRenderer
            sandboxProxyUrl={new URL('/sandbox-proxy.html', window.location.origin)}
            client={client}
            toolName="custom-app"
            appUrl={appUrl}
            onSetup={handleSetup}
            onReady={handleReady}
            onerror={(err) => console.error("[AppHost] Renderer error:", err)}
          />
        ) : (
          <LoadingMessage />
        )}
      </div>

      {logs.length > 0 && <LogsPanel logs={logs} />}
    </div>
  );
};

// ============================================================================
// Subcomponents
// ============================================================================

const Header: React.FC<{ title: string; isReady: boolean }> = ({ title, isReady }) => (
  <div style={headerStyle}>
    <span style={{ fontWeight: 600 }}>{title}</span>
    <span style={{ fontSize: '12px', color: isReady ? '#22c55e' : '#9ca3af' }}>
      {isReady ? '● Ready' : '○ Loading...'}
    </span>
  </div>
);

const LoadingMessage: React.FC = () => (
  <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
    Initializing host environment...
  </div>
);

const LogsPanel: React.FC<{ logs: string[] }> = ({ logs }) => (
  <details style={logsPanelStyle}>
    <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
      Logs ({logs.length})
    </summary>
    <div style={{ marginTop: '8px', maxHeight: '200px', overflow: 'auto' }}>
      {logs.map((log, i) => (
        <div key={i} style={{ padding: '2px 0' }}>{log}</div>
      ))}
    </div>
  </details>
);

// ============================================================================
// Styles
// ============================================================================

const headerStyle: React.CSSProperties = {
  padding: '8px 12px',
  backgroundColor: '#f5f5f5',
  borderBottom: '1px solid #ddd',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: '14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const containerStyle = (height: string | number): React.CSSProperties => ({
  width: '100%',
  height,
  border: '1px solid #ddd',
  borderTop: 'none',
  position: 'relative',
});

const logsPanelStyle: React.CSSProperties = {
  marginTop: '8px',
  padding: '8px',
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '4px',
  fontFamily: 'monospace',
  fontSize: '12px',
};
