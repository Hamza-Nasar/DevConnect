import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";

// Get edit history for a post
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
    const postIdObj = toObjectId(id);
    if (!postIdObj) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
    }

    const postsCollection = await getCollection("posts");
    const post = await postsCollection.findOne({ _id: postIdObj });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Verify user owns the post
    if (post.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Only post owner can view edit history" },
        { status: 403 }
      );
    }

    const editHistoryCollection = await getCollection("postEditHistory");
    const history = await editHistoryCollection
      .find({ postId: id })
      .sort({ editedAt: -1 })
      .toArray();

    return NextResponse.json({ history });
  } catch (error: any) {
    console.error("Error fetching edit history:", error);
    return NextResponse.json(
      { error: "Failed to fetch edit history" },
      { status: 500 }
    );
  }
}



