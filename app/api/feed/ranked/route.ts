import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findPosts, toStringId, toObjectId } from "@/lib/db";
import { getCollection } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/db";

// Get ranked/personalized feed
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = parseInt(searchParams.get("skip") || "0");

        const postsCollection = await getCollection(COLLECTIONS.POSTS);
        const likesCollection = await getCollection(COLLECTIONS.LIKES);
        const commentsCollection = await getCollection(COLLECTIONS.COMMENTS);
        const followsCollection = await getCollection(COLLECTIONS.FOLLOWS);
        const usersCollection = await getCollection(COLLECTIONS.USERS);

        // Get users you follow
        const following = await followsCollection
            .find({ followerId: session.user.id })
            .toArray();
        const followingIds = following.map((f: any) => f.followingId);

        // Get posts from users you follow, ordered by engagement
        const posts = await postsCollection
            .find({
                userId: { $in: [...followingIds, session.user.id] },
                isPublic: true,
            })
            .sort({ createdAt: -1 })
            .limit(limit * 2) // Get more to rank
            .toArray();

        // Rank posts by engagement
        const rankedPosts = await Promise.all(
            posts.map(async (p: any) => {
                const likesCount = await likesCollection.countDocuments({ postId: toStringId(p._id) });
                const commentsCount = await commentsCollection.countDocuments({ postId: toStringId(p._id) });
                const userIdObj = toObjectId(p.userId);
                const user = userIdObj ? await usersCollection.findOne({ _id: userIdObj }) : null;

                // Simple ranking: likes * 2 + comments + views
                const score = (likesCount * 2) + commentsCount + (p.viewsCount || 0);

                return {
                    post: p,
                    score,
                    user,
                };
            })
        );

        // Sort by score and take top N
        rankedPosts.sort((a, b) => b.score - a.score);
        const topPosts = rankedPosts.slice(skip, skip + limit);

        // Format response
        const formattedPosts = await Promise.all(
            topPosts.map(async ({ post, user }) => {
                const likesCount = await likesCollection.countDocuments({ postId: toStringId(post._id) });
                const commentsCount = await commentsCollection.countDocuments({ postId: toStringId(post._id) });
                const liked = await likesCollection.findOne({
                    userId: session.user.id,
                    postId: toStringId(post._id),
                });

                return {
                    id: toStringId(post._id),
                    title: post.title || null,
                    content: post.content,
                    images: post.images || [],
                    video: post.video || null,
                    hashtags: post.hashtags || [],
                    createdAt: post.createdAt,
                    user: {
                        id: toStringId(user?._id),
                        name: user?.name || null,
                        avatar: user?.avatar || null,
                        image: user?.image || user?.avatar || null,
                    },
                    likesCount,
                    commentsCount,
                    sharesCount: post.sharesCount || 0,
                    viewsCount: post.viewsCount || 0,
                    likedByUser: !!liked,
                };
            })
        );

        return NextResponse.json({ posts: formattedPosts });
    } catch (error: any) {
        console.error("Error fetching ranked feed:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
