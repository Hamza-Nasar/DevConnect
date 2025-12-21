import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type") || "all";

    const recommendations: any[] = [];

    // Get user's interests and activity
    const postsCollection = await getCollection("posts");
    const usersCollection = await getCollection("users");
    const likesCollection = await getCollection("likes");
    const followsCollection = await getCollection("follows");
    const hashtagsCollection = await getCollection("hashtags");

    const userIdObj = toObjectId(session.user.id);
    if (!userIdObj) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Get user's liked posts to understand interests
    const userLikes = await likesCollection
      .find({ userId: session.user.id })
      .limit(50)
      .toArray();

    const likedPostIds = userLikes.map((like: any) => like.postId);
    const likedPostIdsObj = likedPostIds.map(id => toObjectId(id)).filter((id): id is NonNullable<typeof id> => id !== null);
    const userPosts = likedPostIdsObj.length > 0
      ? await postsCollection
          .find({ _id: { $in: likedPostIdsObj } })
          .toArray()
      : [];

    // Extract hashtags from user's interests
    const userHashtags = new Set<string>();
    userPosts.forEach((post: any) => {
      if (post.hashtags && Array.isArray(post.hashtags)) {
        post.hashtags.forEach((tag: string) => {
          userHashtags.add(tag.replace("#", "").toLowerCase());
        });
      }
    });

    // Get user's following list
    const userFollows = await followsCollection
      .find({ followerId: session.user.id })
      .toArray();
    const followingIds = userFollows.map((f: any) => f.followingId);
    const followingIdsObj = followingIds.map(id => toObjectId(id)).filter((id): id is NonNullable<typeof id> => id !== null);

    // Recommend Users (people you might know)
    if (type === "all" || type === "user") {
      const allUsers = await usersCollection
        .find({
          _id: { $ne: userIdObj, $nin: followingIdsObj },
        })
        .limit(30)
        .toArray();

      for (const user of allUsers) {
        // Calculate recommendation score based on mutual connections, similar interests, etc.
        const mutualConnections = await followsCollection.countDocuments({
          followingId: user._id,
          followerId: { $in: followingIds },
        });

        const score = Math.min(
          0.3 + (mutualConnections * 0.1) + (Math.random() * 0.3),
          1.0
        );

        if (score > 0.3) {
          recommendations.push({
            type: "user",
            id: user._id?.toString() || "",
            name: user.name,
            username: user.username,
            avatar: user.avatar || user.image,
            verified: user.verified || false,
            followersCount: user.followersCount || 0,
            reason: mutualConnections > 0
              ? `${mutualConnections} mutual connections`
              : "Similar interests",
            score,
          });
        }
      }
    }

    // Recommend Posts (based on interests)
    if (type === "all" || type === "post") {
      const recommendedPosts = await postsCollection
        .find({
          userId: { $ne: session.user.id },
          hashtags: { $in: Array.from(userHashtags) },
        })
        .sort({ likesCount: -1 })
        .limit(20)
        .toArray();

      for (const post of recommendedPosts) {
        const matchingHashtags = post.hashtags?.filter((tag: string) =>
          userHashtags.has(tag.replace("#", "").toLowerCase())
        ).length || 0;

        const score = Math.min(0.2 + (matchingHashtags * 0.2) + (Math.random() * 0.2), 1.0);

        recommendations.push({
          type: "post",
          id: post._id?.toString() || "",
          title: post.title,
          content: post.content,
          likesCount: post.likesCount || 0,
          reason: matchingHashtags > 0
            ? `Matches ${matchingHashtags} of your interests`
            : "Popular in your network",
          score,
        });
      }
    }

    // Recommend Hashtags
    if (type === "all" || type === "hashtag") {
      const allHashtags = await hashtagsCollection
        .find({})
        .sort({ postsCount: -1 })
        .limit(30)
        .toArray();

      for (const hashtag of allHashtags) {
        const tagName = hashtag.tag?.toLowerCase() || "";
        const isRelated = Array.from(userHashtags).some((userTag) =>
          tagName.includes(userTag) || userTag.includes(tagName)
        );

        if (isRelated || hashtag.postsCount > 100) {
          recommendations.push({
            type: "hashtag",
            id: tagName,
            hashtag: hashtag.tag,
            postsCount: hashtag.postsCount || 0,
            reason: isRelated
              ? "Related to your interests"
              : "Trending now",
            score: isRelated ? 0.8 : 0.5,
          });
        }
      }
    }

    // Sort by score
    recommendations.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      recommendations: recommendations.slice(0, 30),
    });
  } catch (error: any) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}




