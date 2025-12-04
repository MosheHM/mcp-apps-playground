import { useEffect, useRef, useState } from "react";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
    type CallToolResult,
    type LoggingMessageNotification,
    McpError,
    ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";

import {
    AppBridge,
    PostMessageTransport,
} from "../lib/ext-apps/app-bridge";

import {
    getToolUiResourceUri,
    readToolUiResourceHtml,
    setupSandboxProxyIframe,
    ToolUiResourceInfo,
} from "./app-host-utils";

/**
 * Props for the AppRenderer component.
 */
export interface AppRendererProps {
    /** URL to the sandbox proxy HTML that will host the tool UI iframe */
    sandboxProxyUrl: URL;

    /** MCP client connected to the server providing the tool */
    client: Client;

    /** Name of the MCP tool to render UI for */
    toolName: string;

    /** Optional pre-fetched resource URI. If not provided, will be fetched via getToolUiResourceUri() */
    toolResourceUri?: string;

    /** Optional direct URL to the app HTML (bypasses MCP resource reading) */
    appUrl?: string;

    /** Optional input arguments to pass to the tool UI once it's ready */
    toolInput?: Record<string, unknown>;

    /** Optional result from tool execution to pass to the tool UI once it's ready */
    toolResult?: CallToolResult;

    onopenlink?: AppBridge["onopenlink"];
    onmessage?: AppBridge["onmessage"];
    onloggingmessage?: AppBridge["onloggingmessage"];

    /** Callback to configure the bridge before connection (e.g. register custom handlers) */
    onSetup?: (bridge: AppBridge) => void;

    /** Callback invoked when the bridge is fully initialized and ready */
    onReady?: (bridge: AppBridge) => void;

    /** Callback invoked when an error occurs during setup or message handling */
    onerror?: (error: Error) => void;
}

/**
 * React component that renders an MCP tool's custom UI in a sandboxed iframe.
 */
export const AppRenderer = (props: AppRendererProps) => {
    const {
        client,
        sandboxProxyUrl,
        toolName,
        toolResourceUri,
        appUrl,
        toolInput,
        toolResult,
        onmessage,
        onopenlink,
        onloggingmessage,
        onSetup,
        onerror,
    } = props;

    // State
    const [appBridge, setAppBridge] = useState<AppBridge | null>(null);
    const [iframeReady, setIframeReady] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);

    // Use refs for callbacks to avoid effect re-runs when they change
    const onmessageRef = useRef(onmessage);
    const onopenlinkRef = useRef(onopenlink);
    const onloggingmessageRef = useRef(onloggingmessage);
    const onerrorRef = useRef(onerror);
    const onSetupRef = useRef(onSetup);

    useEffect(() => {
        onmessageRef.current = onmessage;
        onopenlinkRef.current = onopenlink;
        onloggingmessageRef.current = onloggingmessage;
        onerrorRef.current = onerror;
        onSetupRef.current = onSetup;
    });

    useEffect(() => {
        let mounted = true;

        const setup = async () => {
            try {
                const { iframe, onReady } =
                    await setupSandboxProxyIframe(sandboxProxyUrl);

                if (!mounted) return;

                iframeRef.current = iframe;
                if (containerRef.current) {
                    containerRef.current.appendChild(iframe);
                }

                await onReady;

                if (!mounted) return;

                const serverCapabilities = client.getServerCapabilities();
                const appBridge = new AppBridge(
                    client,
                    {
                        name: "Example MCP UI Host",
                        version: "1.0.0",
                    },
                    {
                        openLinks: {},
                        serverTools: serverCapabilities?.tools,
                        serverResources: serverCapabilities?.resources,
                    },
                );

                // Step 3: Register ALL handlers BEFORE connecting (critical for avoiding race conditions)

                // Hook into the standard MCP initialization to know when the inner iframe is ready
                appBridge.oninitialized = () => {
                    if (!mounted) return;
                    console.log("[Host] Inner iframe MCP client initialized");
                    setIframeReady(true);
                };

                // Register handlers passed in via props
                if (onSetupRef.current) {
                    onSetupRef.current(appBridge);
                }

                appBridge.onmessage = (params, extra) => {
                    if (!onmessageRef.current) {
                        throw new McpError(ErrorCode.MethodNotFound, "Method not found");
                    }
                    return onmessageRef.current(params, extra);
                };
                appBridge.onopenlink = (params, extra) => {
                    if (!onopenlinkRef.current) {
                        throw new McpError(ErrorCode.MethodNotFound, "Method not found");
                    }
                    return onopenlinkRef.current(params, extra);
                };
                appBridge.onloggingmessage = (params) => {
                    if (!onloggingmessageRef.current) {
                        throw new McpError(ErrorCode.MethodNotFound, "Method not found");
                    }
                    return onloggingmessageRef.current(params);
                };

                appBridge.onsizechange = async ({ width, height }) => {
                    if (iframeRef.current) {
                        if (width !== undefined) {
                            iframeRef.current.style.width = `${width}px`;
                        }
                        if (height !== undefined) {
                            iframeRef.current.style.height = `${height}px`;
                        }
                    }
                };

                // Step 4: NOW connect (triggers MCP initialization handshake)
                // IMPORTANT: Pass iframe.contentWindow as BOTH target and source to ensure
                // this proxy only responds to messages from its specific iframe
                await appBridge.connect(
                    new PostMessageTransport(
                        iframe.contentWindow!,
                        iframe.contentWindow!,
                    ),
                );

                if (!mounted) return;

                // Step 5: Store proxy in state
                setAppBridge(appBridge);
            } catch (err) {
                console.error("[AppRenderer] Error:", err);
                if (!mounted) return;
                const error = err instanceof Error ? err : new Error(String(err));
                setError(error);
                onerrorRef.current?.(error);
            }
        };

        setup();

        return () => {
            mounted = false;
            // Cleanup: remove iframe from DOM
            if (
                iframeRef.current &&
                containerRef.current?.contains(iframeRef.current)
            ) {
                containerRef.current.removeChild(iframeRef.current);
            }
        };
    }, [client, sandboxProxyUrl]);

    // Effect 2: Fetch and send UI resource
    useEffect(() => {
        if (!appBridge) return;

        let mounted = true;

        const fetchAndSendResource = async () => {
            try {
                let html: string;

                if (appUrl) {
                    console.log(`[Host] Fetching app content from URL: ${appUrl}`);
                    const response = await fetch(appUrl);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch app content: ${response.statusText}`);
                    }
                    html = await response.text();
                    console.log(`[Host] Fetched ${html.length} bytes`);
                } else {
                    // Get the resource URI (use prop if provided, otherwise fetch)
                    let resourceInfo: ToolUiResourceInfo;

                    if (toolResourceUri) {
                        // When URI is provided directly, assume it's NOT OpenAI Apps SDK format
                        resourceInfo = {
                            uri: toolResourceUri,
                        };
                        console.log(
                            `[Host] Using provided resource URI: ${resourceInfo.uri}`,
                        );
                    } else {
                        console.log(`[Host] Fetching resource URI for tool: ${toolName}`);
                        const info = await getToolUiResourceUri(client, toolName);
                        if (!info) {
                            throw new Error(
                                `Tool ${toolName} has no UI resource (no ui/resourceUri or openai/outputTemplate in tool._meta)`,
                            );
                        }
                        resourceInfo = info;
                        console.log(`[Host] Got resource URI: ${resourceInfo.uri}`);
                    }

                    if (!resourceInfo.uri) {
                        throw new Error(`Tool ${toolName}: URI is undefined or empty`);
                    }

                    if (!mounted) return;

                    // Read the HTML content
                    console.log(`[Host] Reading resource HTML from: ${resourceInfo.uri}`);
                    html = await readToolUiResourceHtml(client, {
                        uri: resourceInfo.uri,
                    });
                }

                if (!mounted) return;

                // Send the resource to the sandbox proxy
                console.log("[Host] Sending sandbox resource ready");
                await appBridge.sendSandboxResourceReady({ html });
            } catch (err) {
                if (!mounted) return;
                const error = err instanceof Error ? err : new Error(String(err));
                setError(error);
                onerrorRef.current?.(error);
            }
        };

        fetchAndSendResource();

        return () => {
            mounted = false;
        };
    }, [appBridge, toolName, toolResourceUri, appUrl, client]);

    // Effect 3: Send tool input when ready
    useEffect(() => {
        if (appBridge && iframeReady && toolInput) {
            console.log("[Host] Sending tool input:", toolInput);
            appBridge.sendToolInput({ arguments: toolInput });
        }
    }, [appBridge, iframeReady, toolInput]);

    // Effect 4: Send tool result when ready
    useEffect(() => {
        if (appBridge && iframeReady && toolResult) {
            console.log("[Host] Sending tool result:", toolResult);
            appBridge.sendToolResult(toolResult);
        }
    }, [appBridge, iframeReady, toolResult]);

    // Effect 5: Notify parent when ready
    useEffect(() => {
        if (appBridge && iframeReady && props.onReady) {
            props.onReady(appBridge);
        }
    }, [appBridge, iframeReady, props.onReady]);

    // Render
    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {error && (
                <div style={{ color: "red", padding: "1rem" }}>
                    Error: {error.message}
                </div>
            )}
        </div>
    );
};
