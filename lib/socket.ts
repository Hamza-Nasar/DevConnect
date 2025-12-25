import { io, Socket } from "socket.io-client";

interface CustomSocket extends Socket {
  userId?: string;
}

let socket: CustomSocket | null = null;

export const getSocket = (): CustomSocket | null => {
  if (typeof window === "undefined") return null;

  if (!socket) {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;

    // Hard safety check (Vercel + Railway setup)
    if (!socketUrl) {
      console.error(
        "❌ NEXT_PUBLIC_SOCKET_URL is not set. Socket cannot be initialized."
      );
      return null;
    }

    console.log("🔌 [Client] Initializing Socket...", {
      url: socketUrl,
      path: "/socket.io-custom",
      env: process.env.NODE_ENV,
    });

    socket = io(socketUrl, {
      path: "/socket.io-custom",
      transports: ["websocket"], // Railway fully supports WS
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 20000,
    }) as CustomSocket;

    // ---- Core lifecycle logs ----
    socket.on("connect", () => {
      console.log("✅ [Client] CONNECTED:", socket?.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 [Client] DISCONNECTED:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("❌ [Client] CONNECTION ERROR:", error.message);
    });

    // ---- Optional debug (dev only) ----
    if (process.env.NODE_ENV === "development") {
      socket.onAny((event, ...args) => {
        console.log(`📥 [Socket Event] ${event}`, args);
      });
    }

    // Expose debug helper
    (window as any).SOCKET_DEBUG = {
      get status() {
        return {
          connected: socket?.connected,
          id: socket?.id,
          transport: (socket as any)?.io?.engine?.transport?.name,
        };
      },
      socket,
    };
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
