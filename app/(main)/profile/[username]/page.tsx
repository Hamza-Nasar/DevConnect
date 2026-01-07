import { findUserByUsername, findUserById, toStringId, getCollection, COLLECTIONS } from "@/lib/db";
import ProfileClient from "./ProfileClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface Props {
    params: Promise<{ username: string }>;
}

export default async function ProfilePage({ params }: Props) {
    const { username } = await params;

    // Try to find user by username first
    let user = await findUserByUsername(username);

    // If not found by username, try to find by ID (for cases where ID is passed)
    if (!user) {
        try {
            user = await findUserById(username);
        } catch (error) {
            // Invalid ID format, continue with null user
        }
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center text-white">
                    <h1 className="text-2xl font-bold mb-2">User not found</h1>
                    <p className="text-gray-400">The user you're looking for doesn't exist.</p>
                </div>
            </div>
        );
    }

    const userId = toStringId(user._id);
    if (!userId) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center text-white">
                    <h1 className="text-2xl font-bold mb-2">Invalid user ID</h1>
                </div>
            </div>
        );
    }

    // Fetch user's posts
    const postsCollection = await getCollection(COLLECTIONS.POSTS);
    const postsRaw = await postsCollection
        .find({ userId: userId })
        .sort({ createdAt: -1 })
        .limit(20) // Limit to recent 20 for now
        .toArray();

    const posts = postsRaw.map((p) => ({
        id: toStringId(p._id) || "",
        content: p.content,
        images: p.images || [],
        createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
        likesCount: p.likesCount || 0,
        commentsCount: p.commentsCount || 0,
        sharesCount: p.sharesCount || 0,
        viewsCount: p.viewsCount || 0,
    }));

    // Check if current user is following this profile
    const session = await getServerSession(authOptions);
    let isFollowing = false;
    let isOwnProfile = false;

    if (session?.user?.id) {
        isOwnProfile = session.user.id === userId;
        if (!isOwnProfile) {
            const followsCollection = await getCollection(COLLECTIONS.FOLLOWS);
            const follow = await followsCollection.findOne({
                followerId: session.user.id,
                followingId: userId,
            });
            isFollowing = !!follow;
        }
    }

    const userData = {
        id: userId,
        name: user.name || null,
        username: user.username || null,
        email: user.email || null,
        image: user.image || null,
        avatar: user.avatar || null,
        bio: user.bio || null,
        skills: user.skills || [],
        location: user.location || null,
        website: user.website || null,
        isPrivate: user.isPrivate || false,
        verified: user.verified || false,
        createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
        followersCount: user.followersCount || 0,
        followingCount: user.followingCount || 0,
        postsCount: user.postsCount || 0,
    };

    return (
        <ProfileClient
            user={userData}
            posts={posts}
            isOwnProfile={isOwnProfile}
            isFollowing={isFollowing}
            followersCount={userData.followersCount}
            followingCount={userData.followingCount}
            postsCount={userData.postsCount}
        />
    );
}
