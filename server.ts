import "dotenv/config";
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initializeSocket } from "./server/index.ts";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

// Log environment info
console.log("🚀 Starting server...");
console.log(`📦 Environment: ${process.env.NODE_ENV || "development"}`);
console.log(`🌐 Hostname: ${hostname}`);
console.log(`🔌 Port: ${port}`);
console.log(`🔗 Socket URL: ${process.env.NEXT_PUBLIC_SOCKET_URL || "Not set (using origin)"}`);
console.log(`✅ Allowed Origins: ${process.env.ALLOWED_ORIGINS || "All (development mode)"}`);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      // Skip Next.js for socket.io requests - let Socket.io handle them
      if (req.url?.startsWith("/socket.io-custom") || req.url?.startsWith("/socket.io")) {
        return; // Let Socket.io handle it
      }

      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("❌ Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  // Initialize Socket.io
  const io = initializeSocket(httpServer);

  // Log socket.io connection info
  io.engine.on("connection_error", (err) => {
    console.error("❌ Socket.io connection error:", err);
  });

  httpServer
    .once("error", (err) => {
      console.error("❌ Server error:", err);
      process.exit(1);
    })
    .listen(port, hostname, () => {
      console.log(`✅ Server ready on http://${hostname}:${port}`);
      console.log(`✅ WebSocket server initialized at /socket.io-custom`);
      console.log(`✅ Socket.io CORS configured for production`);
    });
});

