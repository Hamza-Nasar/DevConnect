import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getSocketInstance } from "@/lib/socket-server";
import {
  CreatePostInput,
  createPostForUserEmail,
  getFeedPosts,
  getFollowerIdsForUser,
} from "@/services/post.service";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: CreatePostInput = await req.json();
    const { post, user, response } = await createPostForUserEmail(session.user.email, body);
    const userId = user._id.toString();

    const io = getSocketInstance();
    if (io) {
      const fullPostData = { ...response, userId };
      io.emit("new_post", fullPostData);

      if (body.groupId) {
        io.to(`group:${body.groupId}`).emit("group_new_post", {
          groupId: body.groupId,
          post: response,
          postsCount: 0,
        });
      } else {
        const followerIds = await getFollowerIdsForUser(userId);
        followerIds.forEach((followerId) => {
          io.to(`user:${followerId}`).emit("new_post", fullPostData);
        });
      }

      io.to(`user:${userId}`).emit("post_created", fullPostData);
      console.log("Real-time post broadcasted:", post?._id?.toString?.());
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/posts error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    const posts = await getFeedPosts(userId, page, limit);
    return NextResponse.json({ posts }, { status: 200 });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json({ posts: [], error: "Failed to fetch posts" }, { status: 200 });
  }
}
