import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";

// Accept a comment as answer (for Q&A posts)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId, postId } = await req.json();

    if (!commentId || !postId) {
      return NextResponse.json(
        { error: "Comment ID and Post ID required" },
        { status: 400 }
      );
    }

    const commentsCollection = await getCollection("comments");
    const postsCollection = await getCollection("posts");

    const commentIdObj = toObjectId(commentId);
    const postIdObj = toObjectId(postId);
    if (!commentIdObj || !postIdObj) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
    }

    // Verify user owns the post
    const post = await postsCollection.findOne({ _id: postIdObj });
    if (!post || post.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Only post owner can accept answers" },
        { status: 403 }
      );
    }

    // Unaccept any previously accepted comment on this post
    await commentsCollection.updateMany(
      { postId, accepted: true },
      { $set: { accepted: false } }
    );

    // Accept this comment
    await commentsCollection.updateOne(
      { _id: commentIdObj },
      { $set: { accepted: true, acceptedAt: new Date().toISOString() } }
    );

    // Update post to mark as answered
    await postsCollection.updateOne(
      { _id: postIdObj },
      { $set: { hasAcceptedAnswer: true, acceptedAnswerId: commentId } }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error accepting comment:", error);
    return NextResponse.json(
      { error: "Failed to accept comment" },
      { status: 500 }
    );
  }
}



