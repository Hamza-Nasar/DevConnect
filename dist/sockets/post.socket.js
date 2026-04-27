"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPostSocket = registerPostSocket;
const db_1 = require("../lib/db");
const mongodb_1 = require("../lib/mongodb");
const notification_service_1 = require("../services/notification.service");
function registerPostSocket(socket, context) {
    socket.on("join_post", (postId) => {
        socket.join(`post:${postId}`);
    });
    socket.on("leave_post", (postId) => {
        socket.leave(`post:${postId}`);
    });
    socket.on("post_view", (data) => {
        context.io.to(`post:${data.postId}`).emit("views_updated", {
            postId: data.postId,
            viewsCount: data.viewsCount,
        });
    });
    socket.on("new_post", async (data) => {
        const postsCollection = await (0, mongodb_1.getCollection)(db_1.COLLECTIONS.POSTS);
        const usersCollection = await (0, mongodb_1.getCollection)(db_1.COLLECTIONS.USERS);
        const followsCollection = await (0, mongodb_1.getCollection)(db_1.COLLECTIONS.FOLLOWS);
        const postId = (0, db_1.toObjectId)(data.postId);
        if (!postId)
            return;
        const post = await postsCollection.findOne({ _id: postId });
        if (!post)
            return;
        const user = await usersCollection.findOne({ _id: (0, db_1.toObjectId)(socket.userId) });
        const followers = await followsCollection.find({ followingId: socket.userId }).toArray();
        const postData = Object.assign(Object.assign({}, post), { id: (0, db_1.toStringId)(post._id), user: {
                id: (0, db_1.toStringId)(user === null || user === void 0 ? void 0 : user._id),
                name: (user === null || user === void 0 ? void 0 : user.name) || null,
                username: (user === null || user === void 0 ? void 0 : user.username) || null,
                avatar: (user === null || user === void 0 ? void 0 : user.avatar) || (user === null || user === void 0 ? void 0 : user.image) || null,
                image: (user === null || user === void 0 ? void 0 : user.image) || (user === null || user === void 0 ? void 0 : user.avatar) || null,
                verified: (user === null || user === void 0 ? void 0 : user.verified) || false,
            }, likesCount: post.likesCount || 0, commentsCount: post.commentsCount || 0, sharesCount: post.sharesCount || 0, viewsCount: post.viewsCount || 0, bookmarksCount: post.bookmarksCount || 0 });
        context.io.emit("new_post", postData);
        followers.forEach((follow) => context.io.to(`user:${follow.followerId}`).emit("new_post", postData));
        context.io.to(`user:${socket.userId}`).emit("post_created", postData);
    });
    socket.on("new_comment", async (data) => {
        const commentsCollection = await (0, mongodb_1.getCollection)(db_1.COLLECTIONS.COMMENTS);
        const postsCollection = await (0, mongodb_1.getCollection)(db_1.COLLECTIONS.POSTS);
        const usersCollection = await (0, mongodb_1.getCollection)(db_1.COLLECTIONS.USERS);
        const commentId = (0, db_1.toObjectId)(data.commentId);
        const postId = (0, db_1.toObjectId)(data.postId);
        if (!commentId || !postId)
            return;
        const [comment, post, user] = await Promise.all([
            commentsCollection.findOne({ _id: commentId }),
            postsCollection.findOne({ _id: postId }),
            usersCollection.findOne({ _id: (0, db_1.toObjectId)(socket.userId) }),
        ]);
        if (!comment)
            return;
        const commentData = Object.assign(Object.assign({}, comment), { id: (0, db_1.toStringId)(comment._id), user: {
                id: (0, db_1.toStringId)(user === null || user === void 0 ? void 0 : user._id),
                name: (user === null || user === void 0 ? void 0 : user.name) || null,
                username: (user === null || user === void 0 ? void 0 : user.username) || null,
                avatar: (user === null || user === void 0 ? void 0 : user.avatar) || null,
                image: (user === null || user === void 0 ? void 0 : user.image) || (user === null || user === void 0 ? void 0 : user.avatar) || null,
            } });
        if (post && post.userId !== socket.userId) {
            context.io.to(`user:${post.userId}`).emit("new_comment", commentData);
            const notification = await (0, notification_service_1.createNotification)({
                userId: post.userId,
                actorId: socket.userId,
                type: "comment",
                title: "New Comment",
                message: `${(user === null || user === void 0 ? void 0 : user.name) || "Someone"} commented on your post`,
                link: `/feed?post=${data.postId}`,
            });
            if (notification) {
                context.io.to(`user:${post.userId}`).emit("notification", {
                    userId: post.userId,
                    actorId: socket.userId,
                    type: "comment",
                    title: "New Comment",
                    message: `${(user === null || user === void 0 ? void 0 : user.name) || "Someone"} commented on your post`,
                    link: `/feed?post=${data.postId}`,
                    read: false,
                    _id: notification._id.toString(),
                    id: notification._id.toString(),
                });
            }
        }
        const updatedPost = await postsCollection.findOne({ _id: postId });
        context.io.to(`post:${data.postId}`).emit("comment_added", {
            postId: data.postId,
            commentsCount: (updatedPost === null || updatedPost === void 0 ? void 0 : updatedPost.commentsCount) || 0,
            comment: commentData,
        });
    });
    socket.on("delete_comment", async (data) => {
        const postsCollection = await (0, mongodb_1.getCollection)(db_1.COLLECTIONS.POSTS);
        const commentsCollection = await (0, mongodb_1.getCollection)(db_1.COLLECTIONS.COMMENTS);
        const postId = (0, db_1.toObjectId)(data.postId);
        const commentId = (0, db_1.toObjectId)(data.commentId);
        if (!postId || !commentId)
            return;
        await commentsCollection.deleteOne({ _id: commentId });
        await postsCollection.updateOne({ _id: postId }, { $inc: { commentsCount: -1 } });
        const updatedPost = await postsCollection.findOne({ _id: postId });
        context.io.to(`post:${data.postId}`).emit("comment_deleted", {
            postId: data.postId,
            commentId: data.commentId,
            commentsCount: (updatedPost === null || updatedPost === void 0 ? void 0 : updatedPost.commentsCount) || 0,
        });
    });
    socket.on("like_post", async (data) => {
        const postsCollection = await (0, mongodb_1.getCollection)(db_1.COLLECTIONS.POSTS);
        const postId = (0, db_1.toObjectId)(data.postId);
        if (!postId)
            return;
        const post = await postsCollection.findOne({ _id: postId });
        if (post && data.liked && post.userId !== socket.userId) {
            const notification = await (0, notification_service_1.createNotification)({
                userId: post.userId,
                actorId: socket.userId,
                type: "like",
                title: "New Like",
                message: "Someone liked your post",
                link: `/feed?post=${data.postId}`,
            });
            if (notification) {
                context.io.to(`user:${post.userId}`).emit("notification", {
                    userId: post.userId,
                    actorId: socket.userId,
                    type: "like",
                    title: "New Like",
                    message: "Someone liked your post",
                    link: `/feed?post=${data.postId}`,
                    read: false,
                    _id: notification._id.toString(),
                    id: notification._id.toString(),
                });
            }
            context.io.to(`user:${post.userId}`).emit("post_liked", {
                postId: data.postId,
                liked: data.liked,
            });
        }
        const updatedPost = await postsCollection.findOne({ _id: postId });
        context.io.to(`post:${data.postId}`).emit("like_updated", {
            postId: data.postId,
            liked: data.liked,
            userId: socket.userId,
            likesCount: (updatedPost === null || updatedPost === void 0 ? void 0 : updatedPost.likesCount) || 0,
        });
    });
    socket.on("share_post", async (data) => {
        const postsCollection = await (0, mongodb_1.getCollection)(db_1.COLLECTIONS.POSTS);
        const postId = (0, db_1.toObjectId)(data.postId);
        if (!postId)
            return;
        const post = await postsCollection.findOne({ _id: postId });
        if (post && post.userId !== socket.userId) {
            const notification = await (0, notification_service_1.createNotification)({
                userId: post.userId,
                actorId: socket.userId,
                type: "share",
                title: "Post Shared",
                message: "Someone shared your post",
                link: `/feed?post=${data.postId}`,
            });
            if (notification) {
                context.io.to(`user:${post.userId}`).emit("notification", {
                    userId: post.userId,
                    actorId: socket.userId,
                    type: "share",
                    title: "Post Shared",
                    message: "Someone shared your post",
                    link: `/feed?post=${data.postId}`,
                    read: false,
                    _id: notification._id.toString(),
                    id: notification._id.toString(),
                });
            }
            context.io.to(`user:${post.userId}`).emit("post_shared", { postId: data.postId });
        }
        const updatedPost = await postsCollection.findOne({ _id: postId });
        context.io.to(`post:${data.postId}`).emit("share_updated", {
            postId: data.postId,
            sharesCount: (updatedPost === null || updatedPost === void 0 ? void 0 : updatedPost.sharesCount) || 0,
        });
    });
    socket.on("bookmark_post", async (data) => {
        const postsCollection = await (0, mongodb_1.getCollection)(db_1.COLLECTIONS.POSTS);
        const bookmarksCollection = await (0, mongodb_1.getCollection)(db_1.COLLECTIONS.BOOKMARKS);
        const postId = (0, db_1.toObjectId)(data.postId);
        if (!postId)
            return;
        const bookmarksCount = await bookmarksCollection.countDocuments({ postId: data.postId });
        await postsCollection.updateOne({ _id: postId }, { $set: { bookmarksCount } });
        context.io.to(`post:${data.postId}`).emit("bookmark_updated", {
            postId: data.postId,
            userId: socket.userId,
            bookmarked: data.bookmarked,
            bookmarksCount,
        });
    });
    registerStreamSocket(socket, context);
}
function registerStreamSocket(socket, context) {
    socket.on("join_stream", ({ streamId, isHost }) => {
        var _a;
        const room = `stream:${streamId}`;
        socket.join(room);
        if (!isHost) {
            context.io.to(room).emit("viewer_count", ((_a = context.io.sockets.adapter.rooms.get(room)) === null || _a === void 0 ? void 0 : _a.size) || 0);
        }
    });
    socket.on("leave_stream", ({ streamId }) => {
        var _a;
        const room = `stream:${streamId}`;
        socket.leave(room);
        context.io.to(room).emit("viewer_count", ((_a = context.io.sockets.adapter.rooms.get(room)) === null || _a === void 0 ? void 0 : _a.size) || 0);
    });
    socket.on("offer", ({ streamId, offer }) => {
        socket.to(`stream:${streamId}`).emit("offer", { offer, from: socket.id });
    });
    socket.on("answer", ({ streamId, answer }) => {
        socket.to(`stream:${streamId}`).emit("answer", { answer });
    });
    socket.on("ice-candidate", ({ streamId, candidate }) => {
        socket.to(`stream:${streamId}`).emit("ice-candidate", { candidate });
    });
    socket.on("stream_like", ({ streamId }) => {
        context.io.to(`stream:${streamId}`).emit("stream_like");
    });
    socket.on("stream_comment", ({ streamId, user, message }) => {
        context.io.to(`stream:${streamId}`).emit("stream_comment", { user, message });
    });
}
