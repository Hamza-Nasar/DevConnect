import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";

// Add or remove a reaction from a message
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: messageId } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { emoji } = await req.json();
        if (!emoji) {
            return NextResponse.json({ error: "Emoji required" }, { status: 400 });
        }

        const userId = session.user.id;
        const messagesCollection = await getCollection("messages");

        const messageIdObj = toObjectId(messageId);
        if (!messageIdObj) {
            return NextResponse.json({ error: "Invalid message ID" }, { status: 400 });
        }

        const message = await messagesCollection.findOne({ _id: messageIdObj });
        if (!message) {
            return NextResponse.json({ error: "Message not found" }, { status: 404 });
        }

        let reactions = message.reactions || [];
        const reactionIndex = reactions.findIndex((r: any) => r.emoji === emoji);

        if (reactionIndex > -1) {
            // Toggle reaction: if user already reacted with this emoji, remove them
            const userIndex = reactions[reactionIndex].users.indexOf(userId);
            if (userIndex > -1) {
                reactions[reactionIndex].users.splice(userIndex, 1);
                reactions[reactionIndex].count -= 1;
                // If count becomes 0, remove the reaction object entirely
                if (reactions[reactionIndex].count <= 0) {
                    reactions.splice(reactionIndex, 1);
                }
            } else {
                reactions[reactionIndex].users.push(userId);
                reactions[reactionIndex].count += 1;
            }
        } else {
            // Add new reaction type
            reactions.push({
                emoji,
                users: [userId],
                count: 1
            });
        }

        await messagesCollection.updateOne(
            { _id: messageIdObj },
            { $set: { reactions } }
        );

        return NextResponse.json({ reactions });
    } catch (error: any) {
        console.error("Error toggling message reaction:", error);
        return NextResponse.json(
            { error: "Failed to toggle reaction" },
            { status: 500 }
        );
    }
}
