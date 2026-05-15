import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getSocketInstance } from "@/lib/socket-server";
import { getCollection } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/db";
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

      // First-reply routing: push need-help posts to relevant stack users.
      if (response.postType === "need_help") {
        const stackTags = response.helpContext?.stackTags || [];
        if (stackTags.length > 0) {
          const usersCollection = await getCollection(COLLECTIONS.USERS);
          const experts = await usersCollection
            .find({
              _id: { $ne: user._id },
              $or: [
                { skills: { $in: stackTags } },
                { "developerProfile.stacks": { $in: stackTags } },
                { interests: { $in: stackTags } },
              ],
            })
            .limit(50)
            .toArray();

          for (const expert of experts) {
            io.to(`user:${expert._id.toString()}`).emit("need_help_posted", {
              postId: response.id,
              title: response.title,
              urgency: response.helpContext?.urgency || "medium",
              stackTags,
              fromUserId: userId,
              createdAt: response.createdAt,
            });
          }
        }
      }
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
    const filter = searchParams.get("filter") || "All";

    const posts = await Promise.race([
      getFeedPosts(userId, page, limit, filter),
      new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 8000)),
    ]);
    return NextResponse.json({ posts }, { status: 200 });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json({ posts: [], error: "Failed to fetch posts" }, { status: 200 });
  }
}
