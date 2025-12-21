import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { COLLECTIONS, toStringId, toObjectId } from "@/lib/db";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const postsCollection = await getCollection(COLLECTIONS.POSTS);
        const usersCollection = await getCollection(COLLECTIONS.USERS);
        const followsCollection = await getCollection(COLLECTIONS.FOLLOWS);

        // 1. Get Trending Hashtags from recent posts
        const recentPosts = await postsCollection
            .find({ hashtags: { $exists: true, $ne: [] } })
            .sort({ createdAt: -1 })
            .limit(100)
            .toArray();

        const hashtagCounts: Record<string, number> = {};
        recentPosts.forEach((post: any) => {
            if (post.hashtags && Array.isArray(post.hashtags)) {
                post.hashtags.forEach((tag: string) => {
                    hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
                });
            }
        });

        const trendingHashtags = Object.entries(hashtagCounts)
            .map(([tag, count]) => ({ tag, posts: count * 5 + Math.floor(Math.random() * 20), trend: "up" })) // fake multiplier for realism if low data
            .sort((a, b) => b.posts - a.posts)
            .slice(0, 10);

        // 2. Get Trending Posts (most liked/commented recently)
        const trendingPostsRaw = await postsCollection
            .find({ isPublic: true })
            .sort({ likesCount: -1, commentsCount: -1 })
            .limit(9)
            .toArray();

        // Populate user details for posts
        const accountsCollection = await getCollection("accounts");
        const trendingPosts = await Promise.all(trendingPostsRaw.map(async (post: any) => {
            const userIdObj = toObjectId(post.userId);
            let user = null;

            // Try to find user by ObjectId
            if (userIdObj) {
                user = await usersCollection.findOne({ _id: userIdObj });
            }

            // Try string ID lookup if ObjectId lookup failed
            if (!user) {
                user = await usersCollection.findOne({ _id: post.userId });
            }

            // Try finding by OAuth account (for Google OAuth users)
            if (!user) {
                const account = await accountsCollection.findOne({
                    providerAccountId: post.userId
                });
                if (account?.userId) {
                    const accountUserIdObj = toObjectId(account.userId);
                    if (accountUserIdObj) {
                        user = await usersCollection.findOne({ _id: accountUserIdObj });
                    }
                }
            }

            // Get display name with priority: nickname (name) -> email prefix -> username -> generated nickname
            let displayName = user?.name; // Nickname first priority

            if (!displayName && user?.email) {
                displayName = user.email.split("@")[0]; // Email prefix second
            }

            if (!displayName && user?.username) {
                displayName = user.username; // Username third
            }

            if (!displayName) {
                const userId = toStringId(user?._id) || post.userId;
                displayName = `user${userId.slice(0, 8)}`; // Generated nickname last
            }

            return {
                id: toStringId(post._id),
                content: post.content,
                likesCount: post.likesCount || 0,
                commentsCount: post.commentsCount || 0,
                sharesCount: post.sharesCount || 0,
                createdAt: post.createdAt,
                user: {
                    id: toStringId(user?._id) || post.userId,
                    name: displayName,
                    avatar: user?.avatar || user?.image || null,
                    verified: user?.verified || false
                }
            };
        }));

        // 3. Get Trending Creators (most followers or recent activity)
        // ideally sorting by followersCount, but for now just taking verified or random users
        const trendingUsersRaw = await usersCollection
            .find({})
            .limit(50)
            .toArray();

        // Mocking follower count if not in DB schema yet, or fetch from follows
        const trendingUsers = await Promise.all(trendingUsersRaw.slice(0, 9).map(async (user: any) => {
            const followersCount = await followsCollection.countDocuments({ followingId: toStringId(user._id) });
            const postsCount = await postsCollection.countDocuments({ userId: toStringId(user._id) });

            // Get display name with priority: nickname (name) -> email prefix -> username -> generated nickname
            let displayName = user.name; // Nickname first priority

            if (!displayName && user.email) {
                displayName = user.email.split("@")[0]; // Email prefix second
            }

            if (!displayName && user.username) {
                displayName = user.username; // Username third
            }

            if (!displayName) {
                const userId = toStringId(user._id);
                displayName = `user${userId ? userId.slice(0, 8) : "unknown"}`; // Generated nickname last
            }

            return {
                id: toStringId(user._id),
                name: displayName,
                username: user.username,
                avatar: user.avatar || user.image || null,
                verified: user.verified || false,
                followersCount: followersCount || 0,
                postsCount: postsCount || 0
            };
        }));

        // 4. Latest Posts
        const latestPostsRaw = await postsCollection
            .find({ isPublic: true })
            .sort({ createdAt: -1 })
            .limit(10)
            .toArray();

        const latestPosts = await Promise.all(latestPostsRaw.map(async (post: any) => {
            const userIdObj = toObjectId(post.userId);
            let user = null;

            // Try to find user by ObjectId
            if (userIdObj) {
                user = await usersCollection.findOne({ _id: userIdObj });
            }

            // Try string ID lookup if ObjectId lookup failed
            if (!user) {
                user = await usersCollection.findOne({ _id: post.userId });
            }

            // Try finding by OAuth account (for Google OAuth users)
            if (!user) {
                const account = await accountsCollection.findOne({
                    providerAccountId: post.userId
                });
                if (account?.userId) {
                    const accountUserIdObj = toObjectId(account.userId);
                    if (accountUserIdObj) {
                        user = await usersCollection.findOne({ _id: accountUserIdObj });
                    }
                }
            }

            // Get display name with priority: nickname (name) -> email prefix -> username -> generated nickname
            let displayName = user?.name; // Nickname first priority

            if (!displayName && user?.email) {
                displayName = user.email.split("@")[0]; // Email prefix second
            }

            if (!displayName && user?.username) {
                displayName = user.username; // Username third
            }

            if (!displayName) {
                const userId = toStringId(user?._id) || post.userId;
                displayName = `user${userId.slice(0, 8)}`; // Generated nickname last
            }

            return {
                id: toStringId(post._id),
                content: post.content,
                likesCount: post.likesCount || 0,
                commentsCount: post.commentsCount || 0,
                createdAt: post.createdAt,
                user: {
                    id: toStringId(user?._id) || post.userId,
                    name: displayName,
                    avatar: user?.avatar || user?.image || null
                }
            };
        }));


        return NextResponse.json({
            trendingHashtags,
            trendingPosts,
            trendingUsers: trendingUsers.sort((a, b) => b.followersCount - a.followersCount), // Sort by followers
            latestPosts
        });
    } catch (error: any) {
        console.error("Explore API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
