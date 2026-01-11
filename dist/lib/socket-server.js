"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitToRoom = exports.getSocketInstance = exports.setSocketInstance = void 0;
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
