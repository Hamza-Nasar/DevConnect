import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId, toStringId } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bookmarksCollection = await getCollection("bookmarks");
    const postsCollection = await getCollection("posts");
    const usersCollection = await getCollection("users");

    const bookmarks = await bookmarksCollection
      .find({ userId: session.user.id })
      .sort({ savedAt: -1 })
      .toArray();

    const bookmarksWithPosts = await Promise.all(
      bookmarks.map(async (bookmark: any) => {
        const postIdObj = toObjectId(bookmark.postId);
        const post = postIdObj ? await postsCollection.findOne({ _id: postIdObj }) : null;
        if (post && post.userId) {
          const userIdObj = toObjectId(post.userId);
          const user = userIdObj ? await usersCollection.findOne({ _id: userIdObj }) : null;
          post.user = user;
        }
        return {
          id: toStringId(bookmark._id),
          postId: bookmark.postId,
          post: post || null,
          savedAt: bookmark.savedAt,
          tags: bookmark.tags || [],
        };
      })
    );

    return NextResponse.json({
      bookmarks: bookmarksWithPosts.filter((b) => b.post !== null),
    });
  } catch (error: any) {
    console.error("Error fetching bookmarks:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookmarks" },
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
    const { postId, tags } = body;

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      );
    }

    const bookmarksCollection = await getCollection("bookmarks");
    const postsCollection = await getCollection("posts");

    // Verify post exists
    const postIdObj = toObjectId(postId);
    if (!postIdObj) {
      return NextResponse.json(
        { error: "Invalid post ID" },
        { status: 400 }
      );
    }

    const post = await postsCollection.findOne({ _id: postIdObj });
    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Check if already bookmarked (try both string and ObjectId)
    let existing = await bookmarksCollection.findOne({
      userId: session.user.id.toString(),
      postId: postId.toString()
    });
    
    // If not found, try with ObjectId
    if (!existing) {
      existing = await bookmarksCollection.findOne({
        userId: session.user.id.toString(),
        postId: postIdObj
      });
    }

    if (existing) {
      // Update tags if provided
      if (tags) {
        await bookmarksCollection.updateOne(
          { _id: existing._id },
          { $set: { tags, updatedAt: new Date().toISOString() } }
        );
      }
      
      // Already bookmarked, don't increment count
      return NextResponse.json({ success: true, bookmarked: true });
    }

    await bookmarksCollection.insertOne({
      userId: session.user.id.toString(),
      postId: postId.toString(),
      tags: tags || [],
      savedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    // Update post bookmarks count
    await postsCollection.updateOne(
      { _id: postIdObj },
      { $inc: { bookmarksCount: 1 } }
    );

    return NextResponse.json({ success: true, bookmarked: true });
  } catch (error: any) {
    console.error("Error bookmarking post:", error);
    return NextResponse.json(
      { error: "Failed to bookmark post" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { postId } = body;

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      );
    }

    const bookmarksCollection = await getCollection("bookmarks");
    const postsCollection = await getCollection("posts");

    const postIdObj = toObjectId(postId);
    if (!postIdObj) {
      return NextResponse.json(
        { error: "Invalid post ID" },
        { status: 400 }
      );
    }

    // Try to delete with string postId first
    let result = await bookmarksCollection.deleteOne({
      userId: session.user.id.toString(),
      postId: postId.toString()
    });
    
    // If not found, try with ObjectId
    if (result.deletedCount === 0) {
      result = await bookmarksCollection.deleteOne({
        userId: session.user.id.toString(),
        postId: postIdObj
      });
    }

    if (result.deletedCount > 0) {
      // Update post bookmarks count (ensure it doesn't go below 0)
      await postsCollection.updateOne(
        { _id: postIdObj },
        { $inc: { bookmarksCount: -1 } }
      );
      
      // Ensure bookmarksCount doesn't go below 0
      const updatedPost = await postsCollection.findOne({ _id: postIdObj });
      if (updatedPost && updatedPost.bookmarksCount < 0) {
        await postsCollection.updateOne(
          { _id: postIdObj },
          { $set: { bookmarksCount: 0 } }
        );
      }
    }

    return NextResponse.json({ success: true, bookmarked: false });
  } catch (error: any) {
    console.error("Error unbookmarking post:", error);
    return NextResponse.json(
      { error: "Failed to unbookmark post" },
      { status: 500 }
    );
  }
}


