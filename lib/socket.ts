import { io, Socket } from "socket.io-client";

interface CustomSocket extends Socket {
  userId?: string;
}

let socket: CustomSocket | null = null;

export const getSocket = (): CustomSocket | null => {
  if (typeof window === "undefined") return null;
  
  if (!socket) {
    const origin = typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "";
    let socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || origin;

    // Ensure socketUrl has protocol
    if (socketUrl && !socketUrl.startsWith("http")) {
      socketUrl = (typeof window !== "undefined" && window.location.protocol === "https:" ? "https://" : "http://") + socketUrl;
    }

    const isVercel = typeof window !== "undefined" && window.location?.hostname?.includes("vercel.app");
    const isRailway = typeof window !== "undefined" && window.location?.hostname?.includes("railway.app");

    if (isVercel && !process.env.NEXT_PUBLIC_SOCKET_URL) {
      console.warn("⚠️ [Client] Detected Vercel deployment without NEXT_PUBLIC_SOCKET_URL. Note that Vercel serverless functions cannot host Socket.io servers. If your server is on Railway, set NEXT_PUBLIC_SOCKET_URL to your Railway app URL.");
    }

    if (isRailway) {
      console.log("🚂 [Client] Detected Railway deployment. WebSockets should be fully supported.");
    }

    console.log("🔌 [Client] Initializing Socket...", { url: socketUrl, path: "/socket.io-custom" });

    socket = io(socketUrl, {
      path: "/socket.io-custom",
      transports: ["polling", "websocket"], // Use polling first for better compatibility with Railway/proxies
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 30000,
      withCredentials: true,
      autoConnect: true,
      // Add extra options for more stability
      rememberUpgrade: true,
      forceNew: false,
    }) as CustomSocket;

    // Diagnostics for Vercel debugging
    if (typeof window !== "undefined") {
      (window as any).SOCKET_DEBUG = {
        socket,
        config: { socketUrl, path: "/socket.io-custom" },
        getStatus: () => ({
          connected: socket?.connected,
          id: socket?.id,
          transport: (socket as any).io?.engine?.transport?.name
        })
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
      console.error("❌ [Client] CONNECTION ERROR:", error.message);
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

export default getSocket;
