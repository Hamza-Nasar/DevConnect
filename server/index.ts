import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";

interface CustomSocket extends Socket {
  userId?: string;
  oauthId?: string;
}
import { getCollection } from "../lib/mongodb";
import { toObjectId, toStringId, COLLECTIONS } from "../lib/db";
import { setSocketInstance } from "../lib/socket-server";
import { createNotification } from "../lib/db";

export function initializeSocket(server: HTTPServer) {
  // Get allowed origins from environment or use default
  const getAllowedOrigins = (): string[] | boolean => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS;

    if (allowedOrigins) {
      // Split by comma and trim
      return allowedOrigins.split(',').map(origin => origin.trim());
    }

    // In production, allow common origins
    if (process.env.NODE_ENV === 'production') {
      return [
        process.env.NEXTAUTH_URL || '',
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
        process.env.FRONTEND_URL || '',
      ].filter(Boolean);
    }

    // In development, allow all origins
    return true;
  };

  const io = new SocketIOServer(server, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    },
    path: "/socket.io-custom",
    addTrailingSlash: true,
    transports: ["websocket", "polling"], // WebSocket first for better performance
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Make socket instance globally accessible
  setSocketInstance(io);

  // Store user socket connections: userId -> Set of socketIds
  const userSockets = new Map<string, Set<string>>();

  // Track OAuth ID for each MongoDB ID (dbId -> oauthId)
  const userIdMapping = new Map<string, string>();

  // Helper: resolve a userId to all possible room names (handles ID mismatch between OAuth/DB)
  const getUserRooms = async (userId: string): Promise<string[]> => {
    const rooms = new Set<string>();
    rooms.add(`user:${userId}`);

    console.log(`🔎 [Server] getUserRooms called for: ${userId}`);

    try {
      const usersCollection = await getCollection(COLLECTIONS.USERS);
      const userIdObj = toObjectId(userId);

      console.log(`🔎 [Server] Converted to ObjectId: ${userIdObj ? 'yes' : 'no (using string lookup)'}`);

      const user = userIdObj
        ? await usersCollection.findOne({ _id: userIdObj })
        : await usersCollection.findOne({ id: userId });

      if (user) {
        const dbId = user._id.toString();
        const oauthId = user.id;
        rooms.add(`user:${dbId}`);
        if (oauthId) rooms.add(`user:${oauthId}`);
        console.log(`✅ [Server] getUserRooms found user: DB=${dbId}, OAuth=${oauthId}`);
      } else {
        console.log(`⚠️ [Server] getUserRooms: User NOT found in DB for ${userId}`);
      }
    } catch (error) {
      console.error(`❌ [Server] getUserRooms error for ${userId}:`, error);
    }

    console.log(`📋 [Server] getUserRooms returning ${rooms.size} rooms: ${Array.from(rooms).join(", ")}`);
    return Array.from(rooms);
  };

  // Helper: emit event directly to all socket IDs for a user (bypasses room routing)
  const emitToUser = async (userId: string, event: string, data: any) => {
    console.log(`📤 [Server] emitToUser: ${event} to ${userId}`);

    // Try to resolve to MongoDB _id first
    const usersCollection = await getCollection(COLLECTIONS.USERS);
    const userIdObj = toObjectId(userId);

    const user = userIdObj
      ? await usersCollection.findOne({ _id: userIdObj })
      : await usersCollection.findOne({ id: userId });

    const possibleDbIds: string[] = [userId];
    if (user) {
      const dbId = user._id.toString();
      const oauthId = user.id;
      if (dbId && !possibleDbIds.includes(dbId)) possibleDbIds.push(dbId);
      if (oauthId && !possibleDbIds.includes(oauthId)) possibleDbIds.push(oauthId);
    }

    let emitted = 0;
    for (const id of possibleDbIds) {
      const socketIds = userSockets.get(id);
      if (socketIds) {
        for (const socketId of socketIds) {
          const targetSocket = io.sockets.sockets.get(socketId);
          if (targetSocket) {
            targetSocket.emit(event, data);
            emitted++;
            console.log(`📤 [Server] Emitted ${event} to socket ${socketId} (user: ${id})`);
          }
        }
      }
    }

    console.log(`📤 [Server] emitToUser: sent to ${emitted} sockets for user ${userId}`);
    return emitted;
  };

  console.log("🚀 Socket.IO Server Initialized");

  io.on("connection", (socket: CustomSocket) => {
    console.log(`🔌 [Server] New connection: ${socket.id}`);

    socket.on("ping_heartbeat", () => {
      socket.emit("pong_heartbeat");
    });

    socket.on("join", async (userId: string) => {
      if (!userId) return;

      try {
        const usersCollection = await getCollection(COLLECTIONS.USERS);
        const userIdObj = toObjectId(userId);

        // Find user by either ID
        const user = userIdObj
          ? await usersCollection.findOne({ _id: userIdObj })
          : await usersCollection.findOne({ id: userId });

        if (user) {
          const dbId = user._id.toString();
          const oauthId = user.id;

          // Normalize socket session ID to MongoDB _id
          socket.userId = dbId;
          socket.oauthId = oauthId;

          // Store socket under BOTH IDs for reliable lookup
          if (!userSockets.has(dbId)) {
            userSockets.set(dbId, new Set());
          }
          userSockets.get(dbId)!.add(socket.id);
          
          // ALSO store under OAuth ID if different
          if (oauthId && oauthId !== dbId) {
            if (!userSockets.has(oauthId)) {
              userSockets.set(oauthId, new Set());
            }
            userSockets.get(oauthId)!.add(socket.id);
          }

          // Track the ID mapping so we can return both variants to clients
          if (oauthId) {
            userIdMapping.set(dbId, oauthId);
          }

          // Join primary rooms for all variations
          socket.join(`user:${dbId}`);
          if (oauthId && oauthId !== dbId) {
            socket.join(`user:${oauthId}`);
          }

          // Also join specific user ID passed to be safe
          if (userId !== dbId && userId !== oauthId) {
            socket.join(`user:${userId}`);
          }

          console.log(`👤 [Server] User ${userId} (DB: ${dbId}, OAuth: ${oauthId}) joined rooms. Total sockets: ${userSockets.get(dbId)!.size}`);

          // Mark online in DB if it was offline
          if (!user.isOnline) {
            await usersCollection.updateOne(
              { _id: user._id },
              { $set: { isOnline: true, lastSeen: new Date() } }
            );
          }

          // Broadcast status for BOTH IDs
          io.emit("user_status", { userId: dbId, status: "online", lastSeen: null });
          if (oauthId && oauthId !== dbId) {
            io.emit("user_status", { userId: oauthId, status: "online", lastSeen: null });
          }

          // Send list of CURRENT online users to the joining user (include both ID variants)
          const onlineIds: string[] = [];
          for (const dbId of userSockets.keys()) {
            onlineIds.push(dbId);
            const oauthId = userIdMapping.get(dbId);
            if (oauthId && oauthId !== dbId) onlineIds.push(oauthId);
          }
          socket.emit("initial_online_users", onlineIds);

        } else {
          // Fallback if user not found in DB yet (rare but possible during first login)
          socket.userId = userId;
          socket.join(`user:${userId}`);
          if (!userSockets.has(userId)) {
            userSockets.set(userId, new Set());
          }
          userSockets.get(userId)!.add(socket.id);

          console.log(`👤 [Server] User ${userId} (Not in DB yet) joined rooms.`);

          await usersCollection.updateOne(
            { _id: (userIdObj || userId) as unknown as any }, // Maintaining any here as it's the safest way to mix string/ObjectId for MongoDB Filter
            { $set: { isOnline: true, lastSeen: new Date() } },
            { upsert: false }
          );
          io.emit("user_status", { userId, status: "online", lastSeen: null });

          // Send list of CURRENT online users to the joining user (include both ID variants)
          const onlineIdsForFallback: string[] = [];
          for (const dbId of userSockets.keys()) {
            onlineIdsForFallback.push(dbId);
            const mappedOauthId = userIdMapping.get(dbId);
            if (mappedOauthId && mappedOauthId !== dbId) onlineIdsForFallback.push(mappedOauthId);
          }
          socket.emit("initial_online_users", onlineIdsForFallback);
        }
      } catch (error) {
        console.error(`❌ [Server] Join error for ${userId}:`, error);
      }
    });

    socket.on("get_online_users", () => {
      // Return both ID variants so clients can match users regardless of ID format
      const onlineIds: string[] = [];
      for (const dbId of userSockets.keys()) {
        onlineIds.push(dbId);
        const oauthId = userIdMapping.get(dbId);
        if (oauthId && oauthId !== dbId) onlineIds.push(oauthId);
      }
      console.log(`👥 [Server] Sending online users to ${socket.id}: ${onlineIds.length} IDs`);
      socket.emit("initial_online_users", onlineIds);
    });

    // Video/Voice Call Signaling - UPDATED to use direct socket emission
    socket.on("call_user", async (data: { userToCall: string; signalData: unknown; from: string; name: string; avatar: string; isVideo: boolean }) => {
      console.log(`📞 [Server] Call: ${data.from} → ${data.userToCall}`);

      const callData = {
        signal: data.signalData,
        from: data.from,
        name: data.name,
        avatar: data.avatar,
        isVideo: data.isVideo
      };

      const count = await emitToUser(data.userToCall, "call_user", callData);
      console.log(`✅ [Server] Call event emitted to ${count} sockets`);
    });

    socket.on("answer_call", async (data: { to: string; signal: unknown }) => {
      console.log(`✅ Call answered, signal sent to ${data.to}`);
      await emitToUser(data.to, "call_accepted", data.signal);
    });

    socket.on("end_call", async (data: { to: string }) => {
      console.log(`📴 Call ended with ${data.to}`);
      await emitToUser(data.to, "call_ended", {});
    });

    // Join post room for real-time updates
    socket.on("join_post", (postId: string) => {
      socket.join(`post:${postId}`);
      console.log(`📝 Joined post room: ${postId}`);
    });

    // Leave post room
    socket.on("leave_post", (postId: string) => {
      socket.leave(`post:${postId}`);
    });

    // Handle post view - broadcast to all users viewing this post
    socket.on("post_view", (data: { postId: string; viewsCount: number }) => {
      io.to(`post:${data.postId}`).emit("views_updated", {
        postId: data.postId,
        viewsCount: data.viewsCount,
      });
    });

    // Join conversation room
    socket.on("join_conversation", (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`💬 Joined conversation: ${conversationId}`);
    });

    // Leave conversation room
    socket.on("leave_conversation", (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // WebRTC Live Streaming Events
    socket.on("join_stream", ({ streamId, isHost }: { streamId: string; isHost: boolean }) => {
      const room = `stream:${streamId}`;
      socket.join(room);

      if (isHost) {
        console.log(`📹 Host joined stream: ${streamId}`);
      } else {
        console.log(`👁️ Viewer joined stream: ${streamId}`);
        // Notify host about new viewer
        io.to(room).emit("viewer_count", io.sockets.adapter.rooms.get(room)?.size || 0);
      }
    });

    socket.on("leave_stream", ({ streamId }: { streamId: string }) => {
      const room = `stream:${streamId}`;
      socket.leave(room);
      io.to(room).emit("viewer_count", io.sockets.adapter.rooms.get(room)?.size || 0);
    });

    socket.on("offer", ({ streamId, offer }: { streamId: string; offer: RTCSessionDescriptionInit }) => {
      const room = `stream:${streamId}`;
      socket.to(room).emit("offer", { offer, from: socket.id });
    });

    socket.on("answer", ({ streamId, answer }: { streamId: string; answer: RTCSessionDescriptionInit }) => {
      const room = `stream:${streamId}`;
      socket.to(room).emit("answer", { answer });
    });

    socket.on("ice-candidate", ({ streamId, candidate }: { streamId: string; candidate: RTCIceCandidateInit }) => {
      const room = `stream:${streamId}`;
      socket.to(room).emit("ice-candidate", { candidate });
    });

    socket.on("stream_like", ({ streamId }: { streamId: string }) => {
      const room = `stream:${streamId}`;
      io.to(room).emit("stream_like");
    });

    socket.on("stream_comment", ({ streamId, user, message }: { streamId: string; user: string; message: string }) => {
      const room = `stream:${streamId}`;
      io.to(room).emit("stream_comment", { user, message });
    });


    // Handle new post
    socket.on("new_post", async (data: { postId: string; userId: string }) => {
      try {
        const postsCollection = await getCollection(COLLECTIONS.POSTS);
        const usersCollection = await getCollection(COLLECTIONS.USERS);
        const followsCollection = await getCollection(COLLECTIONS.FOLLOWS);

        const postId = toObjectId(data.postId);
        const userId = toObjectId(data.userId);
        if (!postId || !userId) return;

        const post = await postsCollection.findOne({ _id: postId });
        if (post) {
          const user = await usersCollection.findOne({ _id: userId });

          // Get user's followers
          const followers = await followsCollection
            .find({ followingId: data.userId })
            .toArray();

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

          // Broadcast to all users (real-time feed update)
          io.emit("new_post", postData);

          // Notify all followers specifically
          followers.forEach((follow: unknown) => {
            const f = follow as { followerId: string };
            io.to(`user:${f.followerId}`).emit("new_post", postData);
          });

          // Also notify the poster
          io.to(`user:${data.userId}`).emit("post_created", postData);
        }
      } catch (error) {
        console.error("Error handling new_post:", error);
      }
    });

    // Handle new comment
    socket.on("new_comment", async (data: { commentId: string; postId: string; userId: string }) => {
      try {
        const commentsCollection = await getCollection(COLLECTIONS.COMMENTS);
        const postsCollection = await getCollection(COLLECTIONS.POSTS);
        const usersCollection = await getCollection(COLLECTIONS.USERS);
        const notificationsCollection = await getCollection(COLLECTIONS.NOTIFICATIONS);

        const commentId = toObjectId(data.commentId);
        const postId = toObjectId(data.postId);
        const userId = toObjectId(data.userId);
        if (!commentId || !postId || !userId) return;

        const comment = await commentsCollection.findOne({ _id: commentId });
        if (comment) {
          const post = await postsCollection.findOne({ _id: postId });
          const user = await usersCollection.findOne({ _id: userId });

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

          // Notify post owner
          if (post && post.userId !== data.userId) {
            io.to(`user:${post.userId}`).emit("new_comment", commentData);

            // Create notification
            const notification = {
              userId: post.userId,
              actorId: data.userId,
              type: "comment",
              title: "New Comment",
              message: `${user?.name || "Someone"} commented on your post`,
              link: `/feed?post=${data.postId}`,
              read: false,
              createdAt: new Date(),
            };
            const notifResult = await createNotification(notification);

            // Emit generic notification event
            if (notifResult) {
              io.to(`user:${post.userId}`).emit("notification", {
                ...notification,
                _id: notifResult._id.toString(),
                id: notifResult._id.toString()
              });
            }
          }

          // Get updated comments count
          const updatedPost = await postsCollection.findOne({ _id: postId });
          const commentsCount = updatedPost?.commentsCount || 0;

          // Broadcast to all users viewing this post
          io.to(`post:${data.postId}`).emit("comment_added", {
            postId: data.postId,
            commentsCount,
            comment: commentData,
          });
        }
      } catch (error) {
        console.error("Error handling new_comment:", error);
      }
    });

    // Handle comment deletion
    socket.on("delete_comment", async (data: { postId: string; commentId: string }) => {
      try {
        const postsCollection = await getCollection(COLLECTIONS.POSTS);
        const commentsCollection = await getCollection(COLLECTIONS.COMMENTS);

        const postId = toObjectId(data.postId);
        if (!postId) return;

        // Delete comment
        const commentIdObj = toObjectId(data.commentId);
        if (commentIdObj) {
          await commentsCollection.deleteOne({ _id: commentIdObj });
        }

        // Update post comments count
        await postsCollection.updateOne(
          { _id: postId },
          { $inc: { commentsCount: -1 } }
        );

        const updatedPost = await postsCollection.findOne({ _id: postId });
        const commentsCount = updatedPost?.commentsCount || 0;

        // Broadcast to all users viewing this post
        io.to(`post:${data.postId}`).emit("comment_deleted", {
          postId: data.postId,
          commentId: data.commentId,
          commentsCount,
        });
      } catch (error) {
        console.error("Error handling delete_comment:", error);
      }
    });

    // Handle like
    socket.on("like_post", async (data: { postId: string; userId: string; liked: boolean }) => {
      try {
        const postsCollection = await getCollection(COLLECTIONS.POSTS);
        const notificationsCollection = await getCollection(COLLECTIONS.NOTIFICATIONS);

        const postId = toObjectId(data.postId);
        if (!postId) return;
        const post = await postsCollection.findOne({ _id: postId });

        if (post && data.liked && post.userId !== data.userId) {
          // Create notification for post owner
          const notification = {
            userId: post.userId,
            actorId: data.userId,
            type: "like",
            title: "New Like",
            message: "Someone liked your post",
            link: `/feed?post=${data.postId}`,
            read: false,
            createdAt: new Date(),
          };
          const notifResult = await createNotification(notification);

          // Emit generic notification event
          if (notifResult) {
            io.to(`user:${post.userId}`).emit("notification", {
              ...notification,
              _id: notifResult._id.toString(),
              id: notifResult._id.toString()
            });
          }

          io.to(`user:${post.userId}`).emit("post_liked", { postId: data.postId, liked: data.liked });
        }

        // Get updated like count
        const updatedPost = await postsCollection.findOne({ _id: postId });
        const likesCount = updatedPost?.likesCount || 0;

        // Broadcast to all users viewing this post
        io.to(`post:${data.postId}`).emit("like_updated", {
          postId: data.postId,
          liked: data.liked,
          userId: data.userId,
          likesCount,
        });
      } catch (error) {
        console.error("Error handling like_post:", error);
      }
    });

    // Handle share
    socket.on("share_post", async (data: { postId: string; userId: string }) => {
      try {
        const postsCollection = await getCollection(COLLECTIONS.POSTS);
        const notificationsCollection = await getCollection(COLLECTIONS.NOTIFICATIONS);

        const postId = toObjectId(data.postId);
        if (!postId) return;
        const post = await postsCollection.findOne({ _id: postId });

        if (post && post.userId !== data.userId) {
          const notification = {
            userId: post.userId,
            actorId: data.userId,
            type: "share",
            title: "Post Shared",
            message: "Someone shared your post",
            link: `/feed?post=${data.postId}`,
            read: false,
            createdAt: new Date(),
          };
          const notifResult = await createNotification(notification);

          // Emit generic notification event
          if (notifResult) {
            io.to(`user:${post.userId}`).emit("notification", {
              ...notification,
              _id: notifResult._id.toString(),
              id: notifResult._id.toString()
            });
          }

          io.to(`user:${post.userId}`).emit("post_shared", { postId: data.postId });
        }

        // Get updated share count
        const updatedPost = await postsCollection.findOne({ _id: postId });
        const sharesCount = updatedPost?.sharesCount || 0;

        io.to(`post:${data.postId}`).emit("share_updated", {
          postId: data.postId,
          sharesCount
        });
      } catch (error) {
        console.error("Error handling share_post:", error);
      }
    });

    // Handle bookmark
    socket.on("bookmark_post", async (data: { postId: string; userId: string; bookmarked: boolean }) => {
      try {
        const postsCollection = await getCollection(COLLECTIONS.POSTS);
        const bookmarksCollection = await getCollection("bookmarks");

        const postId = toObjectId(data.postId);
        if (!postId) return;

        // Update bookmark count
        const bookmarksCount = await bookmarksCollection.countDocuments({ postId: data.postId });
        await postsCollection.updateOne(
          { _id: postId },
          { $set: { bookmarksCount } }
        );

        const updatedPost = await postsCollection.findOne({ _id: postId });
        const finalBookmarksCount = updatedPost?.bookmarksCount || 0;

        io.to(`post:${data.postId}`).emit("bookmark_updated", {
          postId: data.postId,
          userId: data.userId,
          bookmarked: data.bookmarked,
          bookmarksCount: finalBookmarksCount,
        });
      } catch (error) {
        console.error("Error handling bookmark_post:", error);
      }
    });

    // Handle avatar update
    socket.on("avatar_updated", (data: { userId: string; avatar: string }) => {
      console.log(`🖼️ Avatar updated for user ${data.userId}`);
      io.emit("avatar_changed", {
        userId: data.userId,
        avatar: data.avatar,
      });
    });

    // Handle profile update
    socket.on("profile_updated", (data: { userId: string; profile: unknown }) => {
      console.log(`👤 Profile updated for user ${data.userId}`);
      io.emit("profile_changed", {
        userId: data.userId,
        profile: data.profile,
      });
    });

    // Handle follow
    socket.on("follow_user", async (data: { followerId: string; followingId: string }) => {
      try {
        const notificationsCollection = await getCollection(COLLECTIONS.NOTIFICATIONS);

        const notification = {
          userId: data.followingId,
          actorId: data.followerId,
          type: "follow",
          title: "New Follower",
          message: "Someone started following you",
          link: `/profile/${data.followerId}`,
          read: false,
          createdAt: new Date(),
        };
        const notifResult = await createNotification(notification);

        // Emit generic notification event
        if (notifResult) {
          io.to(`user:${data.followingId}`).emit("notification", {
            ...notification,
            _id: notifResult._id.toString(),
            id: notifResult._id.toString()
          });
        }

        io.to(`user:${data.followingId}`).emit("new_follower", { followerId: data.followerId });
      } catch (error) {
        console.error("Error handling follow_user:", error);
      }
    });

    // Handle unfollow
    socket.on("unfollow_user", (data: { followerId: string; followingId: string }) => {
      io.to(`user:${data.followingId}`).emit("unfollowed", { followerId: data.followerId });
    });

    // Handle new message (Direct Message)
    socket.on("send_message", async (data: { message: { id?: string; senderId: string }; receiverId: string }) => {
      console.log(`💬 [Server] Message: ${data.message.senderId} → ${data.receiverId}`);

      // Use direct socket emission (more reliable than room-based)
      const [receiverCount, senderCount] = await Promise.all([
        emitToUser(data.receiverId, "new_message", data.message),
        emitToUser(data.message.senderId, "new_message", data.message)
      ]);

      // Send delivery confirmation to sender if message has an ID
      if (data.message.id) {
        await emitToUser(data.message.senderId, "message_delivered", {
          messageId: data.message.id,
          userId: data.receiverId,
          deliveredAt: new Date()
        });
      }

      console.log(`✅ [Server] Message delivered to ${receiverCount} receiver sockets and ${senderCount} sender sockets`);
    });

    // Handle message seen/read
    socket.on("message_read", async (data: { messageId: string; userId: string; senderId: string }) => {
      console.log(`👀 [Server] Message Read: ${data.messageId} by ${data.userId} (Sender: ${data.senderId})`);
      await emitToUser(data.senderId, "message_read", { messageId: data.messageId, userId: data.userId });
    });

    // Handle message reaction
    socket.on("message_reaction", async (data: { messageId: string; userId: string; receiverId: string; reactions: any[] }) => {
      console.log(`❤️ [Server] Reaction: ${data.messageId} from ${data.userId}`);
      await Promise.all([emitToUser(data.receiverId, "message_reaction", data), emitToUser(data.userId, "message_reaction", data)]);
    });

    // Handle message edit
    socket.on("message_edited", async (data: { messageId: string; userId: string; receiverId: string; content: string; edits: any[] }) => {
      console.log(`✍️ [Server] Message Edited: ${data.messageId}`);
      await Promise.all([emitToUser(data.receiverId, "message_edited", data), emitToUser(data.userId, "message_edited", data)]);
    });

    // Handle message deletion
    socket.on("message_deleted", async (data: { messageId: string; userId: string; receiverId: string }) => {
      console.log(`🗑️ [Server] Message Deleted: ${data.messageId}`);
      await Promise.all([emitToUser(data.receiverId, "message_deleted", data), emitToUser(data.userId, "message_deleted", data)]);
    });

    socket.on("typing", async (data: { userId: string; isTyping: boolean }) => {
      const senderId = socket.userId;
      if (senderId) {
        // Use direct socket emission for typing indicator
        await emitToUser(data.userId, "typing", { userId: senderId, isTyping: data.isTyping });
        console.log(`⌨️ Typing indicator: ${senderId} → ${data.userId} (${data.isTyping})`);
      }
    });

    // Handle presence updates (Active/Away)
    socket.on("update_presence", (data: { status: "online" | "away" }) => {
      const userId = socket.userId;
      if (userId) {
        console.log(`👤 [Server] Presence Update: ${userId} is now ${data.status}`);

        // Map "away" to "away" and "online" to "online"
        const status = data.status === "away" ? "away" : "online";

        // Broadcast to all users
        io.emit("user_status", {
          userId,
          status,
          lastSeen: data.status === "away" ? new Date().toISOString() : null
        });
      }
    });

    socket.on("disconnect", async () => {
      console.log("🔌 Client disconnected:", socket.id);

      const userId = socket.userId;
      const oauthId = socket.oauthId;
      
      // Clean up from MongoDB _id key
      if (userId && userSockets.has(userId)) {
        const sockets = userSockets.get(userId)!;
        sockets.delete(socket.id);
        console.log(`🔌 [Server] Socket ${socket.id} removed from user ${userId}. Remaining: ${sockets.size}`);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }
      
      // Also clean up from OAuth ID key if different
      if (oauthId && oauthId !== userId && userSockets.has(oauthId)) {
        const sockets = userSockets.get(oauthId)!;
        sockets.delete(socket.id);
        console.log(`🔌 [Server] Socket ${socket.id} removed from OAuth ${oauthId}. Remaining: ${sockets.size}`);
        if (sockets.size === 0) {
          userSockets.delete(oauthId);
        }
      }

      // Check if ALL sockets for this user are gone (check both IDs)
      const userStillConnected = (userId && userSockets.has(userId) && userSockets.get(userId)!.size > 0) ||
                                  (oauthId && userSockets.has(oauthId) && userSockets.get(oauthId)!.size > 0);

      if (!userStillConnected && userId) {
        const lastSeen = new Date();

        try {
          const usersCollection = await getCollection(COLLECTIONS.USERS);
          const userIdObj = toObjectId(userId);

          const user = userIdObj
            ? await usersCollection.findOne({ _id: userIdObj })
            : await usersCollection.findOne({ id: userId });

          if (user) {
            const dbId = user._id.toString();
            const userOauthId = user.id;

            await usersCollection.updateOne(
              { _id: user._id },
              { $set: { isOnline: false, lastSeen: lastSeen } }
            );

            console.log(`👋 User ${userId} marked as offline (all tabs closed). DB ID: ${dbId}, OAuth ID: ${userOauthId}`);

            // Broadcast for BOTH IDs
            io.emit("user_status", { userId: dbId, status: "offline", lastSeen });
            if (userOauthId && userOauthId !== dbId) {
              io.emit("user_status", { userId: userOauthId, status: "offline", lastSeen });
            }
          } else {
            // Fallback
            await usersCollection.updateOne(
              { _id: (userIdObj || userId) as unknown as any },
              { $set: { isOnline: false, lastSeen: lastSeen } }
            );
            io.emit("user_status", { userId, status: "offline", lastSeen });
          }
        } catch (e) {
          console.error("❌ Error updating last seen", e);
        }
      }
    });
  });

  return io;
}
