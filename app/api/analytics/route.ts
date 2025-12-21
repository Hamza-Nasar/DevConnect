import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";

// Get analytics for creator
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type"); // "post" | "profile" | "overview"
    const postId = searchParams.get("postId");

    const postsCollection = await getCollection("posts");
    const usersCollection = await getCollection("users");
    const viewsCollection = await getCollection("postViews");
    const likesCollection = await getCollection("likes");
    const commentsCollection = await getCollection("comments");
    const sharesCollection = await getCollection("shares");

    if (type === "post" && postId) {
      // Post-specific analytics
      const postIdObj = toObjectId(postId);
      if (!postIdObj) {
        return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
      }

      const post = await postsCollection.findOne({ _id: postIdObj });
      if (!post || post.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Post not found or unauthorized" },
          { status: 404 }
        );
      }

      const views = await viewsCollection.countDocuments({ postId });
      const likes = await likesCollection.countDocuments({ postId });
      const comments = await commentsCollection.countDocuments({ postId });
      const shares = await sharesCollection.countDocuments({ postId });

      // Engagement rate
      const engagementRate =
        views > 0 ? ((likes + comments + shares) / views) * 100 : 0;

      return NextResponse.json({
        postId,
        views,
        likes,
        comments,
        shares,
        engagementRate: engagementRate.toFixed(2),
        totalEngagement: likes + comments + shares,
      });
    } else if (type === "profile") {
      // Profile analytics
      const userIdObj = toObjectId(session.user.id);
      if (!userIdObj) {
        return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
      }

      const user = await usersCollection.findOne({ _id: userIdObj });
      const userPosts = await postsCollection
        .find({ userId: session.user.id })
        .toArray();

      const totalViews = await viewsCollection.countDocuments({
        postId: { $in: userPosts.map((p: any) => p._id.toString()) },
      });

      const totalLikes = await likesCollection.countDocuments({
        postId: { $in: userPosts.map((p: any) => p._id.toString()) },
      });

      const totalComments = await commentsCollection.countDocuments({
        postId: { $in: userPosts.map((p: any) => p._id.toString()) },
      });

      const profileViews = user?.profileViews || 0;

      return NextResponse.json({
        profileViews,
        totalPosts: userPosts.length,
        totalViews,
        totalLikes,
        totalComments,
        averageEngagement:
          userPosts.length > 0
            ? (totalLikes + totalComments) / userPosts.length
            : 0,
      });
    } else {
      // Overview analytics
      const userIdObj = toObjectId(session.user.id);
      if (!userIdObj) {
        return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
      }

      const user = await usersCollection.findOne({ _id: userIdObj });
      const userPosts = await postsCollection
        .find({ userId: session.user.id })
        .toArray();

      const postIds = userPosts.map((p: any) => p._id.toString());

      const totalViews = await viewsCollection.countDocuments({
        postId: { $in: postIds },
      });

      const totalLikes = await likesCollection.countDocuments({
        postId: { $in: postIds },
      });

      const totalComments = await commentsCollection.countDocuments({
        postId: { $in: postIds },
      });

      const totalShares = await sharesCollection.countDocuments({
        postId: { $in: postIds },
      });

      // Calculate engagement metrics
      const avgLikes = userPosts.length > 0 ? totalLikes / userPosts.length : 0;
      const avgComments = userPosts.length > 0 ? totalComments / userPosts.length : 0;
      const avgShares = userPosts.length > 0 ? totalShares / userPosts.length : 0;
      const engagementRate =
        totalViews > 0
          ? ((totalLikes + totalComments + totalShares) / totalViews) * 100
          : 0;

      // Mock growth data (needs historical tracking table for real data)
      const growth = {
        followersGrowth: 0,
        postsGrowth: 0,
        engagementGrowth: 0,
      };

      // Get top posts (enriched with stats)
      // Sort by creation time desc first to get recent ones, or by engagement if feasible
      const recentPosts = userPosts
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 5);

      const topPosts = await Promise.all(
        recentPosts.map(async (post: any) => {
          const postId = post._id.toString();
          const [likes, comments, shares, views] = await Promise.all([
            likesCollection.countDocuments({ postId }),
            commentsCollection.countDocuments({ postId }),
            sharesCollection.countDocuments({ postId }),
            viewsCollection.countDocuments({ postId }),
          ]);

          return {
            id: postId,
            content: post.content || post.description || "No content",
            likes,
            comments,
            shares,
            views,
          };
        })
      );

      // Recent activity
      const recentActivity = recentPosts.map((post: any) => ({
        type: "post_created",
        description: `Posted: ${post.content?.substring(0, 20) || "New post"
          }...`,
        timestamp: post.createdAt,
      }));

      return NextResponse.json({
        overview: {
          totalPosts: userPosts.length,
          totalViews,
          totalLikes,
          totalComments,
          totalShares,
          profileViews: user?.profileViews || 0,
          reputationScore: user?.reputationScore || 0,
          followers: user?.followers?.length || 0,
          following: user?.following?.length || 0,
        },
        engagement: {
          avgLikes,
          avgComments,
          avgShares,
          engagementRate,
        },
        growth,
        topPosts,
        recentActivity,
      });
    }
  } catch (error: any) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
