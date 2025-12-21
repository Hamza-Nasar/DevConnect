import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";
import { getSocketInstance } from "@/lib/socket-server";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const usersCollection = await getCollection("users");
        const currentUser = await usersCollection.findOne({
            $or: [
                { _id: toObjectId(session.user.id) || session.user.id as any },
                { id: session.user.id }
            ]
        });

        const userIds = [session.user.id];
        if (currentUser) {
            const dbId = currentUser._id.toString();
            const oauthId = currentUser.id;
            if (dbId && !userIds.includes(dbId)) userIds.push(dbId);
            if (oauthId && !userIds.includes(oauthId)) userIds.push(oauthId);
        }

        const { id: senderId } = await params;
        const messagesCollection = await getCollection("messages");

        // Find unread messages first to get their IDs
        const unreadMessages = await messagesCollection
            .find({
                senderId: senderId,
                receiverId: { $in: userIds },
                read: false,
            })
            .project({ _id: 1 })
            .toArray();

        if (unreadMessages.length > 0) {
            // Update matched messages
            await messagesCollection.updateMany(
                {
                    _id: { $in: unreadMessages.map((m) => m._id) },
                },
                { $set: { read: true } }
            );

            // Notify sender via socket for EACH message (to match Client logic)
            const socket = getSocketInstance();
            if (socket) {
                unreadMessages.forEach((msg) => {
                    // Emit to the SENDER (who is user:senderId)
                    socket.to(`user:${senderId}`).emit("message_read", {
                        messageId: msg._id.toString(),
                        userId: session.user.id,
                    });
                });
            }
        }

        return NextResponse.json({ success: true, count: unreadMessages.length });
    } catch (error: any) {
        console.error("Error marking messages as read:", error);
        return NextResponse.json(
            { error: "Failed to mark messages as read" },
            { status: 500 }
        );
    }
}
