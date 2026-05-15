import { io, Socket } from "socket.io-client";

interface CustomSocket extends Socket {
  userId?: string;
}

let socket: CustomSocket | null = null;

export const getSocket = (): CustomSocket | null => {
  // Strict check for client-side environment
  if (typeof window === "undefined" || !window?.location) return null;
  const hasSessionCookie =
    typeof document !== "undefined" &&
    (document.cookie.includes("next-auth.session-token=") ||
      document.cookie.includes("__Secure-next-auth.session-token="));
  const authToken = window.localStorage.getItem("devconnect_socket_token");
  if (!hasSessionCookie && !authToken) {
    return null;
  }

  if (!socket) {
    const origin = window.location.origin.replace(/\/$/, "");
    const configuredSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
    const fallbackRailwayUrl =
      process.env.NEXT_PUBLIC_RAILWAY_URL?.trim() ||
      "https://devconnect-production-d794.up.railway.app";
    let socketUrl = configuredSocketUrl || origin;

    // Environment detection using server-side variables (more reliable than hostname)
    const deploymentPlatform = process.env.DEPLOYMENT_PLATFORM || 'unknown';
    const isRailway = deploymentPlatform === 'railway' || !!process.env.RAILWAY_PROJECT_ID;
    const isVercel = deploymentPlatform === 'vercel' || !!process.env.VERCEL;
    const isProduction = process.env.NODE_ENV === "production";

    // Fallback hostname detection for edge cases
    const hostnameVercel = window.location?.hostname?.includes("vercel.app");
    const hostnameRailway = window.location?.hostname?.includes("railway.app") ||
                           window.location?.hostname?.includes("up.railway.app");

    // Use server-side detection as primary, hostname as fallback
    const finalIsRailway = isRailway || (!isVercel && hostnameRailway);
    const finalIsVercel = isVercel || hostnameVercel;

    console.log("🔍 [Client] Environment Detection:", {
      deploymentPlatform,
      serverRailway: isRailway,
      serverVercel: isVercel,
      hostnameRailway,
      hostnameVercel,
      finalRailway: finalIsRailway,
      finalVercel: finalIsVercel,
      isProduction
    });

    if (isProduction && finalIsVercel && !configuredSocketUrl) {
      console.warn(
        "[Client] NEXT_PUBLIC_SOCKET_URL missing on Vercel. Falling back to Railway socket URL."
      );
      socketUrl = fallbackRailwayUrl;
    }

    // Ensure socketUrl has protocol
    if (socketUrl && !socketUrl.startsWith("http")) {
      socketUrl = (window.location.protocol === "https:" ? "https://" : "http://") + socketUrl;
    }

    // Remove trailing slash
    socketUrl = socketUrl.replace(/\/$/, "");

    if (finalIsRailway) {
      console.log("🚂 [Client] Detected Railway deployment. WebSockets should be fully supported.");
    }

    console.log("🔌 [Client] Initializing Socket...", {
      url: socketUrl,
      path: "/socket.io",
      deploymentPlatform,
      isProduction,
      isRailway: finalIsRailway,
      isVercel: finalIsVercel,
      timestamp: new Date().toISOString()
    });

    const isCrossOrigin = (() => {
      try {
        return new URL(socketUrl).origin !== window.location.origin;
      } catch {
        return false;
      }
    })();

    socket = io(socketUrl, {
      path: "/socket.io",
      auth: {
        token: authToken || undefined,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      withCredentials: !isCrossOrigin,
      autoConnect: true,
      forceNew: false,
    }) as CustomSocket;

  // Diagnostics for debugging
  if (typeof window !== "undefined") {
    (window as any).SOCKET_DEBUG = {
      socket,
      config: { socketUrl, path: "/socket.io" },
      getStatus: () => ({
        connected: socket?.connected,
        id: socket?.id,
        transport: (socket as any).io?.engine?.transport?.name,
        readyState: (socket as any).io?.engine?.readyState
      }),
      testConnection,
      reconnect: reconnectSocket,
      disconnect: disconnectSocket
    };
  }

    let heartbeatInterval: NodeJS.Timeout;

    socket.on("connect", () => {
      console.log("✅ [Client] CONNECTED! Socket ID:", socket?.id);

      // Start heartbeat
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(() => {
        if (socket?.connected) {
          socket.emit("ping_heartbeat");
        }
      }, 30000);
    });

    socket.on("connect_error", (error) => {
      console.error("❌ [Client] WebSocket CONNECTION ERROR:", {
        message: error.message,
        timestamp: new Date().toISOString()
      });
      if (error.message === "Unauthorized") {
        console.error("[Client] Socket authentication failed. A valid session or socket token is required.");
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 [Client] DISCONNECTED:", reason);
      if (heartbeatInterval) clearInterval(heartbeatInterval);

      if (reason === "io server disconnect") {
        // Only manually reconnect if the server explicitly kicked us (socket.disconnect() on server)
        socket?.connect();
      }
      // "transport close" and others are handled by auto-reconnection
    });

    // Handle visibility change to recover connection
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          console.log("👁️ [Client] Tab visible - checking socket connection");
          if (socket && !socket.connected) {
            socket.connect();
          }
        }
      });
    }

    // Debug: log ALL incoming events in development
    if (process.env.NODE_ENV === "development") {
      socket.onAny((eventName, ...args) => {
        if (eventName !== "pong_heartbeat") { // reduce noise
          console.log(`📥[Client] Received Event: ${eventName} `, args);
        }
      });
    }
  }

  return socket;
};

export const reconnectSocket = () => {
  if (socket) {
    console.log("🔄 [Client] Force reconnecting...");
    socket.disconnect().connect();
  } else {
    getSocket();
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const testConnection = () => {
  console.log("🧪 [Client] Testing WebSocket connection...");

  if (!socket) {
    console.log("❌ [Client] No socket instance found");
    return false;
  }

  console.log("📊 [Client] Connection status:", {
    connected: socket.connected,
    id: socket.id,
    transport: (socket as any).io?.engine?.transport?.name,
    readyState: (socket as any).io?.engine?.readyState
  });

  // Send a test ping
  socket.emit("ping_heartbeat");
  socket.once("pong_heartbeat", () => {
    console.log("✅ [Client] Ping-pong test successful");
  });

  return socket.connected;
};

export default getSocket;
