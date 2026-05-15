import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/db";

export async function POST() {
  try {
    const postsCollection = await getCollection(COLLECTIONS.POSTS);
    const threshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes

    const result = await postsCollection.updateMany(
      {
        postType: "need_help",
        createdAt: { $lt: threshold },
        $and: [
          { $or: [{ "helpContext.status": "open" }, { "helpContext.status": { $exists: false } }] },
          {
            $or: [
              { "helpContext.lastBumpedAt": { $exists: false } },
              { "helpContext.lastBumpedAt": { $lt: threshold.toISOString() } },
            ],
          },
        ],
      },
      {
        $set: {
          "helpContext.lastBumpedAt": new Date().toISOString(),
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({ bumped: result.modifiedCount }, { status: 200 });
  } catch (error) {
    console.error("POST /api/posts/need-help/bump error:", error);
    return NextResponse.json({ bumped: 0, error: "Failed to bump posts" }, { status: 200 });
  }
}
