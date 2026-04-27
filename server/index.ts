import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { getToken } from "next-auth/jwt";
import { setSocketInstance } from "../lib/socket-server";
import { ensureDatabaseIndexes } from "../services/database-index.service";
import {
  buildAuthenticatedUser,
  findUserByEmailAddress,
  getUserIdentityVariants,
  markUserOffline,
  markUserOnline,
} from "../services/user.service";
import { registerMessageSocket } from "../sockets/message.socket";
import { registerPostSocket } from "../sockets/post.socket";
import { registerUserSocket } from "../sockets/user.socket";
import type { AuthenticatedSocket, SocketContext } from "../sockets/types";

interface SocketJwtPayload {
  sub?: string;
  id?: string;
  d?: string;
  email?: string;
  e?: string;
  name?: string;
  n?: string;
  username?: string;
  u?: string;
  role?: string;
  r?: string;
  picture?: string;
  p?: string;
}

export function initializeSocket(server: HTTPServer) {
  void ensureDatabaseIndexes().catch((error) => {
    console.error("[DB] Failed to initialize indexes:", error);
  });

  const io = new SocketIOServer(server, {
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

  setSocketInstance(io);

  const userSockets = new Map<string, Set<string>>();
  const userIdMapping = new Map<string, string>();

  const context: SocketContext = {
    io,
    userSockets,
    userIdMapping,
    emitToUser: async (userId, event, data) => {
      const possibleIds = await getUserIdentityVariants(userId);
      let emitted = 0;

      for (const id of possibleIds) {
        const socketIds = userSockets.get(id);
        if (!socketIds) continue;

        for (const socketId of socketIds) {
          const targetSocket = io.sockets.sockets.get(socketId);
          if (!targetSocket) continue;

          targetSocket.emit(event, data);
          emitted++;
        }
      }

      return emitted;
    },
    getOnlineUserIds: () => {
      const ids: string[] = [];
      for (const dbId of userSockets.keys()) {
        ids.push(dbId);
        const oauthId = userIdMapping.get(dbId);
        if (oauthId && oauthId !== dbId) ids.push(oauthId);
      }
      return ids;
    },
    registerUserSocket: async (socket) => {
      const user = await markUserOnline(socket.userId);
      const dbId = user?._id?.toString?.() || socket.userId;
      const oauthId = user?.id || socket.oauthId;

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
      const dbId = socket.userId;
      const oauthId = socket.oauthId;

      removeSocketForUser(userSockets, dbId, socket.id);
      if (oauthId && oauthId !== dbId) {
        removeSocketForUser(userSockets, oauthId, socket.id);
      }

      const stillConnected =
        hasActiveSocket(userSockets, dbId) || (oauthId ? hasActiveSocket(userSockets, oauthId) : false);

      if (stillConnected) return;

      const lastSeen = new Date();
      const user = await markUserOffline(dbId, lastSeen);
      const normalizedDbId = user?._id?.toString?.() || dbId;
      const normalizedOauthId = user?.id || oauthId;

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

      const authenticatedSocket = socket as AuthenticatedSocket;
      authenticatedSocket.userId = authUser.id;
      authenticatedSocket.oauthId = authUser.oauthId;
      authenticatedSocket.authUser = authUser;

      return next();
    } catch (error) {
      console.error("[Socket] Authentication failed:", error);
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const authenticatedSocket = socket as AuthenticatedSocket;
    console.log(`[Socket] Connected: ${socket.id} user=${authenticatedSocket.userId}`);

    await context.registerUserSocket(authenticatedSocket);
    registerUserSocket(authenticatedSocket, context);
    registerMessageSocket(authenticatedSocket, context);
    registerPostSocket(authenticatedSocket, context);

    authenticatedSocket.on("error", (error) => {
      console.error(`[Socket] Error for ${authenticatedSocket.id}:`, error);
    });
  });

  console.log("[Socket] Socket.IO server initialized");
  return io;
}

async function authenticateSocket(socket: any) {
  const secret = process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production-min-32-chars-long";
  const nextAuthToken = await getToken({
    req: socket.request,
    secret,
  });

  let payload: SocketJwtPayload | null = nextAuthToken as SocketJwtPayload | null;

  if (!payload) {
    const bearerToken = extractBearerToken(socket);
    if (bearerToken) {
      payload = jwt.verify(bearerToken, secret) as SocketJwtPayload;
    }
  }

  if (!payload) return null;

  const tokenUserId = payload.d || payload.id || payload.sub;
  const tokenEmail = payload.e || payload.email;

  let authUser = tokenUserId ? await buildAuthenticatedUser(tokenUserId) : null;
  if (!authUser && tokenEmail) {
    const user = await findUserByEmailAddress(tokenEmail);
    if (user?._id) {
      authUser = await buildAuthenticatedUser(user._id.toString());
    }
  }

  return authUser;
}

function extractBearerToken(socket: any) {
  const authToken = socket.handshake?.auth?.token;
  if (typeof authToken === "string" && authToken.trim()) return authToken.trim();

  const queryToken = socket.handshake?.query?.token;
  if (typeof queryToken === "string" && queryToken.trim()) return queryToken.trim();

  const authorization = socket.handshake?.headers?.authorization;
  if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return null;
}

function addSocketForUser(userSockets: Map<string, Set<string>>, userId: string, socketId: string) {
  const socketIds = userSockets.get(userId) || new Set<string>();
  socketIds.add(socketId);
  userSockets.set(userId, socketIds);
}

function removeSocketForUser(userSockets: Map<string, Set<string>>, userId: string, socketId: string) {
  const socketIds = userSockets.get(userId);
  if (!socketIds) return;

  socketIds.delete(socketId);
  if (socketIds.size === 0) {
    userSockets.delete(userId);
  }
}

function hasActiveSocket(userSockets: Map<string, Set<string>>, userId: string) {
  return (userSockets.get(userId)?.size || 0) > 0;
}

function getAllowedOrigins(): string[] | boolean {
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
