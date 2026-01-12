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
console.log(`🧠 Node Version: ${process.version}`);
console.log(`📦 Environment: ${process.env.NODE_ENV || "development"}`);
console.log(`🔌 Port: ${port}`);
console.log(`🚂 Railway Project ID: ${process.env.RAILWAY_PROJECT_ID ? "DETECTED" : "NOT DETECTED"}`);
console.log(`☁️ Vercel Environment: ${process.env.VERCEL ? "DETECTED" : "NOT DETECTED"}`);
console.log(`🌐 Hostname will be: 0.0.0.0 (Railway requirement)`);
console.log(`🔧 Server Mode: Custom Node.js server (NOT serverless)`);
// Force custom server mode detection
const isRailway = !!process.env.RAILWAY_PROJECT_ID;
const isVercel = !!process.env.VERCEL;
console.log(`🎯 Deployment Detection: Railway=${isRailway}, Vercel=${isVercel}`);
if (isRailway) {
    console.log("✅ Railway deployment confirmed - Socket.IO server will be initialized");
}
else if (isVercel) {
    console.log("⚠️ Vercel deployment detected - Socket.IO may not work in serverless mode");
}
else {
    console.log("🤔 Unknown deployment platform - assuming custom server setup");
}
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
    console.log("🔌 Initializing Socket.IO server...");
    const io = (0, index_1.initializeSocket)(httpServer);
    console.log("✅ Socket.IO server initialized successfully");
    io.engine.on("connection_error", (err) => {
        console.error("❌ Socket.io engine error:", err);
    });
    io.on("connection", (socket) => {
        console.log(`🔗 [Main] Socket connected: ${socket.id}`);
    });
    // Bind to 0.0.0.0 for Railway compatibility
    httpServer.listen(port, '0.0.0.0', () => {
        console.log(`🚀 Listening on port ${port}`);
        console.log(`🔌 Socket.IO initialized`);
        console.log(`✅ Custom Node server running (NOT serverless)`);
        console.log(`🌐 Railway deployment active - full WebSocket support`);
        console.log(`🚀 Startup complete at ${new Date().toISOString()}`);
    });
});
