import { COLLECTIONS, toObjectId, toStringId } from "../lib/db";
import { getCollection } from "../lib/mongodb";
import { createNotification } from "../services/notification.service";
import type { AuthenticatedSocket, SocketContext } from "./types";

export function registerPostSocket(socket: AuthenticatedSocket, context: SocketContext) {
  socket.on("join_post", (postId: string) => {
    socket.join(`post:${postId}`);
  });

  socket.on("leave_post", (postId: string) => {
    socket.leave(`post:${postId}`);
  });

  socket.on("post_view", (data: { postId: string; viewsCount: number }) => {
    context.io.to(`post:${data.postId}`).emit("views_updated", {
      postId: data.postId,
      viewsCount: data.viewsCount,
    });
  });

  socket.on("new_post", async (data: { postId: string }) => {
    const postsCollection = await getCollection(COLLECTIONS.POSTS);
    const usersCollection = await getCollection(COLLECTIONS.USERS);
    const followsCollection = await getCollection(COLLECTIONS.FOLLOWS);
    const postId = toObjectId(data.postId);
    if (!postId) return;

    const post = await postsCollection.findOne({ _id: postId });
    if (!post) return;

    const user = await usersCollection.findOne({ _id: toObjectId(socket.userId) as any });
    const followers = await followsCollection.find({ followingId: socket.userId }).toArray();
    const postData = {
      ...post,
      id: toStringId(post._id),
      user: {
        id: toStringId(user?._id),
        name: user?.name || null,
        username: user?.username || null,
        avatar: user?.avatar || user?.image || null,
        image: user?.image || user?.avatar || null,
        verified: user?.verified || false,
      },
      likesCount: post.likesCount || 0,
      commentsCount: post.commentsCount || 0,
      sharesCount: post.sharesCount || 0,
      viewsCount: post.viewsCount || 0,
      bookmarksCount: post.bookmarksCount || 0,
    };

    context.io.emit("new_post", postData);
    followers.forEach((follow) => context.io.to(`user:${follow.followerId}`).emit("new_post", postData));
    context.io.to(`user:${socket.userId}`).emit("post_created", postData);
  });

  socket.on("new_comment", async (data: { commentId: string; postId: string }) => {
    const commentsCollection = await getCollection(COLLECTIONS.COMMENTS);
    const postsCollection = await getCollection(COLLECTIONS.POSTS);
    const usersCollection = await getCollection(COLLECTIONS.USERS);
    const commentId = toObjectId(data.commentId);
    const postId = toObjectId(data.postId);
    if (!commentId || !postId) return;

    const [comment, post, user] = await Promise.all([
      commentsCollection.findOne({ _id: commentId }),
      postsCollection.findOne({ _id: postId }),
      usersCollection.findOne({ _id: toObjectId(socket.userId) as any }),
    ]);
    if (!comment) return;

    const commentData = {
      ...comment,
      id: toStringId(comment._id),
      user: {
        id: toStringId(user?._id),
        name: user?.name || null,
        username: user?.username || null,
        avatar: user?.avatar || null,
        image: user?.image || user?.avatar || null,
      },
    };

    if (post && post.userId !== socket.userId) {
      context.io.to(`user:${post.userId}`).emit("new_comment", commentData);
      const notification = await createNotification({
        userId: post.userId,
        actorId: socket.userId,
        type: "comment",
        title: "New Comment",
        message: `${user?.name || "Someone"} commented on your post`,
        link: `/feed?post=${data.postId}`,
      });

      if (notification) {
        context.io.to(`user:${post.userId}`).emit("notification", {
          userId: post.userId,
          actorId: socket.userId,
          type: "comment",
          title: "New Comment",
          message: `${user?.name || "Someone"} commented on your post`,
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
      commentsCount: updatedPost?.commentsCount || 0,
      comment: commentData,
    });
  });

  socket.on("delete_comment", async (data: { postId: string; commentId: string }) => {
    const postsCollection = await getCollection(COLLECTIONS.POSTS);
    const commentsCollection = await getCollection(COLLECTIONS.COMMENTS);
    const postId = toObjectId(data.postId);
    const commentId = toObjectId(data.commentId);
    if (!postId || !commentId) return;

    await commentsCollection.deleteOne({ _id: commentId });
    await postsCollection.updateOne({ _id: postId }, { $inc: { commentsCount: -1 } });
    const updatedPost = await postsCollection.findOne({ _id: postId });

    context.io.to(`post:${data.postId}`).emit("comment_deleted", {
      postId: data.postId,
      commentId: data.commentId,
      commentsCount: updatedPost?.commentsCount || 0,
    });
  });

  socket.on("like_post", async (data: { postId: string; liked: boolean }) => {
    const postsCollection = await getCollection(COLLECTIONS.POSTS);
    const postId = toObjectId(data.postId);
    if (!postId) return;

    const post = await postsCollection.findOne({ _id: postId });
    if (post && data.liked && post.userId !== socket.userId) {
      const notification = await createNotification({
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
      likesCount: updatedPost?.likesCount || 0,
    });
  });

  socket.on("share_post", async (data: { postId: string }) => {
    const postsCollection = await getCollection(COLLECTIONS.POSTS);
    const postId = toObjectId(data.postId);
    if (!postId) return;

    const post = await postsCollection.findOne({ _id: postId });
    if (post && post.userId !== socket.userId) {
      const notification = await createNotification({
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
      sharesCount: updatedPost?.sharesCount || 0,
    });
  });

  socket.on("bookmark_post", async (data: { postId: string; bookmarked: boolean }) => {
    const postsCollection = await getCollection(COLLECTIONS.POSTS);
    const bookmarksCollection = await getCollection(COLLECTIONS.BOOKMARKS);
    const postId = toObjectId(data.postId);
    if (!postId) return;

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

function registerStreamSocket(socket: AuthenticatedSocket, context: SocketContext) {
  socket.on("join_stream", ({ streamId, isHost }: { streamId: string; isHost: boolean }) => {
    const room = `stream:${streamId}`;
    socket.join(room);
    if (!isHost) {
      context.io.to(room).emit("viewer_count", context.io.sockets.adapter.rooms.get(room)?.size || 0);
    }
  });

  socket.on("leave_stream", ({ streamId }: { streamId: string }) => {
    const room = `stream:${streamId}`;
    socket.leave(room);
    context.io.to(room).emit("viewer_count", context.io.sockets.adapter.rooms.get(room)?.size || 0);
  });

  socket.on("offer", ({ streamId, offer }: { streamId: string; offer: RTCSessionDescriptionInit }) => {
    socket.to(`stream:${streamId}`).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ streamId, answer }: { streamId: string; answer: RTCSessionDescriptionInit }) => {
    socket.to(`stream:${streamId}`).emit("answer", { answer });
  });

  socket.on("ice-candidate", ({ streamId, candidate }: { streamId: string; candidate: RTCIceCandidateInit }) => {
    socket.to(`stream:${streamId}`).emit("ice-candidate", { candidate });
  });

  socket.on("stream_like", ({ streamId }: { streamId: string }) => {
    context.io.to(`stream:${streamId}`).emit("stream_like");
  });

  socket.on("stream_comment", ({ streamId, user, message }: { streamId: string; user: string; message: string }) => {
    context.io.to(`stream:${streamId}`).emit("stream_comment", { user, message });
  });
}
