import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
    createPost,
    findPosts,
    findUserByEmail,
    toObjectId,
    toStringId,
    findFollowsByFollowerId, // Need to add this to lib/db.ts
} from "@/lib/db";
import { rankPosts } from "@/lib/ai/feedRanking";
import { getCollection } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/db";
import { getSocketInstance } from "@/lib/socket-server";
import type { Document, WithId } from "mongodb";

interface PostRequestBody {
    title?: string;
    content: string;
    images?: string[];
    video?: string;
    hashtags?: string[];
    location?: string;
    isPublic?: boolean;
    groupId?: string;
    linkPreview?: {
        url: string;
        title: string;
        description?: string;
        image?: string;
    };
    postType?: "tip" | "bug" | "library" | "announcement" | "regular";
    codeSnippet?: {
        code: string;
        language: string;
    };
    language?: string;
    framework?: string;
    saveToKnowledgeBase?: boolean;
}

// 🟢 Create new post
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body: PostRequestBody = await req.json();
        const { title, content, images, video, hashtags, location, isPublic, groupId, linkPreview, postType, codeSnippet, language, framework, saveToKnowledgeBase } = body;

        if (!content?.trim() && (!images || images.length === 0) && !video) {
            return NextResponse.json({ error: "Content, images, or video required" }, { status: 400 });
        }

        const user = await findUserByEmail(session.user.email);

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Extract hashtags from content if not provided
        const extractedHashtags = hashtags || [];
        const contentHashtags = content.match(/#\w+/g) || [];
        const allHashtags = [...new Set([...extractedHashtags, ...contentHashtags.map(h => h.replace("#", ""))])];

        const postData = {
            title: title?.trim() || null,
            content: content?.trim() || "",
            userId: toStringId(user._id),
            images: images || [],
            video: video || null,
            hashtags: allHashtags,
            location: location || null,
            linkPreview: linkPreview || null,
            isPublic: isPublic !== false,
            groupId: groupId || null,
            postType: postType || "regular",
            codeSnippet: codeSnippet || null,
            language: language || null,
            framework: framework || null,
            savedToKnowledgeBase: saveToKnowledgeBase || false,
        };

        const post = await createPost(postData);

        // Update user's post count
        try {
            const userCollection = await getCollection(COLLECTIONS.USERS);
            await userCollection.updateOne(
                { _id: user._id },
                { $inc: { postsCount: 1 } }
            );
        } catch {
            console.warn("postsCount field not available yet");
        }

        // Get user data for response
        const userData = {
            id: toStringId(user._id),
            name: user.name || null,
            avatar: user.avatar || null,
            image: user.image || user.avatar || null,
            username: user.username || null,
            verified: user.verified || false,
        };

        const postResponse = {
            id: toStringId(post?._id),
            title: post?.title || null,
            content: post?.content || "",
            images: post?.images || [],
            video: post?.video || null,
            hashtags: post?.hashtags || [],
            location: post?.location || null,
            createdAt: post?.createdAt,
            user: userData,
            commentsCount: 0,
            likesCount: 0,
            sharesCount: 0,
            viewsCount: 0,
            likedByUser: false,
            sharedByUser: false,
            isPublic: post?.isPublic !== false,
            codeSnippet: post?.codeSnippet || null,
        };

        // Emit real-time post creation event via Socket.io
        try {
            const io = getSocketInstance();
            if (io) {
                const fullPostData = {
                    ...postResponse,
                    userId: toStringId(user._id),
                };

                // Broadcast to all users (real-time feed update)
                io.emit("new_post", fullPostData);

                // If this is a group post, emit to group room
                if (groupId) {
                    io.to(`group:${groupId}`).emit("group_new_post", {
                        groupId,
                        post: postResponse,
                        postsCount: 0 // Will be updated by group API
                    });
                    console.log("📝 Group post emitted to room:", `group:${groupId}`);
                }

                // Get user's followers and notify them (only for non-group posts)
                if (!groupId) {
                    try {
                        const followsCollection = await getCollection(COLLECTIONS.FOLLOWS);
                        const followers = await followsCollection
                            .find({ followingId: toStringId(user._id) })
                            .toArray() as WithId<Document>[];

                        followers.forEach((follow) => {
                            io.to(`user:${follow.followerId}`).emit("new_post", fullPostData);
                        });
                    } catch (error: unknown) {
                        const message = error instanceof Error ? error.message : String(error);
                        console.warn("Could not notify followers:", message);
                    }
                }

                // Notify the poster
                io.to(`user:${toStringId(user._id)}`).emit("post_created", fullPostData);

                console.log("✅ Real-time post broadcasted:", postResponse.id);
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn("⚠️ Could not emit socket event (socket may not be initialized):", message);
        }

        return NextResponse.json(postResponse, { status: 201 });
    } catch (error: unknown) {
        console.error("🔥 POST /api/posts error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// 🟢 Fetch all posts (with like count and user liked info)
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;

        // Try to fetch posts, but handle MongoDB connection failures gracefully
        let posts: WithId<Document>[] = [];
        try {
            posts = await findPosts(limit, skip) as WithId<Document>[];
        } catch {
            console.warn("⚠️  MongoDB not available, returning empty posts array");
            // Return empty array if MongoDB is not available
            return NextResponse.json({ posts: [] }, { status: 200 });
        }

        // If no posts found, return early
        if (!posts || posts.length === 0) {
            return NextResponse.json({ posts: [] }, { status: 200 });
        }

        // Try to get collections, but handle failures gracefully
        let commentsCollection, likesCollection, usersCollection;
        try {
            await getCollection(COLLECTIONS.POSTS);
            commentsCollection = await getCollection(COLLECTIONS.COMMENTS);
            likesCollection = await getCollection(COLLECTIONS.LIKES);
            usersCollection = await getCollection(COLLECTIONS.USERS);
        } catch {
            console.warn("⚠️  MongoDB collections not available");
            // Return posts with minimal data if collections are not available
            const minimalPosts = posts.map((p) => ({
                id: toStringId(p._id),
                title: p.title || null,
                content: p.content,
                images: p.images || [],
                video: p.video || null,
                hashtags: p.hashtags || [],
                location: p.location || null,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt || p.createdAt,
                user: {
                    id: toStringId(p.userId),
                    name: null,
                    avatar: null,
                    image: null,
                    username: null,
                    verified: false,
                },
                commentsCount: p.commentsCount || 0,
                likesCount: p.likesCount || 0,
                sharesCount: p.sharesCount || 0,
                viewsCount: p.viewsCount || 0,
                likedByUser: false,
                sharedByUser: false,
                isPublic: p.isPublic !== false,
            }));
            return NextResponse.json({ posts: minimalPosts }, { status: 200 });
        }

        const formattedPosts = await Promise.all(
            posts.map(async (p) => {
                const postId = toStringId(p._id);
                const postUserId = p.userId;

                // Get user (with error handling)
                let user = null;
                try {
                    const userIdObj = toObjectId(postUserId);
                    user = userIdObj ? await usersCollection.findOne({ _id: userIdObj }) : null;
                } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : String(error);
                    console.warn("⚠️  Error fetching user:", message);
                }

                // Get comments (with error handling)
                let comments: WithId<Document>[] = [];
                try {
                    comments = await commentsCollection
                        .find({ postId: postId })
                        .toArray() as WithId<Document>[];
                } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : String(error);
                    console.warn("⚠️  Error fetching comments:", message);
                }

                // Check if user liked (with error handling)
                let liked = null;
                try {
                    liked = userId
                        ? await likesCollection.findOne({
                            userId: userId.toString(),
                            postId: postId,
                        })
                        : null;
                } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : String(error);
                    console.warn("⚠️  Error checking like:", message);
                }

                // Count likes (with error handling)
                let likesCount = 0;
                try {
                    likesCount = await likesCollection.countDocuments({ postId: postId });
                } catch {
                    console.warn("⚠️  Error counting likes");
                }

                return {
                    id: postId,
                    title: p.title || null,
                    content: p.content,
                    images: p.images || [],
                    video: p.video || null,
                    hashtags: p.hashtags || [],
                    location: p.location || null,
                    createdAt: p.createdAt,
                    updatedAt: p.updatedAt || p.createdAt,
                    user: {
                        id: toStringId(user?._id),
                        name: user?.name || null,
                        avatar: user?.avatar || null,
                        image: user?.image || user?.avatar || null,
                        username: user?.username || null,
                        verified: user?.verified || false,
                    },
                    commentsCount: p.commentsCount || comments.length,
                    likesCount: p.likesCount || likesCount,
                    sharesCount: p.sharesCount || 0,
                    viewsCount: p.viewsCount || 0,
                    likedByUser: !!liked,
                    sharedByUser: false,
                    isPublic: p.isPublic !== false,
                    codeSnippet: p.codeSnippet || null,
                };
            })
        );

        // Apply AI Ranking if user is logged in
        let finalPosts = formattedPosts;
        if (userId) {
            try {
                // Get user preferences
                const follows = await findFollowsByFollowerId(userId);
                const followedUsers = follows.map((f) => f.followingId);

                // Get user's interests from profile
                const userObjectId = toObjectId(userId);
                const userDoc = userObjectId ? await usersCollection.findOne({ _id: userObjectId }) : null;
                const likedHashtags = userDoc?.interests || [];
                const mood = userDoc?.currentMood || null;

                const userPrefs = {
                    followedUsers,
                    likedHashtags,
                    interactedUsers: [], // Can be expanded in future
                    mood
                };

                // Filter to PostMetrics format for ranking
                const metricsPosts = formattedPosts
                    .filter(p => p.id != null && p.user.id != null) // Filter out posts with null id or userId
                    .map(p => ({
                        id: p.id as string,
                        type: "regular",
                        likesCount: p.likesCount || 0,
                        commentsCount: p.commentsCount || 0,
                        sharesCount: p.sharesCount || 0,
                        viewsCount: p.viewsCount || 0,
                        createdAt: new Date(p.createdAt),
                        userId: p.user.id as string,
                        hashtags: p.hashtags || [],
                        hasCode: !!p.codeSnippet,
                        content: p.content || ""
                    }));

                const rankedMetrics = rankPosts(metricsPosts, userPrefs);

                // Map back to formattedPosts
                const rankedIds = rankedMetrics.map(m => m.id).filter((id): id is string => !!id);
                finalPosts = [...formattedPosts].sort((a, b) => {
                    const aIndex = a.id ? rankedIds.indexOf(a.id) : -1;
                    const bIndex = b.id ? rankedIds.indexOf(b.id) : -1;

                    // If both are in rankedIds, sort by their rank
                    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                    // If only one is in rankedIds, it comes first
                    if (aIndex !== -1) return -1;
                    if (bIndex !== -1) return 1;
                    // Otherwise keep original order
                    return 0;
                });
            } catch (rankingError) {
                console.warn("AI Ranking failed, falling back to chronological:", rankingError);
            }
        }

        return NextResponse.json({ posts: finalPosts }, { status: 200 });
    } catch (error) {
        console.error("❌ Error fetching posts:", error);
        // Return empty array instead of error to prevent UI crashes
        return NextResponse.json({ posts: [], error: "Failed to fetch posts" }, { status: 200 });
    }
}
