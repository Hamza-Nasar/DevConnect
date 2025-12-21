import { Server as SocketIOServer } from "socket.io";

// Use global to share across Next.js and custom server contexts
declare global {
  var _ioInstance: SocketIOServer | undefined;
}

export const setSocketInstance = (io: SocketIOServer) => {
  global._ioInstance = io;
};

export const getSocketInstance = (): SocketIOServer | null => {
  return global._ioInstance || null;
};




