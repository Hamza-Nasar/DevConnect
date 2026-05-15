import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { decode, getToken } from "next-auth/jwt";
import { setSocketInstance } from "../lib/socket-server";
import { getCollection } from "../lib/mongodb";
import { COLLECTIONS } from "../lib/db";
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
  startNeedHelpAutoBump(io);

  const userSockets = new Map<string, Set<string>>();
  const userIdMapping = new Map<string, string>();
  const socketPresence = new Map<string, "online" | "away" | "busy">();

  const resolvePresence = (userId: string, oauthId?: string): "online" | "away" | "busy" => {
    const socketIds = new Set<string>([...(userSockets.get(userId) || [])]);
    if (oauthId && oauthId !== userId) {
      for (const socketId of userSockets.get(oauthId) || []) socketIds.add(socketId);
    }

    let hasAway = false;
    let hasBusy = false;
    for (const socketId of socketIds) {
      const status = socketPresence.get(socketId) || "online";
      if (status === "online") return "online";
      if (status === "busy") hasBusy = true;
      if (status === "away") hasAway = true;
    }

    if (hasBusy) return "busy";
    if (hasAway) return "away";
    return "online";
  };

  const emitPresence = (userId: string, oauthId?: string, lastSeen: string | null = null) => {
    const status = resolvePresence(userId, oauthId);
    io.emit("user_status", {
      userId,
      status,
      lastSeen: status === "away" ? lastSeen || new Date().toISOString() : null,
    });

    if (oauthId && oauthId !== userId) {
      io.emit("user_status", {
        userId: oauthId,
        status,
        lastSeen: status === "away" ? lastSeen || new Date().toISOString() : null,
      });
    }
  };

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
    updateUserPresence: (socket, status) => {
      socketPresence.set(socket.id, status);
      emitPresence(socket.userId, socket.oauthId);
    },
    registerUserSocket: async (socket) => {
      const user = await markUserOnline(socket.userId);
      const dbId = user?._id?.toString?.() || socket.userId;
      const oauthId = user?.id || socket.oauthId;

      socket.userId = dbId;
      socket.oauthId = oauthId;
      socketPresence.set(socket.id, "online");

      addSocketForUser(userSockets, dbId, socket.id);
      socket.join(`user:${dbId}`);

      if (oauthId && oauthId !== dbId) {
        addSocketForUser(userSockets, oauthId, socket.id);
        userIdMapping.set(dbId, oauthId);
        socket.join(`user:${oauthId}`);
      }

      emitPresence(dbId, oauthId);

      socket.emit("initial_online_users", context.getOnlineUserIds());
    },
    unregisterUserSocket: async (socket) => {
      const dbId = socket.userId;
      const oauthId = socket.oauthId;
      socketPresence.delete(socket.id);

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
      payload = await parseSocketToken(bearerToken, secret);
    }
  }

  // Fallback for Socket.IO handshakes where next-auth helpers cannot read token.
  if (!payload) {
    const cookieToken = extractSessionTokenFromCookies(socket);
    if (cookieToken) {
      payload = await parseSocketToken(cookieToken, secret);
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

let needHelpBumpTimer: NodeJS.Timeout | null = null;

function startNeedHelpAutoBump(io: SocketIOServer) {
  if (needHelpBumpTimer) return;

  needHelpBumpTimer = setInterval(async () => {
    try {
      const postsCollection = await getCollection(COLLECTIONS.POSTS);
      const threshold = new Date(Date.now() - 30 * 60 * 1000);
      const nowIso = new Date().toISOString();

      const result = await postsCollection.updateMany(
        {
          postType: "need_help",
          createdAt: { $lt: threshold },
          $and: [
            { $or: [{ "helpContext.status": "open" }, { "helpContext.status": { $exists: false } }] },
            {
              $or: [
                { "helpContext.lastBumpedAt": { $exists: false } },
                { "helpContext.lastBumpedAt": { $lt: threshold.toISOString() } },
              ],
            },
          ],
        },
        {
          $set: {
            "helpContext.lastBumpedAt": nowIso,
            updatedAt: new Date(),
          },
        }
      );

      if (result.modifiedCount > 0) {
        io.emit("need_help_bumped", { bumped: result.modifiedCount, at: nowIso });
      }
    } catch (error) {
      console.error("[NeedHelp] auto-bump failed:", error);
    }
  }, 5 * 60 * 1000);
}

function extractSessionTokenFromCookies(socket: any) {
  const cookieHeader = socket?.handshake?.headers?.cookie;
  if (!cookieHeader || typeof cookieHeader !== "string") return null;

  const cookieMap = new Map<string, string>();
  cookieHeader.split(";").forEach((entry: string) => {
    const trimmed = entry.trim();
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) return;
    const key = trimmed.slice(0, separatorIndex);
    const value = trimmed.slice(separatorIndex + 1);
    cookieMap.set(key, decodeURIComponent(value));
  });

  const baseNames = ["next-auth.session-token", "__Secure-next-auth.session-token"];
  for (const baseName of baseNames) {
    const direct = cookieMap.get(baseName);
    if (direct) return direct;

    const chunks = Array.from(cookieMap.entries())
      .filter(([key]) => key.startsWith(`${baseName}.`))
      .sort((a, b) => {
        const aIndex = Number(a[0].split(".").pop() || "0");
        const bIndex = Number(b[0].split(".").pop() || "0");
        return aIndex - bIndex;
      })
      .map(([, value]) => value);

    if (chunks.length > 0) return chunks.join("");
  }

  return null;
}

async function parseSocketToken(token: string, secret: string): Promise<SocketJwtPayload | null> {
  try {
    return jwt.verify(token, secret) as SocketJwtPayload;
  } catch {
    try {
      const decoded = await decode({ token, secret });
      return (decoded as SocketJwtPayload) || null;
    } catch {
      return null;
    }
  }
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
