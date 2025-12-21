import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserById, toStringId, toObjectId } from "@/lib/db";
import { getCollection } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/db";
import { getSocketInstance } from "@/lib/socket-server";

// Toggle follow
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { followingId } = await req.json();
        if (!followingId) {
            return NextResponse.json({ error: "Following ID required" }, { status: 400 });
        }

        if (session.user.id === followingId) {
            return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
        }

        const followsCollection = await getCollection(COLLECTIONS.FOLLOWS);
        const usersCollection = await getCollection(COLLECTIONS.USERS);

        const existing = await followsCollection.findOne({
            followerId: session.user.id,
            followingId: followingId
        });

        let isFollowing = false;
        let isRequested = false;

        if (existing) {
            // Unfollow / Cancel Request
            await followsCollection.deleteOne({ _id: existing._id });

            // Only decrement counts if it was an accepted follow
            if (existing.status !== 'pending') {
                const followerIdObj = toObjectId(session.user.id);
                const followingIdObj = toObjectId(followingId);

                if (followerIdObj) {
                    await usersCollection.updateOne(
                        { _id: followerIdObj },
                        { $inc: { followingCount: -1 } }
                    );
                }
                if (followingIdObj) {
                    await usersCollection.updateOne(
                        { _id: followingIdObj },
                        { $inc: { followersCount: -1 } }
                    );
                }
            }
        } else {
            // Follow / Request Follow
            const targetUser = await findUserById(followingId);
            if (!targetUser) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }

            const isPrivate = targetUser.isPrivate || false;
            const status = isPrivate ? 'pending' : 'accepted';

            await followsCollection.insertOne({
                followerId: session.user.id,
                followingId: followingId,
                status: status,
                createdAt: new Date(),
            });

            if (status === 'accepted') {
                isFollowing = true;

                // Update counts
                const followerIdObj = toObjectId(session.user.id);
                const followingIdObj = toObjectId(followingId);

                if (followerIdObj) {
                    await usersCollection.updateOne(
                        { _id: followerIdObj },
                        { $inc: { followingCount: 1 } }
                    );
                }
                if (followingIdObj) {
                    await usersCollection.updateOne(
                        { _id: followingIdObj },
                        { $inc: { followersCount: 1 } }
                    );
                }

                // Notification & Real-time event
                const notificationsCollection = await getCollection(COLLECTIONS.NOTIFICATIONS);
                const follower = await findUserById(session.user.id);

                await notificationsCollection.insertOne({
                    userId: followingId,
                    type: "follow",
                    title: "New Follower",
                    message: `${follower?.name || "Someone"} started following you`,
                    link: `/profile/${follower?.username || session.user.id}`,
                    read: false,
                    createdAt: new Date(),
                });

                // Socket.io
                const io = getSocketInstance();
                if (io) {
                    io.to(`user:${followingId}`).emit("new_follower", {
                        followerId: session.user.id,
                        follower: {
                            id: session.user.id,
                            name: follower?.name,
                            username: follower?.username,
                            avatar: follower?.avatar || follower?.image
                        }
                    });
                }
            } else {
                isRequested = true;

                // Notification for Request
                const notificationsCollection = await getCollection(COLLECTIONS.NOTIFICATIONS);
                const follower = await findUserById(session.user.id);

                await notificationsCollection.insertOne({
                    userId: followingId,
                    type: "follow_request",
                    title: "Follow Request",
                    message: `${follower?.name || "Someone"} requested to follow you`,
                    link: `/notifications`, // Or requests page
                    read: false,
                    createdAt: new Date(),
                });

                // Socket.io
                const io = getSocketInstance();
                if (io) {
                    io.to(`user:${followingId}`).emit("follow_request", {
                        followerId: session.user.id,
                        follower: {
                            id: session.user.id,
                            name: follower?.name,
                            username: follower?.username,
                            avatar: follower?.avatar || follower?.image
                        }
                    });
                }
            }
        }

        return NextResponse.json({ isFollowing, isRequested });
    } catch (error: any) {
        console.error("Error toggling follow:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
