"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocket = initializeSocket;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwt_1 = require("next-auth/jwt");
const socket_server_1 = require("../lib/socket-server");
const database_index_service_1 = require("../services/database-index.service");
const user_service_1 = require("../services/user.service");
const message_socket_1 = require("../sockets/message.socket");
const post_socket_1 = require("../sockets/post.socket");
const user_socket_1 = require("../sockets/user.socket");
function initializeSocket(server) {
    void (0, database_index_service_1.ensureDatabaseIndexes)().catch((error) => {
        console.error("[DB] Failed to initialize indexes:", error);
    });
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: getAllowedOrigins(),
            methods: ["GET", "POST"],
            credentials: true,
            allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
        },
        path: "/socket.io",
        addTrailingSlash: false,
        transports: ["websocket", "polling"],
        allowEIO3: false,
        pingTimeout: 20000,
        pingInterval: 10000,
        connectTimeout: 15000,
        maxHttpBufferSize: 1e6,
        cookie: false,
    });
    (0, socket_server_1.setSocketInstance)(io);
    const userSockets = new Map();
    const userIdMapping = new Map();
    const context = {
        io,
        userSockets,
        userIdMapping,
        emitToUser: async (userId, event, data) => {
            const possibleIds = await (0, user_service_1.getUserIdentityVariants)(userId);
            let emitted = 0;
            for (const id of possibleIds) {
                const socketIds = userSockets.get(id);
                if (!socketIds)
                    continue;
                for (const socketId of socketIds) {
                    const targetSocket = io.sockets.sockets.get(socketId);
                    if (!targetSocket)
                        continue;
                    targetSocket.emit(event, data);
                    emitted++;
                }
            }
            return emitted;
        },
        getOnlineUserIds: () => {
            const ids = [];
            for (const dbId of userSockets.keys()) {
                ids.push(dbId);
                const oauthId = userIdMapping.get(dbId);
                if (oauthId && oauthId !== dbId)
                    ids.push(oauthId);
            }
            return ids;
        },
        registerUserSocket: async (socket) => {
            var _a, _b;
            const user = await (0, user_service_1.markUserOnline)(socket.userId);
            const dbId = ((_b = (_a = user === null || user === void 0 ? void 0 : user._id) === null || _a === void 0 ? void 0 : _a.toString) === null || _b === void 0 ? void 0 : _b.call(_a)) || socket.userId;
            const oauthId = (user === null || user === void 0 ? void 0 : user.id) || socket.oauthId;
            socket.userId = dbId;
            socket.oauthId = oauthId;
            addSocketForUser(userSockets, dbId, socket.id);
            socket.join(`user:${dbId}`);
            if (oauthId && oauthId !== dbId) {
                addSocketForUser(userSockets, oauthId, socket.id);
                userIdMapping.set(dbId, oauthId);
                socket.join(`user:${oauthId}`);
            }
            io.emit("user_status", { userId: dbId, status: "online", lastSeen: null });
            if (oauthId && oauthId !== dbId) {
                io.emit("user_status", { userId: oauthId, status: "online", lastSeen: null });
            }
            socket.emit("initial_online_users", context.getOnlineUserIds());
        },
        unregisterUserSocket: async (socket) => {
            var _a, _b;
            const dbId = socket.userId;
            const oauthId = socket.oauthId;
            removeSocketForUser(userSockets, dbId, socket.id);
            if (oauthId && oauthId !== dbId) {
                removeSocketForUser(userSockets, oauthId, socket.id);
            }
            const stillConnected = hasActiveSocket(userSockets, dbId) || (oauthId ? hasActiveSocket(userSockets, oauthId) : false);
            if (stillConnected)
                return;
            const lastSeen = new Date();
            const user = await (0, user_service_1.markUserOffline)(dbId, lastSeen);
            const normalizedDbId = ((_b = (_a = user === null || user === void 0 ? void 0 : user._id) === null || _a === void 0 ? void 0 : _a.toString) === null || _b === void 0 ? void 0 : _b.call(_a)) || dbId;
            const normalizedOauthId = (user === null || user === void 0 ? void 0 : user.id) || oauthId;
            io.emit("user_status", { userId: normalizedDbId, status: "offline", lastSeen });
            if (normalizedOauthId && normalizedOauthId !== normalizedDbId) {
                io.emit("user_status", { userId: normalizedOauthId, status: "offline", lastSeen });
            }
        },
    };
    io.use(async (socket, next) => {
        try {
            const authUser = await authenticateSocket(socket);
            if (!authUser) {
                return next(new Error("Unauthorized"));
            }
            const authenticatedSocket = socket;
            authenticatedSocket.userId = authUser.id;
            authenticatedSocket.oauthId = authUser.oauthId;
            authenticatedSocket.authUser = authUser;
            return next();
        }
        catch (error) {
            console.error("[Socket] Authentication failed:", error);
            return next(new Error("Unauthorized"));
        }
    });
    io.on("connection", async (socket) => {
        const authenticatedSocket = socket;
        console.log(`[Socket] Connected: ${socket.id} user=${authenticatedSocket.userId}`);
        await context.registerUserSocket(authenticatedSocket);
        (0, user_socket_1.registerUserSocket)(authenticatedSocket, context);
        (0, message_socket_1.registerMessageSocket)(authenticatedSocket, context);
        (0, post_socket_1.registerPostSocket)(authenticatedSocket, context);
        authenticatedSocket.on("error", (error) => {
            console.error(`[Socket] Error for ${authenticatedSocket.id}:`, error);
        });
    });
    console.log("[Socket] Socket.IO server initialized");
    return io;
}
async function authenticateSocket(socket) {
    const secret = process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production-min-32-chars-long";
    const nextAuthToken = await (0, jwt_1.getToken)({
        req: socket.request,
        secret,
    });
    let payload = nextAuthToken;
    if (!payload) {
        const bearerToken = extractBearerToken(socket);
        if (bearerToken) {
            payload = jsonwebtoken_1.default.verify(bearerToken, secret);
        }
    }
    if (!payload)
        return null;
    const tokenUserId = payload.d || payload.id || payload.sub;
    const tokenEmail = payload.e || payload.email;
    let authUser = tokenUserId ? await (0, user_service_1.buildAuthenticatedUser)(tokenUserId) : null;
    if (!authUser && tokenEmail) {
        const user = await (0, user_service_1.findUserByEmailAddress)(tokenEmail);
        if (user === null || user === void 0 ? void 0 : user._id) {
            authUser = await (0, user_service_1.buildAuthenticatedUser)(user._id.toString());
        }
    }
    return authUser;
}
function extractBearerToken(socket) {
    var _a, _b, _c, _d, _e, _f;
    const authToken = (_b = (_a = socket.handshake) === null || _a === void 0 ? void 0 : _a.auth) === null || _b === void 0 ? void 0 : _b.token;
    if (typeof authToken === "string" && authToken.trim())
        return authToken.trim();
    const queryToken = (_d = (_c = socket.handshake) === null || _c === void 0 ? void 0 : _c.query) === null || _d === void 0 ? void 0 : _d.token;
    if (typeof queryToken === "string" && queryToken.trim())
        return queryToken.trim();
    const authorization = (_f = (_e = socket.handshake) === null || _e === void 0 ? void 0 : _e.headers) === null || _f === void 0 ? void 0 : _f.authorization;
    if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
        return authorization.slice("Bearer ".length).trim();
    }
    return null;
}
function addSocketForUser(userSockets, userId, socketId) {
    const socketIds = userSockets.get(userId) || new Set();
    socketIds.add(socketId);
    userSockets.set(userId, socketIds);
}
function removeSocketForUser(userSockets, userId, socketId) {
    const socketIds = userSockets.get(userId);
    if (!socketIds)
        return;
    socketIds.delete(socketId);
    if (socketIds.size === 0) {
        userSockets.delete(userId);
    }
}
function hasActiveSocket(userSockets, userId) {
    var _a;
    return (((_a = userSockets.get(userId)) === null || _a === void 0 ? void 0 : _a.size) || 0) > 0;
}
function getAllowedOrigins() {
    const allowedOrigins = process.env.ALLOWED_ORIGINS;
    if (allowedOrigins) {
        return allowedOrigins.split(",").map((origin) => origin.trim()).filter(Boolean);
    }
    if (process.env.NODE_ENV === "production") {
        return [
            process.env.NEXTAUTH_URL || "",
            process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
            process.env.FRONTEND_URL || "",
        ].filter(Boolean);
    }
    return true;
}
