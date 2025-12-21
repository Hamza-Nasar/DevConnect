import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (): Socket | null => {
  if (typeof window === "undefined") return null;

  if (!socket) {
    const origin = window.location.origin.replace(/\/$/, "");
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || origin;

    console.log("🔌 [Client] Initializing Socket...", { url: socketUrl, path: "/socket.io-custom" });

    socket = io(socketUrl, {
      path: "/socket.io-custom",
      transports: ["websocket", "polling"], // Prefer websocket
      reconnection: true,
      reconnectionAttempts: Infinity, // Keep trying!
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      withCredentials: true,
      autoConnect: true,
    });

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
      
      if (reason === "io server disconnect" || reason === "transport close") {
        // the disconnection was initiated by the server, you need to reconnect manually
        socket?.connect();
      }
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

    // Debug: log ALL incoming events
    socket.onAny((eventName, ...args) => {
      if (eventName !== "pong_heartbeat") { // reduce noise
        console.log(`📥 [Client] Received Event: ${eventName}`, args);
      }
    });
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
