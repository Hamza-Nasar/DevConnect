import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";

// Pin or unpin a chat
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, pinned } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const pinnedChatsCollection = await getCollection("pinnedChats");
    const userIdObj = toObjectId(userId);
    if (!userIdObj) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    if (pinned) {
      // Pin chat
      await pinnedChatsCollection.updateOne(
        {
          userId: session.user.id,
          pinnedUserId: userId,
        },
        {
          $set: {
            userId: session.user.id,
            pinnedUserId: userId,
            pinnedAt: new Date().toISOString(),
          },
        },
        { upsert: true }
      );
    } else {
      // Unpin chat
      await pinnedChatsCollection.deleteOne({
        userId: session.user.id,
        pinnedUserId: userId,
      });
    }

    return NextResponse.json({ success: true, pinned });
  } catch (error: any) {
    console.error("Error pinning chat:", error);
    return NextResponse.json(
      { error: "Failed to pin/unpin chat" },
      { status: 500 }
    );
  }
}




