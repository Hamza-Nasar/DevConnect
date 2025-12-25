import "dotenv/config";
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initializeSocket } from "./server/index";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

console.log("🚀 Starting server...");
console.log(`📦 Environment: ${process.env.NODE_ENV || "development"}`);
console.log(`🔌 Port: ${port}`);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      if (
        req.url?.startsWith("/socket.io") ||
        req.url?.startsWith("/socket.io-custom")
      ) {
        return;
      }

      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("❌ Error handling request:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  const io = initializeSocket(httpServer);

  io.engine.on("connection_error", (err) => {
    console.error("❌ Socket.io error:", err);
  });

  httpServer.listen(port, () => {
    console.log(`✅ Server ready on port ${port}`);
    console.log(`✅ WebSocket initialized`);
  });
});
