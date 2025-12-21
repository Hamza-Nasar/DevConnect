import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";

// Create a threaded reply
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { parentMessageId, content, receiverId } = await req.json();

    if (!parentMessageId || !content || !receiverId) {
      return NextResponse.json(
        { error: "Parent message ID, content, and receiver ID required" },
        { status: 400 }
      );
    }

    const messagesCollection = await getCollection("messages");
    const parentIdObj = toObjectId(parentMessageId);
    if (!parentIdObj) {
      return NextResponse.json({ error: "Invalid parent message ID" }, { status: 400 });
    }

    // Verify parent message exists
    const parentMessage = await messagesCollection.findOne({ _id: parentIdObj });
    if (!parentMessage) {
      return NextResponse.json({ error: "Parent message not found" }, { status: 404 });
    }

    // Create threaded reply
    const reply = {
      senderId: session.user.id,
      receiverId,
      content,
      parentMessageId: parentMessageId,
      type: "text",
      read: false,
      createdAt: new Date().toISOString(),
    };

    const result = await messagesCollection.insertOne(reply);

    return NextResponse.json({
      message: {
        id: result.insertedId.toString(),
        ...reply,
      },
    });
  } catch (error: any) {
    console.error("Error creating threaded reply:", error);
    return NextResponse.json(
      { error: "Failed to create threaded reply" },
      { status: 500 }
    );
  }
}

// Get thread replies
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const parentMessageId = searchParams.get("parentMessageId");

    if (!parentMessageId) {
      return NextResponse.json(
        { error: "Parent message ID required" },
        { status: 400 }
      );
    }

    const messagesCollection = await getCollection("messages");
    const usersCollection = await getCollection("users");
    const parentIdObj = toObjectId(parentMessageId);
    if (!parentIdObj) {
      return NextResponse.json({ error: "Invalid parent message ID" }, { status: 400 });
    }

    const replies = await messagesCollection
      .find({ parentMessageId })
      .sort({ createdAt: 1 })
      .toArray();

    // Populate sender data
    const repliesWithUsers = await Promise.all(
      replies.map(async (reply: any) => {
        const senderIdObj = toObjectId(reply.senderId);
        const sender = senderIdObj
          ? await usersCollection.findOne({ _id: senderIdObj })
          : null;
        return {
          ...reply,
          sender: {
            id: reply.senderId,
            name: sender?.name,
            username: sender?.username,
            avatar: sender?.avatar || sender?.image,
          },
        };
      })
    );

    return NextResponse.json({ replies: repliesWithUsers });
  } catch (error: any) {
    console.error("Error fetching thread replies:", error);
    return NextResponse.json(
      { error: "Failed to fetch thread replies" },
      { status: 500 }
    );
  }
}




