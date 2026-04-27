import type { Server, Socket } from "socket.io";
import type { AuthenticatedUser } from "../services/user.service";

export interface AuthenticatedSocket extends Socket {
  userId: string;
  oauthId?: string;
  authUser: AuthenticatedUser;
}

export interface SocketContext {
  io: Server;
  userSockets: Map<string, Set<string>>;
  userIdMapping: Map<string, string>;
  emitToUser: (userId: string, event: string, data: unknown) => Promise<number>;
  getOnlineUserIds: () => string[];
  registerUserSocket: (socket: AuthenticatedSocket) => Promise<void>;
  unregisterUserSocket: (socket: AuthenticatedSocket) => Promise<void>;
}
