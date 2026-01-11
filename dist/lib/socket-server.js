"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSocketHealth = exports.emitToRoom = exports.getSocketInstance = exports.setSocketInstance = void 0;
const setSocketInstance = (io) => {
    global._ioInstance = io;
};
exports.setSocketInstance = setSocketInstance;
const getSocketInstance = () => {
    return global._ioInstance || null;
};
exports.getSocketInstance = getSocketInstance;
const emitToRoom = (room, event, data) => {
    const io = (0, exports.getSocketInstance)();
    if (io) {
        io.to(room).emit(event, data);
        console.log(`📤 [Socket] Emitted ${event} to room ${room}`);
    }
    else {
        console.warn(`⚠️ [Socket] Cannot emit ${event} - socket not initialized`);
    }
};
exports.emitToRoom = emitToRoom;
const getSocketHealth = () => {
    const io = (0, exports.getSocketInstance)();
    if (!io) {
        return {
            status: "disconnected",
            connections: 0,
            rooms: 0,
            uptime: 0,
        };
    }
    return {
        status: "connected",
        connections: io.sockets.sockets.size,
        rooms: io.sockets.adapter.rooms.size,
        uptime: process.uptime(),
    };
};
exports.getSocketHealth = getSocketHealth;
