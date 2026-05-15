import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/db";

const URGENCY_SCORE: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "20", 10)));
    const postsCollection = await getCollection(COLLECTIONS.POSTS);

    const posts = await postsCollection
      .find({
        postType: "need_help",
        $or: [
          { "helpContext.status": "open" },
          { "helpContext.status": { $exists: false } },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const queue = posts
      .map((post: any) => ({
        id: post._id.toString(),
        title: post.title || null,
        content: post.content || "",
        createdAt: post.createdAt,
        userId: post.userId,
        urgency: post.helpContext?.urgency || "medium",
        status: post.helpContext?.status || "open",
        stackTags: post.helpContext?.stackTags || [],
      }))
      .sort((a, b) => {
        const urgencyDiff = URGENCY_SCORE[b.urgency] - URGENCY_SCORE[a.urgency];
        if (urgencyDiff !== 0) return urgencyDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    return NextResponse.json({ queue }, { status: 200 });
  } catch (error) {
    console.error("GET /api/posts/need-help/queue error:", error);
    return NextResponse.json({ queue: [], error: "Failed to fetch queue" }, { status: 200 });
  }
}
