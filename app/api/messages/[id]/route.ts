import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId, toStringId, recordAuditLog } from "@/lib/db";
import { getSocketInstance } from "@/lib/socket-server";
import { isAdmin } from "@/lib/rbac";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const messagesCollection = await getCollection("messages");
    const usersCollection = await getCollection("users");

    // Get all potential IDs for the current user (both MongoDB _id and OAuth id)
    const currentUser = await usersCollection.findOne({
      $or: [
        { _id: toObjectId(session.user.id) || session.user.id as any },
        { id: session.user.id }
      ]
    });

    const userIds = [session.user.id];
    if (currentUser) {
      const dbId = currentUser._id.toString();
      const oauthId = currentUser.id;
      if (dbId && !userIds.includes(dbId)) userIds.push(dbId);
      if (oauthId && !userIds.includes(oauthId)) userIds.push(oauthId);
    }

    // Check if id is a valid ObjectId (message ID)
    const objectId = toObjectId(id);
    let message = null;

    if (objectId) {
      message = await messagesCollection.findOne({ _id: objectId });
    }

    if (message) {
      // It's a message ID - get specific message
      // Check if user is sender or receiver
      if (!userIds.includes(message.senderId) && !userIds.includes(message.receiverId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      return NextResponse.json({ message });
    }

    // If no message found, assume it's a userId and get conversation
    const userId = id;

    const messages = await messagesCollection
      .find({
        $or: [
          { senderId: { $in: userIds }, receiverId: userId },
          { senderId: userId, receiverId: { $in: userIds } },
        ],
      })
      .sort({ createdAt: 1 })
      .limit(100)
      .toArray();

    // Populate user data
    const userIdObj = toObjectId(userId);
    const user = userIdObj ? await usersCollection.findOne({ _id: userIdObj }) : null;

    // Get unread messages to emit socket events
    const unreadMessages = await messagesCollection
      .find({
        senderId: userId,
        receiverId: { $in: userIds },
        read: false,
      })
      .project({ _id: 1 })
      .toArray();

    // Mark messages as read
    if (unreadMessages.length > 0) {
      await messagesCollection.updateMany(
        {
          _id: { $in: unreadMessages.map((m) => m._id) },
        },
        { $set: { read: true } }
      );

      // Notify sender via socket for EACH message
      const socket = getSocketInstance();
      if (socket) {
        unreadMessages.forEach((msg) => {
          socket.to(`user:${userId}`).emit("message_read", {
            messageId: msg._id.toString(),
            userId: session.user.id,
          });
        });
      }
    }

    // Format messages with user data and normalized IDs
    const formattedMessages = await Promise.all(
      messages.map(async (msg: any) => {
        const senderIdObj = toObjectId(msg.senderId);
        const sender = senderIdObj ? await usersCollection.findOne({ _id: senderIdObj }) : (await usersCollection.findOne({ id: msg.senderId }));

        const normalizedSenderId = sender ? sender._id.toString() : msg.senderId;

        // Find normalized receiver ID too
        const receiverIdObj = toObjectId(msg.receiverId);
        const receiver = receiverIdObj ? await usersCollection.findOne({ _id: receiverIdObj }) : (await usersCollection.findOne({ id: msg.receiverId }));
        const normalizedReceiverId = receiver ? receiver._id.toString() : msg.receiverId;

        return {
          ...msg,
          id: toStringId(msg._id),
          senderId: normalizedSenderId,
          receiverId: normalizedReceiverId,
          sender: {
            id: normalizedSenderId,
            name: sender?.name || sender?.username || "User",
            username: sender?.username,
            avatar: sender?.avatar || sender?.image,
            alternativeIds: sender?.id && sender.id !== normalizedSenderId ? [sender.id] : [],
          },
        };
      })
    );

    return NextResponse.json({ messages: formattedMessages });
  } catch (error: any) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const messagesCollection = await getCollection("messages");
    const messageIdObj = toObjectId(id);
    if (!messageIdObj) {
      return NextResponse.json({ error: "Invalid message ID" }, { status: 400 });
    }
    const message = await messagesCollection.findOne({ _id: messageIdObj });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const usersCollection = await getCollection("users");
    const currentUser = await usersCollection.findOne({
      $or: [
        { _id: toObjectId(session.user.id) || session.user.id as any },
        { id: session.user.id }
      ]
    });

    const userIds = [session.user.id];
    if (currentUser) {
      const dbId = currentUser._id.toString();
      const oauthId = currentUser.id;
      if (dbId && !userIds.includes(dbId)) userIds.push(dbId);
      if (oauthId && !userIds.includes(oauthId)) userIds.push(oauthId);
    }

    // Check if user is sender or Admin
    if (!userIds.includes(message.senderId) && !isAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await messagesCollection.deleteOne({ _id: messageIdObj });

    // Record Audit Log
    await recordAuditLog(session.user.id, "DELETE_MESSAGE", {
      messageId: id,
      messageSenderId: message.senderId,
      messageReceiverId: message.receiverId,
      reason: !userIds.includes(message.senderId) ? "ADMIN_ACTION" : "USER_ACTION",
      userAgent: req.headers.get("user-agent"),
      ip: req.headers.get("x-forwarded-for") || "unknown"
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting message:", error);
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { content } = await req.json();
    if (!content) {
      return NextResponse.json({ error: "Content required" }, { status: 400 });
    }

    const messagesCollection = await getCollection("messages");
    const messageIdObj = toObjectId(id);
    if (!messageIdObj) {
      return NextResponse.json({ error: "Invalid message ID" }, { status: 400 });
    }

    const message = await messagesCollection.findOne({ _id: messageIdObj });
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Verify ownership
    if (message.senderId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const edits = message.edits || [];
    edits.push({
      content: message.content, // Old content
      createdAt: new Date().toISOString(),
    });

    await messagesCollection.updateOne(
      { _id: messageIdObj },
      {
        $set: {
          content,
          edits,
          updatedAt: new Date().toISOString()
        }
      }
    );

    return NextResponse.json({
      id: id,
      content,
      edits
    });
  } catch (error: any) {
    console.error("Error editing message:", error);
    return NextResponse.json(
      { error: "Failed to edit message" },
      { status: 500 }
    );
  }
}
