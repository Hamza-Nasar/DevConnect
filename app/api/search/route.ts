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
    const query = searchParams.get("q") || "";
    const type = searchParams.get("type") || "all";
    const dateRange = searchParams.get("dateRange") || "all";
    const sortBy = searchParams.get("sortBy") || "relevance";

    if (!query.trim()) {
      return NextResponse.json({ results: [] });
    }

    const results: any[] = [];
    const searchRegex = new RegExp(query, "i");

    // Date filter
    let dateFilter: any = {};
    if (dateRange !== "all") {
      const now = new Date();
      let threshold = new Date();
      switch (dateRange) {
        case "24h":
          threshold.setHours(now.getHours() - 24);
          break;
        case "7d":
          threshold.setDate(now.getDate() - 7);
          break;
        case "30d":
          threshold.setDate(now.getDate() - 30);
          break;
      }
      dateFilter.createdAt = { $gte: threshold.toISOString() };
    }

    // Search Posts
    if (type === "all" || type === "post") {
      const postsCollection = await getCollection("posts");
      const posts = await postsCollection
        .find({
          $or: [
            { title: searchRegex },
            { content: searchRegex },
            { hashtags: { $in: [searchRegex] } },
          ],
          ...dateFilter,
        })
        .limit(20)
        .toArray();

      for (const post of posts) {
        results.push({
          type: "post",
          id: post._id?.toString() || "",
          title: post.title,
          content: post.content,
          likesCount: post.likesCount || 0,
          commentsCount: post.commentsCount || 0,
          createdAt: post.createdAt,
        });
      }
    }

    // Search Users
    if (type === "all" || type === "user") {
      const usersCollection = await getCollection("users");
      const users = await usersCollection
        .find({
          $or: [
            { name: searchRegex },
            { username: searchRegex },
            { bio: searchRegex },
          ],
        })
        .limit(20)
        .toArray();

      for (const user of users) {
        results.push({
          type: "user",
          id: user._id?.toString() || "",
          name: user.name,
          username: user.username,
          avatar: user.avatar || user.image,
          verified: user.verified || false,
          followersCount: user.followersCount || 0,
        });
      }
    }

    // Search Hashtags
    if (type === "all" || type === "hashtag") {
      const postsCollection = await getCollection("posts");
      const posts = await postsCollection
        .find({
          hashtags: { $in: [searchRegex] },
          ...dateFilter,
        })
        .toArray();

      const hashtagMap = new Map<string, number>();
      posts.forEach((post: any) => {
        if (post.hashtags && Array.isArray(post.hashtags)) {
          post.hashtags.forEach((tag: string) => {
            if (tag.toLowerCase().includes(query.toLowerCase())) {
              const cleanTag = tag.replace("#", "").toLowerCase();
              hashtagMap.set(cleanTag, (hashtagMap.get(cleanTag) || 0) + 1);
            }
          });
        }
      });

      for (const [tag, count] of hashtagMap.entries()) {
        results.push({
          type: "hashtag",
          id: tag,
          hashtag: tag,
          postsCount: count,
        });
      }
    }

    // Search Groups
    if (type === "all" || type === "group") {
      const groupsCollection = await getCollection("groups");
      const groups = await groupsCollection
        .find({
          $or: [
            { name: searchRegex },
            { description: searchRegex },
          ],
        })
        .limit(20)
        .toArray();

      for (const group of groups) {
        results.push({
          type: "group",
          id: group._id?.toString() || "",
          title: group.name,
          content: group.description,
          followersCount: group.membersCount || 0,
        });
      }
    }

    // Sort results
    if (sortBy === "newest") {
      results.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
    } else if (sortBy === "popular") {
      results.sort((a, b) => {
        const scoreA = (a.likesCount || 0) + (a.followersCount || 0) + (a.postsCount || 0);
        const scoreB = (b.likesCount || 0) + (b.followersCount || 0) + (b.postsCount || 0);
        return scoreB - scoreA;
      });
    }

    return NextResponse.json({ results: results.slice(0, 50) });
  } catch (error: any) {
    console.error("Error searching:", error);
    return NextResponse.json(
      { error: "Failed to search" },
      { status: 500 }
    );
  }
}
