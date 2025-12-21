import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserById, toStringId, toObjectId } from "@/lib/db";
import { getCollection } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/db";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await findUserById(id);

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Get user's post count
        const postsCollection = await getCollection(COLLECTIONS.POSTS);
        const postsCount = await postsCollection.countDocuments({ userId: id });

        // Get followers and following counts
        const followsCollection = await getCollection(COLLECTIONS.FOLLOWS);
        const followersCount = await followsCollection.countDocuments({ followingId: id });
        const followingCount = await followsCollection.countDocuments({ followerId: id });

        // Check if current user follows this user
        const session = await getServerSession(authOptions);
        let isFollowing = false;
        if (session?.user?.id) {
            const follow = await followsCollection.findOne({
                followerId: session.user.id,
                followingId: id,
            });
            isFollowing = !!follow;
        }

        return NextResponse.json({
            id: toStringId(user._id),
            name: user.name || null,
            email: user.email || null,
            username: user.username || null,
            avatar: user.avatar || null,
            image: user.image || user.avatar || null,
            bio: user.bio || null,
            location: user.location || null,
            website: user.website || null,
            verified: user.verified || false,
            createdAt: user.createdAt,
            postsCount,
            followersCount,
            followingCount,
            isFollowing,
        });
    } catch (error: any) {
        console.error("Error fetching user:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}







