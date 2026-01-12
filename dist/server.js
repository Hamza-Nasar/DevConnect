"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const http_1 = require("http");
const url_1 = require("url");
const next_1 = __importDefault(require("next"));
const index_1 = require("./server/index");
const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
console.log("🚀 Starting server...");
console.log(`📦 Environment: ${process.env.NODE_ENV || "development"}`);
console.log(`🔌 Port: ${port}`);
const app = (0, next_1.default)({ dev });
const handle = app.getRequestHandler();
app.prepare().then(() => {
    const httpServer = (0, http_1.createServer)(async (req, res) => {
        try {
            // Let Socket.IO handle its own routes - no need to exclude them
            const parsedUrl = (0, url_1.parse)(req.url, true);
            await handle(req, res, parsedUrl);
        }
        catch (err) {
            console.error("❌ Error handling request:", err);
            res.statusCode = 500;
            res.end("Internal Server Error");
        }
    });
    const io = (0, index_1.initializeSocket)(httpServer);
    io.engine.on("connection_error", (err) => {
        console.error("❌ Socket.io engine error:", err);
    });
    io.on("connection", (socket) => {
        console.log(`🔗 [Main] Socket connected: ${socket.id}`);
    });
    // Bind to 0.0.0.0 for Railway compatibility
    httpServer.listen(port, '0.0.0.0', () => {
        console.log(`✅ Server ready on port ${port}`);
        console.log(`✅ WebSocket initialized on default path: /socket.io`);
        console.log(`🌐 Listening on: ${process.env.NODE_ENV === 'production' ? 'Production' : 'Development'} (host: 0.0.0.0)`);
        console.log(`🚀 Startup complete at ${new Date().toISOString()}`);
    });
});
