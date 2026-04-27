"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMessageSocket = registerMessageSocket;
function registerMessageSocket(socket, context) {
    socket.on("join_conversation", (conversationId) => {
        socket.join(`conversation:${conversationId}`);
    });
    socket.on("leave_conversation", (conversationId) => {
        socket.leave(`conversation:${conversationId}`);
    });
    socket.on("send_message", async (data) => {
        const message = Object.assign(Object.assign({}, data.message), { senderId: socket.userId });
        await Promise.all([
            context.emitToUser(data.receiverId, "new_message", message),
            context.emitToUser(socket.userId, "new_message", message),
        ]);
        if (message.id) {
            await context.emitToUser(socket.userId, "message_delivered", {
                messageId: message.id,
                userId: data.receiverId,
                deliveredAt: new Date(),
            });
        }
    });
    socket.on("message_read", async (data) => {
        await context.emitToUser(data.senderId, "message_read", {
            messageId: data.messageId,
            userId: socket.userId,
        });
    });
    socket.on("message_reaction", async (data) => {
        const payload = Object.assign(Object.assign({}, data), { userId: socket.userId });
        await Promise.all([
            context.emitToUser(data.receiverId, "message_reaction", payload),
            context.emitToUser(socket.userId, "message_reaction", payload),
        ]);
    });
    socket.on("message_edited", async (data) => {
        const payload = Object.assign(Object.assign({}, data), { userId: socket.userId });
        await Promise.all([
            context.emitToUser(data.receiverId, "message_edited", payload),
            context.emitToUser(socket.userId, "message_edited", payload),
        ]);
    });
    socket.on("message_deleted", async (data) => {
        const payload = Object.assign(Object.assign({}, data), { userId: socket.userId });
        await Promise.all([
            context.emitToUser(data.receiverId, "message_deleted", payload),
            context.emitToUser(socket.userId, "message_deleted", payload),
        ]);
    });
    socket.on("typing", async (data) => {
        await context.emitToUser(data.userId, "typing", {
            userId: socket.userId,
            isTyping: data.isTyping,
        });
    });
}
