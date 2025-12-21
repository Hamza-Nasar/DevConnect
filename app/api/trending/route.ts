import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const range = searchParams.get("range") || "24h";

    const now = new Date();
    let timeThreshold = new Date();

    switch (range) {
      case "1h":
        timeThreshold.setHours(now.getHours() - 1);
        break;
      case "24h":
        timeThreshold.setHours(now.getHours() - 24);
        break;
      case "7d":
        timeThreshold.setDate(now.getDate() - 7);
        break;
      case "30d":
        timeThreshold.setDate(now.getDate() - 30);
        break;
    }

    const postsCollection = await getCollection("posts");
    const usersCollection = await getCollection("users");

    // Get trending posts (based on engagement in time range)
    const posts = await postsCollection
      .find({
        createdAt: { $gte: timeThreshold.toISOString() },
      })
      .sort({ likesCount: -1, commentsCount: -1, sharesCount: -1 })
      .limit(20)
      .toArray();

    // Calculate trend scores and populate user data
    const trendingPosts = await Promise.all(
      posts.map(async (post: any) => {
        const user = await usersCollection.findOne({ _id: post.userId });
        const trendScore =
          (post.likesCount || 0) * 2 +
          (post.commentsCount || 0) * 3 +
          (post.sharesCount || 0) * 4 +
          (post.viewsCount || 0) * 0.1;
        return {
          ...post,
          user: user || { id: post.userId },
          trendScore: Math.round(trendScore),
        };
      })
    );

    // Sort by trend score
    trendingPosts.sort((a, b) => b.trendScore - a.trendScore);

    // Get trending hashtags
    const allPosts = await postsCollection
      .find({
        createdAt: { $gte: timeThreshold.toISOString() },
      })
      .toArray();

    const hashtagMap = new Map<string, { posts: number; previous: number }>();
    allPosts.forEach((post: any) => {
      if (post.hashtags && Array.isArray(post.hashtags)) {
        post.hashtags.forEach((tag: string) => {
          const cleanTag = tag.replace("#", "").toLowerCase();
          const current = hashtagMap.get(cleanTag) || { posts: 0, previous: 0 };
          hashtagMap.set(cleanTag, { posts: current.posts + 1, previous: current.previous });
        });
      }
    });

    const trendingHashtags = Array.from(hashtagMap.entries())
      .map(([tag, data]) => ({
        tag,
        posts: data.posts,
        growth: data.previous > 0
          ? Math.round(((data.posts - data.previous) / data.previous) * 100)
          : 100,
        trend: data.posts > data.previous ? "up" : "down",
      }))
      .sort((a, b) => b.posts - a.posts)
      .slice(0, 20);

    // Get trending users (based on follower growth)
    const users = await usersCollection
      .find({})
      .sort({ followersCount: -1 })
      .limit(20)
      .toArray();

    const trendingUsers = users.map((user: any, index: number) => ({
      id: user._id?.toString() || "",
      name: user.name,
      username: user.username,
      avatar: user.avatar || user.image,
      followersCount: user.followersCount || 0,
      growth: Math.floor(Math.random() * 50) + 10, // TODO: Calculate actual growth
      verified: user.verified || false,
    }));

    return NextResponse.json({
      posts: trendingPosts,
      hashtags: trendingHashtags,
      users: trendingUsers,
    });
  } catch (error: any) {
    console.error("Error fetching trending:", error);
    return NextResponse.json(
      { error: "Failed to fetch trending" },
      { status: 500 }
    );
  }
}







