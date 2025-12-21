import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";

// Create or update reaction (weighted reactions)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { targetId, targetType, reactionType } = await req.json();
    // targetType: "post" | "comment"
    // reactionType: "like" | "helpful" | "love" | "insightful"

    if (!targetId || !targetType || !reactionType) {
      return NextResponse.json(
        { error: "Target ID, type, and reaction type required" },
        { status: 400 }
      );
    }

    const reactionsCollection = await getCollection("reactions");
    const targetCollection = await getCollection(
      targetType === "post" ? "posts" : "comments"
    );

    const targetIdObj = toObjectId(targetId);
    if (!targetIdObj) {
      return NextResponse.json({ error: "Invalid target ID" }, { status: 400 });
    }

    // Check if reaction exists
    const existing = await reactionsCollection.findOne({
      userId: session.user.id,
      targetId,
      targetType,
    });

    if (existing) {
      if (existing.reactionType === reactionType) {
        // Remove reaction if same type
        await reactionsCollection.deleteOne({ _id: existing._id });
        return NextResponse.json({ success: true, removed: true });
      } else {
        // Update reaction type
        await reactionsCollection.updateOne(
          { _id: existing._id },
          { $set: { reactionType, updatedAt: new Date().toISOString() } }
        );
      }
    } else {
      // Create new reaction
      await reactionsCollection.insertOne({
        userId: session.user.id,
        targetId,
        targetType,
        reactionType,
        createdAt: new Date().toISOString(),
      });
    }

    // Update reaction counts on target
    const reactionCounts = await reactionsCollection.aggregate([
      { $match: { targetId, targetType } },
      { $group: { _id: "$reactionType", count: { $sum: 1 } } },
    ]).toArray();

    const counts: any = {};
    reactionCounts.forEach((r: any) => {
      counts[r._id] = r.count;
    });

    await targetCollection.updateOne(
      { _id: targetIdObj },
      { $set: { reactionCounts: counts } }
    );

    return NextResponse.json({ success: true, reactionCounts: counts });
  } catch (error: any) {
    console.error("Error creating reaction:", error);
    return NextResponse.json(
      { error: "Failed to create reaction" },
      { status: 500 }
    );
  }
}

// Get reactions for a target
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const targetId = searchParams.get("targetId");
    const targetType = searchParams.get("targetType");

    if (!targetId || !targetType) {
      return NextResponse.json(
        { error: "Target ID and type required" },
        { status: 400 }
      );
    }

    const reactionsCollection = await getCollection("reactions");
    const reactions = await reactionsCollection
      .find({ targetId, targetType })
      .toArray();

    const userReaction = reactions.find(
      (r: any) => r.userId === session.user.id
    );

    return NextResponse.json({
      reactions,
      userReaction: userReaction || null,
      totalCount: reactions.length,
    });
  } catch (error: any) {
    console.error("Error fetching reactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch reactions" },
      { status: 500 }
    );
  }
}



