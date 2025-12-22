import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
    createPost,
    findPosts,
    findUserByEmail,
    findUserById,
    updateUser,
    toObjectId,
    toStringId,
} from "@/lib/db";
import { getCollection } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/db";
import { getSocketInstance } from "@/lib/socket-server";

interface PostRequestBody {
    title?: string;
    content: string;
    images?: string[];
    video?: string;
    hashtags?: string[];
    location?: string;
    isPublic?: boolean;
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
        const { title, content, images, video, hashtags, location, isPublic, linkPreview, postType, codeSnippet, language, framework, saveToKnowledgeBase } = body;

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

        const postData: any = {
            title: title?.trim() || null,
            content: content?.trim() || "",
            userId: toStringId(user._id),
            images: images || [],
            video: video || null,
            hashtags: allHashtags,
            location: location || null,
            linkPreview: linkPreview || null,
            isPublic: isPublic !== false,
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
        } catch (error: any) {
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

                // Get user's followers and notify them
                try {
                    const followsCollection = await getCollection(COLLECTIONS.FOLLOWS);
                    const followers = await followsCollection
                        .find({ followingId: toStringId(user._id) })
                        .toArray();

                    followers.forEach((follow: any) => {
                        io.to(`user:${follow.followerId}`).emit("new_post", fullPostData);
                    });
                } catch (error: any) {
                    console.warn("Could not notify followers:", error?.message);
                }

                // Notify the poster
                io.to(`user:${toStringId(user._id)}`).emit("post_created", fullPostData);

                console.log("✅ Real-time post broadcasted:", postResponse.id);
            }
        } catch (error: any) {
            console.warn("⚠️ Could not emit socket event (socket may not be initialized):", error?.message);
        }

        return NextResponse.json(postResponse, { status: 201 });
    } catch (error: any) {
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
        let posts: any[] = [];
        try {
            posts = await findPosts(limit, skip);
        } catch (error: any) {
            console.warn("⚠️  MongoDB not available, returning empty posts array:", error?.message);
            // Return empty array if MongoDB is not available
            return NextResponse.json({ posts: [] }, { status: 200 });
        }

        // If no posts found, return early
        if (!posts || posts.length === 0) {
            return NextResponse.json({ posts: [] }, { status: 200 });
        }

        // Try to get collections, but handle failures gracefully
        let postsCollection, commentsCollection, likesCollection, usersCollection;
        try {
            postsCollection = await getCollection(COLLECTIONS.POSTS);
            commentsCollection = await getCollection(COLLECTIONS.COMMENTS);
            likesCollection = await getCollection(COLLECTIONS.LIKES);
            usersCollection = await getCollection(COLLECTIONS.USERS);
        } catch (error: any) {
            console.warn("⚠️  MongoDB collections not available:", error?.message);
            // Return posts with minimal data if collections are not available
            const minimalPosts = posts.map((p: any) => ({
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
            posts.map(async (p: any) => {
                const postId = toStringId(p._id);
                const postUserId = p.userId;

                // Get user (with error handling)
                let user = null;
                try {
                    const userIdObj = toObjectId(postUserId);
                    user = userIdObj ? await usersCollection.findOne({ _id: userIdObj }) : null;
                } catch (error: any) {
                    console.warn("⚠️  Error fetching user:", error?.message);
                }

                // Get comments (with error handling)
                let comments: any[] = [];
                try {
                    comments = await commentsCollection
                        .find({ postId: postId })
                        .toArray();
                } catch (error: any) {
                    console.warn("⚠️  Error fetching comments:", error?.message);
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
                } catch (error: any) {
                    console.warn("⚠️  Error checking like:", error?.message);
                }

                // Count likes (with error handling)
                let likesCount = 0;
                try {
                    likesCount = await likesCollection.countDocuments({ postId: postId });
                } catch (error: any) {
                    console.warn("⚠️  Error counting likes:", error?.message);
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

        return NextResponse.json({ posts: formattedPosts }, { status: 200 });
    } catch (error: any) {
        console.error("❌ Error fetching posts:", error);
        // Return empty array instead of error to prevent UI crashes
        return NextResponse.json({ posts: [], error: "Failed to fetch posts" }, { status: 200 });
    }
}
