import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let messagesCollection, usersCollection;
    try {
      messagesCollection = await getCollection("messages");
      usersCollection = await getCollection("users");
    } catch (dbError: any) {
      console.error("❌ [Message API] Database connection error:", dbError.message);
      // Return empty chats instead of error to prevent UI crash
      return NextResponse.json({ 
        chats: [],
        error: "Database temporarily unavailable"
      }, { status: 200 });
    }

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

    console.log(`🔍 [Message API] Fetching chats for user IDs: ${userIds.join(", ")}`);

    // Get all unique user IDs that the current user has chatted with
    const sentMessages = await messagesCollection
      .find({ senderId: { $in: userIds } })
      .toArray();
    const receivedMessages = await messagesCollection
      .find({ receiverId: { $in: userIds } })
      .toArray();

    const chatUserIds = new Set<string>();
    sentMessages.forEach((m) => chatUserIds.add(m.receiverId));
    receivedMessages.forEach((m) => chatUserIds.add(m.senderId));

    // Group recipients by their MongoDB _id
    const chatsMap = new Map<string, {
      userId: string;
      originalIds: Set<string>;
      user: any;
    }>();

    const allChatIds = Array.from(chatUserIds);
    for (const otherId of allChatIds) {
      const otherIdObj = toObjectId(otherId);
      const otherUser = await usersCollection.findOne({
        $or: [
          { _id: otherIdObj || otherId as any },
          { id: otherId }
        ]
      });

      if (!otherUser) continue;

      const primaryId = otherUser._id.toString();
      if (!chatsMap.has(primaryId)) {
        chatsMap.set(primaryId, {
          userId: primaryId,
          originalIds: new Set([otherId]),
          user: {
            id: primaryId,
            name: otherUser.name,
            username: otherUser.username,
            avatar: otherUser.avatar || otherUser.image,
            status: otherUser.isOnline ? "online" : "offline",
            lastSeen: otherUser.lastSeen,
            verified: otherUser.verified || false,
            alternativeIds: [otherUser.id].filter(Boolean) as string[],
          }
        });
      } else {
        chatsMap.get(primaryId)!.originalIds.add(otherId);
        // Ensure the ID is in alternativeIds if it's not the primary
        if (otherId !== primaryId) {
          const chat = chatsMap.get(primaryId)!;
          if (!chat.user.alternativeIds.includes(otherId)) {
            chat.user.alternativeIds.push(otherId);
          }
        }
      }
    }

    // Get last message and unread count for each unique participant
    const chats = await Promise.all(
      Array.from(chatsMap.values()).map(async (chatInfo) => {
        const participantIds = Array.from(chatInfo.originalIds);

        // Resolve each chat participant to a MongoDB _id and group messages accordingly
        const participantIdObj = toObjectId(chatInfo.userId);
        if (!participantIdObj) return null;
        const participantUser = await usersCollection.findOne({ _id: participantIdObj });
        if (participantUser?.id && !participantIds.includes(participantUser.id)) {
          participantIds.push(participantUser.id);
        }

        const lastMessage = await messagesCollection
          .find({
            $or: [
              { senderId: { $in: userIds }, receiverId: { $in: participantIds } },
              { senderId: { $in: participantIds }, receiverId: { $in: userIds } },
            ],
          })
          .sort({ createdAt: -1 })
          .limit(1)
          .toArray();

        const unreadCount = await messagesCollection.countDocuments({
          senderId: { $in: participantIds },
          receiverId: { $in: userIds },
          read: false,
        });

        return {
          id: chatInfo.userId,
          userId: chatInfo.userId,
          user: chatInfo.user,
          lastMessage: lastMessage[0]
            ? {
              content: lastMessage[0].content,
              createdAt: lastMessage[0].createdAt,
              read: lastMessage[0].read,
              // Normalize IDs in last message too
              senderId: chatInfo.originalIds.has(lastMessage[0].senderId) ? chatInfo.userId : (lastMessage[0].senderId === (currentUser?.id || session.user.id) ? (currentUser?._id.toString() || session.user.id) : lastMessage[0].senderId),
              receiverId: chatInfo.originalIds.has(lastMessage[0].receiverId) ? chatInfo.userId : (lastMessage[0].receiverId === (currentUser?.id || session.user.id) ? (currentUser?._id.toString() || session.user.id) : lastMessage[0].receiverId),
            }
            : undefined,
          unreadCount,
        };
      })
    );

    return NextResponse.json({ chats });
  } catch (error: any) {
    console.error("❌ [Message API] Error fetching chats:", error.message || error);
    
    // Handle MongoDB connection errors gracefully
    if (error.name === 'MongoNetworkTimeoutError' || 
        error.name === 'MongoServerSelectionError' ||
        error.message?.includes('timed out') ||
        error.message?.includes('connection')) {
      console.warn("⚠️ [Message API] MongoDB connection issue, returning empty chats");
      return NextResponse.json({ 
        chats: [],
        error: "Database connection timeout. Please try again."
      }, { status: 200 }); // Return 200 with empty data instead of 500
    }
    
    return NextResponse.json(
      { error: "Failed to fetch chats", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { receiverId, content, type = "text", imageUrl, videoUrl, fileUrl, fileName } = body;

    if (!receiverId || (!content && !imageUrl && !videoUrl && !fileUrl)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const messagesCollection = await getCollection("messages");
    const message: any = {
      senderId: session.user.id,
      receiverId,
      content: content || (imageUrl ? "[Image]" : videoUrl ? "[Video]" : fileUrl ? `[File: ${fileName || "File"}]` : ""),
      type,
      read: false,
      createdAt: new Date().toISOString(),
    };

    // Add media URLs if present
    if (imageUrl) message.imageUrl = imageUrl;
    if (videoUrl) message.videoUrl = videoUrl;
    if (fileUrl) message.fileUrl = fileUrl;
    if (fileName) message.fileName = fileName;

    const result = await messagesCollection.insertOne(message);

    return NextResponse.json({
      message: {
        id: result.insertedId.toString(),
        ...message,
      },
    });
  } catch (error: any) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
