import type { AuthenticatedSocket, SocketContext } from "./types";

export function registerMessageSocket(socket: AuthenticatedSocket, context: SocketContext) {
  socket.on("join_conversation", (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);
  });

  socket.on("leave_conversation", (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`);
  });

  socket.on("send_message", async (data: { message: { id?: string; senderId: string }; receiverId: string }) => {
    const message = {
      ...data.message,
      senderId: socket.userId,
    };

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

  socket.on("message_read", async (data: { messageId: string; senderId: string }) => {
    await context.emitToUser(data.senderId, "message_read", {
      messageId: data.messageId,
      userId: socket.userId,
    });
  });

  socket.on("message_reaction", async (data: { messageId: string; receiverId: string; reactions: unknown[] }) => {
    const payload = { ...data, userId: socket.userId };
    await Promise.all([
      context.emitToUser(data.receiverId, "message_reaction", payload),
      context.emitToUser(socket.userId, "message_reaction", payload),
    ]);
  });

  socket.on("message_edited", async (data: { messageId: string; receiverId: string; content: string; edits: unknown[] }) => {
    const payload = { ...data, userId: socket.userId };
    await Promise.all([
      context.emitToUser(data.receiverId, "message_edited", payload),
      context.emitToUser(socket.userId, "message_edited", payload),
    ]);
  });

  socket.on("message_deleted", async (data: { messageId: string; receiverId: string }) => {
    const payload = { ...data, userId: socket.userId };
    await Promise.all([
      context.emitToUser(data.receiverId, "message_deleted", payload),
      context.emitToUser(socket.userId, "message_deleted", payload),
    ]);
  });

  socket.on("typing", async (data: { userId: string; isTyping: boolean }) => {
    await context.emitToUser(data.userId, "typing", {
      userId: socket.userId,
      isTyping: data.isTyping,
    });
  });
}
