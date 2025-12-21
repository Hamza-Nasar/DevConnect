import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";

// Block/unblock user
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, blocked } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const blockedUsersCollection = await getCollection("blockedUsers");

    if (blocked) {
      await blockedUsersCollection.updateOne(
        { userId: session.user.id, blockedUserId: userId },
        {
          $set: {
            userId: session.user.id,
            blockedUserId: userId,
            blockedAt: new Date().toISOString(),
          },
        },
        { upsert: true }
      );
    } else {
      await blockedUsersCollection.deleteOne({
        userId: session.user.id,
        blockedUserId: userId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error blocking user:", error);
    return NextResponse.json(
      { error: "Failed to block/unblock user" },
      { status: 500 }
    );
  }
}



