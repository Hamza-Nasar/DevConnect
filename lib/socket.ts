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
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      withCredentials: true,
      autoConnect: true,
    });

    socket.on("connect", () => {
      console.log("✅ [Client] CONNECTED! Socket ID:", socket?.id);
    });

    socket.on("connect_error", (error) => {
      console.error("❌ [Client] CONNECTION ERROR:", error.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 [Client] DISCONNECTED:", reason);
    });

    // Debug: log ALL incoming events
    socket.onAny((eventName, ...args) => {
      console.log(`📥 [Client] Received Event: ${eventName}`, args);
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default getSocket;
