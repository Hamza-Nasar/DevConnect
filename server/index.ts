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
  const io = new SocketIOServer(server, {
    cors: {
      origin: true,
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/socket.io-custom",
    addTrailingSlash: true,
    transports: ["polling", "websocket"],
    allowEIO3: true,
  });

  // Make socket instance globally accessible
  setSocketInstance(io);

  // Store user socket connections: userId -> Set of socketIds
  const userSockets = new Map<string, Set<string>>();

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

          if (!userSockets.has(dbId)) {
            userSockets.set(dbId, new Set());
          }
          userSockets.get(dbId)!.add(socket.id);

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

          // Send list of CURRENT online users to the joining user
          const onlineDbIds = Array.from(userSockets.keys());
          socket.emit("initial_online_users", onlineDbIds);

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

          // Send list of CURRENT online users to the joining user
          const onlineDbIds = Array.from(userSockets.keys());
          socket.emit("initial_online_users", onlineDbIds);
        }
      } catch (error) {
        console.error(`❌ [Server] Join error for ${userId}:`, error);
      }
    });

    socket.on("get_online_users", () => {
      const onlineDbIds = Array.from(userSockets.keys());
      console.log(`👥 [Server] Sending online users to ${socket.id}: ${onlineDbIds.length}`);
      socket.emit("initial_online_users", onlineDbIds);
    });

    // Video/Voice Call Signaling - UPDATED for avatar/video type
    socket.on("call_user", (data: { userToCall: string; signalData: unknown; from: string; name: string; avatar: string; isVideo: boolean }) => {
      const receiverRoom = `user:${data.userToCall}`;
      const roomClients = io.sockets.adapter.rooms.get(receiverRoom);
      const clientCount = roomClients ? roomClients.size : 0;

      console.log(`📞 [Server] Call: ${data.from} → ${data.userToCall} (Room: ${receiverRoom}, Clients: ${clientCount})`);

      if (clientCount === 0) {
        console.warn(`⚠️ [Server] Receiver room "${receiverRoom}" is empty! Call won't be delivered.`);
        // Try alternative room format
        const altRoom = `user:${data.userToCall}`;
        const altClients = io.sockets.adapter.rooms.get(altRoom);
        console.log(`🔄 [Server] Trying alternative room format, clients: ${altClients?.size || 0}`);
      }

      // Emit to receiver room
      const callData = {
        signal: data.signalData,
        from: data.from,
        name: data.name,
        avatar: data.avatar,
        isVideo: data.isVideo
      };

      console.log(`📤 [Server] Emitting call_user event to room: ${receiverRoom}`, callData);
      io.to(receiverRoom).emit("call_user", callData);

      if (roomClients) {
        roomClients.forEach((socketId) => {
          const targetSocket = io.sockets.sockets.get(socketId) as CustomSocket;
          if (targetSocket) {
            console.log(`📤 [Server] Emitting to socket: ${socketId}, userId: ${targetSocket.userId}`);
            targetSocket.emit("call_user", callData);
          }
        });
      }

      console.log(`✅ [Server] Call event emitted to room: ${receiverRoom}`);
    });

    socket.on("answer_call", (data: { to: string; signal: unknown }) => {
      console.log(`✅ Call answered, signal sent to ${data.to}`);
      io.to(`user:${data.to}`).emit("call_accepted", data.signal);
    });

    socket.on("end_call", (data: { to: string }) => {
      console.log(`📴 Call ended with ${data.to}`);
      io.to(`user:${data.to}`).emit("call_ended");
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
    socket.on("send_message", (data: { message: { id?: string; senderId: string }; receiverId: string }) => {
      console.log(`💬 [Server] Message: ${data.message.senderId} → ${data.receiverId}`);

      // Emit to receiver
      io.to(`user:${data.receiverId}`).emit("new_message", data.message);

      // Emit to sender (for other tabs)
      io.to(`user:${data.message.senderId}`).emit("new_message", data.message);

      // Send delivery confirmation to sender if message has an ID
      if (data.message.id) {
        io.to(`user:${data.message.senderId}`).emit("message_delivered", {
          messageId: data.message.id,
          userId: data.receiverId,
          deliveredAt: new Date()
        });
      }

      console.log(`✅ [Server] Message delivered to receiver: user:${data.receiverId} and sender: user:${data.message.senderId}`);
    });

    // Handle message seen/read
    socket.on("message_read", (data: { messageId: string; userId: string; senderId: string }) => {
      console.log(`👀 [Server] Message Read: ${data.messageId} by ${data.userId} (Sender: ${data.senderId})`);
      // Notify the original sender
      io.to(`user:${data.senderId}`).emit("message_read", {
        messageId: data.messageId,
        userId: data.userId
      });
    });

    // Handle message reaction
    socket.on("message_reaction", (data: { messageId: string; userId: string; receiverId: string; reactions: any[] }) => {
      console.log(`❤️ [Server] Reaction: ${data.messageId} from ${data.userId}`);
      // Notify receiver
      io.to(`user:${data.receiverId}`).emit("message_reaction", data);
      // Notify sender (for multi-tab sync)
      io.to(`user:${data.userId}`).emit("message_reaction", data);
    });

    // Handle message edit
    socket.on("message_edited", (data: { messageId: string; userId: string; receiverId: string; content: string; edits: any[] }) => {
      console.log(`✍️ [Server] Message Edited: ${data.messageId}`);
      io.to(`user:${data.receiverId}`).emit("message_edited", data);
      io.to(`user:${data.userId}`).emit("message_edited", data);
    });

    // Handle message deletion
    socket.on("message_deleted", (data: { messageId: string; userId: string; receiverId: string }) => {
      console.log(`🗑️ [Server] Message Deleted: ${data.messageId}`);
      io.to(`user:${data.receiverId}`).emit("message_deleted", data);
      io.to(`user:${data.userId}`).emit("message_deleted", data);
    });

    socket.on("typing", (data: { userId: string; isTyping: boolean }) => {
      const senderId = socket.userId;
      if (senderId) {
        // Notify receiver
        io.to(`user:${data.userId}`).emit("typing", {
          userId: senderId,
          isTyping: data.isTyping
        });

        // Notify other tabs of same user
        socket.to(`user:${senderId}`).emit("typing", {
          userId: senderId, // This allows the user to know THEY are typing elsewhere
          isTyping: data.isTyping,
          receiverId: data.userId // Context on WHICH chat they are typing in
        });

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
      if (userId && userSockets.has(userId)) {
        const sockets = userSockets.get(userId)!;
        sockets.delete(socket.id);

        console.log(`🔌 [Server] Socket ${socket.id} removed for user ${userId}. Remaining: ${sockets.size}`);

        if (sockets.size === 0) {
          userSockets.delete(userId);
          const lastSeen = new Date();

          try {
            const usersCollection = await getCollection(COLLECTIONS.USERS);
            const userIdObj = toObjectId(userId);

            const user = userIdObj
              ? await usersCollection.findOne({ _id: userIdObj })
              : await usersCollection.findOne({ id: userId });

            if (user) {
              const dbId = user._id.toString();
              const oauthId = user.id;

              await usersCollection.updateOne(
                { _id: user._id },
                { $set: { isOnline: false, lastSeen: lastSeen } }
              );

              console.log(`👋 User ${userId} marked as offline (all tabs closed). DB ID: ${dbId}, OAuth ID: ${oauthId}`);

              // Broadcast for BOTH IDs
              io.emit("user_status", { userId: dbId, status: "offline", lastSeen });
              if (oauthId && oauthId !== dbId) {
                io.emit("user_status", { userId: oauthId, status: "offline", lastSeen });
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
      }
    });
  });

  return io;
}
