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

export const emitToRoom = (room: string, event: string, data: any) => {
  const io = getSocketInstance();
  if (io) {
    io.to(room).emit(event, data);
    console.log(`📤 [Socket] Emitted ${event} to room ${room}`);
  } else {
    console.warn(`⚠️ [Socket] Cannot emit ${event} - socket not initialized`);
  }
};




