import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { subscription } = await req.json();
        if (!subscription) {
            return NextResponse.json({ error: "Subscription required" }, { status: 400 });
        }

        const userId = session.user.id;
        const userIdObj = toObjectId(userId);
        if (!userIdObj) {
            return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
        }

        const usersCollection = await getCollection("users");

        // Store subscription in user model or a separate collection
        // We'll store it as an array of subscriptions per user to support multiple browsers
        await usersCollection.updateOne(
            { _id: userIdObj },
            {
                $addToSet: {
                    pushSubscriptions: subscription
                }
            }
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error subscribing to push notifications:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { endpoint } = await req.json();
        const userId = session.user.id;
        const userIdObj = toObjectId(userId);
        if (!userIdObj) {
            return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
        }

        const usersCollection = await getCollection("users");

        await usersCollection.updateOne(
            { _id: userIdObj },
            {
                $pull: {
                    pushSubscriptions: { endpoint }
                }
            }
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error unsubscribing from push notifications:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
