import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";

// Get reputation score
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get("userId") || session.user.id;

    const reactionsCollection = await getCollection("reactions");
    const postsCollection = await getCollection("posts");
    const commentsCollection = await getCollection("comments");
    const usersCollection = await getCollection("users");

    const userIdObj = toObjectId(userId);
    if (!userIdObj) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Calculate reputation based on:
    // - Helpful reactions (weight: 5)
    // - Regular likes (weight: 1)
    // - Accepted answers (weight: 10)
    // - Post quality (views, engagement)

    const userPosts = await postsCollection
      .find({ userId })
      .toArray();

    const userComments = await commentsCollection
      .find({ userId })
      .toArray();

    // Get all reactions on user's posts and comments
    const postIds = userPosts.map((p: any) => p._id.toString());
    const commentIds = userComments.map((c: any) => c._id.toString());

    const helpfulReactions = await reactionsCollection.countDocuments({
      targetId: { $in: [...postIds, ...commentIds] },
      type: "helpful",
    });

    const likes = await reactionsCollection.countDocuments({
      targetId: { $in: [...postIds, ...commentIds] },
      type: "like",
    });

    const acceptedAnswers = await commentsCollection.countDocuments({
      userId,
      accepted: true,
    });

    // Calculate reputation score
    const reputationScore =
      helpfulReactions * 5 +
      likes * 1 +
      acceptedAnswers * 10 +
      userPosts.length * 2 +
      userComments.length * 1;

    // Update user's reputation score
    await usersCollection.updateOne(
      { _id: userIdObj },
      { $set: { reputationScore, updatedAt: new Date().toISOString() } }
    );

    return NextResponse.json({
      reputationScore,
      helpfulReactions,
      likes,
      acceptedAnswers,
      postsCount: userPosts.length,
      commentsCount: userComments.length,
    });
  } catch (error: any) {
    console.error("Error calculating reputation:", error);
    return NextResponse.json(
      { error: "Failed to calculate reputation" },
      { status: 500 }
    );
  }
}




