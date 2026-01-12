import { io, Socket } from "socket.io-client";

interface CustomSocket extends Socket {
  userId?: string;
}

let socket: CustomSocket | null = null;

export const getSocket = (): CustomSocket | null => {
  // Strict check for client-side environment
  if (typeof window === "undefined" || !window?.location) return null;

  if (!socket) {
    const origin = window.location.origin.replace(/\/$/, "");
    let socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || origin;

    // In production, if NEXT_PUBLIC_SOCKET_URL is not set and we're on Vercel, this is a critical error
    const isVercel = window.location?.hostname?.includes("vercel.app");
    const isRailway = window.location?.hostname?.includes("railway.app");
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction && isVercel && !process.env.NEXT_PUBLIC_SOCKET_URL) {
      console.error("❌ [Client] CRITICAL: Vercel deployment detected but NEXT_PUBLIC_SOCKET_URL is not set! Socket.io server cannot run on Vercel. Please set NEXT_PUBLIC_SOCKET_URL to your Railway backend URL in Vercel environment variables.");
      // Don't initialize socket if we can't connect to the right server
      return null;
    }

    // Ensure socketUrl has protocol
    if (socketUrl && !socketUrl.startsWith("http")) {
      socketUrl = (window.location.protocol === "https:" ? "https://" : "http://") + socketUrl;
    }

    // Remove trailing slash
    socketUrl = socketUrl.replace(/\/$/, "");

    if (isRailway) {
      console.log("🚂 [Client] Detected Railway deployment. WebSockets should be fully supported.");
    }

    console.log("🔌 [Client] Initializing Socket...", {
      url: socketUrl,
      path: "/socket.io",
      isProduction,
      isVercel,
      isRailway,
      timestamp: new Date().toISOString()
    });

    socket = io(socketUrl, {
      path: "/socket.io",
      transports: ["websocket"], // Force WebSocket only - no polling
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      withCredentials: true, // Enable credentials for production
      autoConnect: true,
      forceNew: true,
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
