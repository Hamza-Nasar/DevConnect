import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";

// Advanced search
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q");
    const type = searchParams.get("type"); // "user" | "post" | "all"
    const skill = searchParams.get("skill");
    const location = searchParams.get("location");
    const experience = searchParams.get("experience");
    const availability = searchParams.get("availability");
    const tech = searchParams.get("tech");
    const popularity = searchParams.get("popularity"); // "trending" | "popular" | "recent"
    const timeFilter = searchParams.get("time"); // "day" | "week" | "month" | "year" | "all"

    const results: any = {
      users: [],
      posts: [],
    };

    // Search users
    if (type === "user" || type === "all") {
      const usersCollection = await getCollection("users");
      const userQuery: any = {};

      if (query) {
        userQuery.$or = [
          { name: { $regex: query, $options: "i" } },
          { username: { $regex: query, $options: "i" } },
          { bio: { $regex: query, $options: "i" } },
        ];
      }

      if (skill) {
        userQuery.skills = { $in: [skill] };
      }

      if (location) {
        userQuery.location = { $regex: location, $options: "i" };
      }

      if (experience) {
        userQuery.experience = experience;
      }

      if (availability) {
        userQuery.availability = availability;
      }

      const users = await usersCollection.find(userQuery).limit(20).toArray();
      results.users = users.map((u: any) => ({
        id: u._id.toString(),
        name: u.name,
        username: u.username,
        avatar: u.avatar || u.image,
        bio: u.bio,
        location: u.location,
        skills: u.skills || [],
        verified: u.verified || false,
      }));
    }

    // Search posts
    if (type === "post" || type === "all") {
      const postsCollection = await getCollection("posts");
      const postQuery: any = {};

      if (query) {
        postQuery.$or = [
          { title: { $regex: query, $options: "i" } },
          { content: { $regex: query, $options: "i" } },
          { hashtags: { $in: [query] } },
        ];
      }

      if (tech) {
        postQuery.$or = [
          ...(postQuery.$or || []),
          { language: tech },
          { framework: tech },
          { hashtags: { $in: [tech] } },
        ];
      }

      // Time filter
      if (timeFilter && timeFilter !== "all") {
        const now = new Date();
        let timeAgo = new Date();
        switch (timeFilter) {
          case "day":
            timeAgo.setDate(now.getDate() - 1);
            break;
          case "week":
            timeAgo.setDate(now.getDate() - 7);
            break;
          case "month":
            timeAgo.setMonth(now.getMonth() - 1);
            break;
          case "year":
            timeAgo.setFullYear(now.getFullYear() - 1);
            break;
        }
        postQuery.createdAt = { $gte: timeAgo.toISOString() };
      }

      let sortQuery: any = { createdAt: -1 };
      if (popularity === "trending" || popularity === "popular") {
        sortQuery = { likesCount: -1, commentsCount: -1, createdAt: -1 };
      }

      const posts = await postsCollection
        .find(postQuery)
        .sort(sortQuery)
        .limit(20)
        .toArray();

      results.posts = posts.map((p: any) => ({
        id: p._id.toString(),
        title: p.title,
        content: p.content,
        likesCount: p.likesCount || 0,
        commentsCount: p.commentsCount || 0,
        createdAt: p.createdAt,
        language: p.language,
        framework: p.framework,
        postType: p.postType,
      }));
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Error performing advanced search:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}



