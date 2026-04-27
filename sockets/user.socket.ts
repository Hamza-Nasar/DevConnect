import { createNotification } from "../services/notification.service";
import type { AuthenticatedSocket, SocketContext } from "./types";

export function registerUserSocket(socket: AuthenticatedSocket, context: SocketContext) {
  socket.emit("health_check", { status: "ok", timestamp: Date.now() });

  socket.on("health_check_response", () => undefined);

  socket.on("ping_heartbeat", () => {
    socket.emit("pong_heartbeat");
  });

  socket.on("join", async () => {
    await context.registerUserSocket(socket);
  });

  socket.on("get_online_users", () => {
    socket.emit("initial_online_users", context.getOnlineUserIds());
  });

  socket.on("call_user", async (data: { userToCall: string; signalData: unknown; name: string; avatar: string; isVideo: boolean }) => {
    await context.emitToUser(data.userToCall, "call_user", {
      signal: data.signalData,
      from: socket.userId,
      name: data.name,
      avatar: data.avatar,
      isVideo: data.isVideo,
    });
  });

  socket.on("answer_call", async (data: { to: string; signal: unknown }) => {
    await context.emitToUser(data.to, "call_accepted", data.signal);
  });

  socket.on("end_call", async (data: { to: string }) => {
    await context.emitToUser(data.to, "call_ended", {});
  });

  socket.on("join_group", (groupId: string) => {
    socket.join(`group:${groupId}`);
  });

  socket.on("leave_group", (groupId: string) => {
    socket.leave(`group:${groupId}`);
  });

  socket.on("share_group", (data: { groupId: string; groupName: string }) => {
    socket.to(`group:${data.groupId}`).emit("group_shared", {
      ...data,
      userId: socket.userId,
    });
  });

  socket.on("report_group", (data: { groupId: string; groupName: string }) => {
    socket.to(`group:${data.groupId}`).emit("group_reported", {
      ...data,
      userId: socket.userId,
    });
  });

  socket.on("avatar_updated", (data: { avatar: string }) => {
    context.io.emit("avatar_changed", {
      userId: socket.userId,
      avatar: data.avatar,
    });
  });

  socket.on("profile_updated", (data: { profile: unknown }) => {
    context.io.emit("profile_changed", {
      userId: socket.userId,
      profile: data.profile,
    });
  });

  socket.on("follow_user", async (data: { followingId: string }) => {
    const notification = await createNotification({
      userId: data.followingId,
      actorId: socket.userId,
      type: "follow",
      title: "New Follower",
      message: "Someone started following you",
      link: `/profile/${socket.userId}`,
    });

    if (notification) {
      context.io.to(`user:${data.followingId}`).emit("notification", {
        userId: data.followingId,
        actorId: socket.userId,
        type: "follow",
        title: "New Follower",
        message: "Someone started following you",
        link: `/profile/${socket.userId}`,
        read: false,
        _id: notification._id.toString(),
        id: notification._id.toString(),
      });
    }

    context.io.to(`user:${data.followingId}`).emit("new_follower", { followerId: socket.userId });
  });

  socket.on("unfollow_user", (data: { followingId: string }) => {
    context.io.to(`user:${data.followingId}`).emit("unfollowed", { followerId: socket.userId });
  });

  socket.on("update_presence", (data: { status: "online" | "away" }) => {
    context.io.emit("user_status", {
      userId: socket.userId,
      status: data.status === "away" ? "away" : "online",
      lastSeen: data.status === "away" ? new Date().toISOString() : null,
    });
  });

  socket.on("disconnect", async () => {
    await context.unregisterUserSocket(socket);
  });
}
