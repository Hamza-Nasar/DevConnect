"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUserSocket = registerUserSocket;
const notification_service_1 = require("../services/notification.service");
function registerUserSocket(socket, context) {
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
    socket.on("call_user", async (data) => {
        await context.emitToUser(data.userToCall, "call_user", {
            signal: data.signalData,
            from: socket.userId,
            name: data.name,
            avatar: data.avatar,
            isVideo: data.isVideo,
        });
    });
    socket.on("answer_call", async (data) => {
        await context.emitToUser(data.to, "call_accepted", data.signal);
    });
    socket.on("end_call", async (data) => {
        await context.emitToUser(data.to, "call_ended", {});
    });
    socket.on("join_group", (groupId) => {
        socket.join(`group:${groupId}`);
    });
    socket.on("leave_group", (groupId) => {
        socket.leave(`group:${groupId}`);
    });
    socket.on("share_group", (data) => {
        socket.to(`group:${data.groupId}`).emit("group_shared", Object.assign(Object.assign({}, data), { userId: socket.userId }));
    });
    socket.on("report_group", (data) => {
        socket.to(`group:${data.groupId}`).emit("group_reported", Object.assign(Object.assign({}, data), { userId: socket.userId }));
    });
    socket.on("avatar_updated", (data) => {
        context.io.emit("avatar_changed", {
            userId: socket.userId,
            avatar: data.avatar,
        });
    });
    socket.on("profile_updated", (data) => {
        context.io.emit("profile_changed", {
            userId: socket.userId,
            profile: data.profile,
        });
    });
    socket.on("follow_user", async (data) => {
        const notification = await (0, notification_service_1.createNotification)({
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
    socket.on("unfollow_user", (data) => {
        context.io.to(`user:${data.followingId}`).emit("unfollowed", { followerId: socket.userId });
    });
    socket.on("update_presence", (data) => {
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
