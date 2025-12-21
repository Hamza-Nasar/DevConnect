import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserById, toStringId, toObjectId } from "@/lib/db";
import { getCollection } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/db";
import { getSocketInstance } from "@/lib/socket-server";

// Create a story
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { image, video, text } = await req.json();

        if (!image && !video && !text) {
            return NextResponse.json({ error: "Image, video, or text required" }, { status: 400 });
        }

        const storiesCollection = await getCollection(COLLECTIONS.STORIES);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

        const result = await storiesCollection.insertOne({
            userId: session.user.id,
            image: image || null,
            video: video || null,
            text: text || null,
            views: 0,
            expiresAt,
            createdAt: new Date(),
        });

        const story = await storiesCollection.findOne({ _id: result.insertedId });

        const user = await findUserById(session.user.id);

        const storyData = {
            id: toStringId(story?._id),
            userId: story?.userId,
            image: story?.image || null,
            video: story?.video || null,
            text: story?.text || null,
            views: story?.views || 0,
            expiresAt: story?.expiresAt,
            createdAt: story?.createdAt,
            user: {
                id: toStringId(user?._id),
                name: user?.name || null,
                avatar: user?.avatar || null,
                image: user?.image || user?.avatar || null,
            },
        };

        // Emit real-time event
        try {
            const io = getSocketInstance();
            if (io) {
                io.emit("new_story", storyData);
            }
        } catch (error) {
            console.warn("Socket emission failed:", error);
        }

        return NextResponse.json(storyData, { status: 201 });
    } catch (error: any) {
        console.error("Error creating story:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

// Get stories
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");

        const storiesCollection = await getCollection(COLLECTIONS.STORIES);
        const usersCollection = await getCollection(COLLECTIONS.USERS);

        const now = new Date();
        const query: any = { expiresAt: { $gt: now } };

        if (userId) {
            query.userId = userId;
        }

        const stories = await storiesCollection
            .find(query)
            .sort({ createdAt: -1 })
            .toArray();

        const formattedStories = await Promise.all(
            stories.map(async (story: any) => {
                const userIdObj = toObjectId(story.userId);
                const user = userIdObj ? await usersCollection.findOne({ _id: userIdObj }) : null;
                return {
                    id: toStringId(story._id),
                    userId: story.userId,
                    image: story.image || null,
                    video: story.video || null,
                    text: story.text || null,
                    views: story.views || 0,
                    expiresAt: story.expiresAt,
                    createdAt: story.createdAt,
                    user: {
                        id: toStringId(user?._id),
                        name: user?.name || null,
                        avatar: user?.avatar || null,
                        image: user?.image || user?.avatar || null,
                    },
                };
            })
        );

        return NextResponse.json({ stories: formattedStories });
    } catch (error: any) {
        console.error("Error fetching stories:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
