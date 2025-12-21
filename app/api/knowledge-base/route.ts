import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";

// Get knowledge base posts
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const language = searchParams.get("language");
    const framework = searchParams.get("framework");
    const postType = searchParams.get("postType");

    const postsCollection = await getCollection("posts");
    const usersCollection = await getCollection("users");

    let query: any = { savedToKnowledgeBase: true };

    if (language) query.language = language;
    if (framework) query.framework = framework;
    if (postType) query.postType = postType;

    const posts = await postsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // Populate user data
    const postsWithUsers = await Promise.all(
      posts.map(async (post: any) => {
        const userIdObj = toObjectId(post.userId);
        const user = userIdObj
          ? await usersCollection.findOne({ _id: userIdObj })
          : null;
        return {
          ...post,
          id: post._id.toString(),
          user: {
            id: post.userId,
            name: user?.name,
            username: user?.username,
            avatar: user?.avatar || user?.image,
          },
        };
      })
    );

    return NextResponse.json({ posts: postsWithUsers });
  } catch (error: any) {
    console.error("Error fetching knowledge base:", error);
    return NextResponse.json(
      { error: "Failed to fetch knowledge base" },
      { status: 500 }
    );
  }
}

// Save post to knowledge base
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postId } = await req.json();
    if (!postId) {
      return NextResponse.json({ error: "Post ID required" }, { status: 400 });
    }

    const postsCollection = await getCollection("posts");
    const postIdObj = toObjectId(postId);
    if (!postIdObj) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
    }

    await postsCollection.updateOne(
      { _id: postIdObj },
      { $set: { savedToKnowledgeBase: true } }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving to knowledge base:", error);
    return NextResponse.json(
      { error: "Failed to save to knowledge base" },
      { status: 500 }
    );
  }
}

// Remove from knowledge base
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json({ error: "Post ID required" }, { status: 400 });
    }

    const postsCollection = await getCollection("posts");
    const postIdObj = toObjectId(postId);
    if (!postIdObj) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
    }

    await postsCollection.updateOne(
      { _id: postIdObj },
      { $set: { savedToKnowledgeBase: false } }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error removing from knowledge base:", error);
    return NextResponse.json(
      { error: "Failed to remove from knowledge base" },
      { status: 500 }
    );
  }
}




