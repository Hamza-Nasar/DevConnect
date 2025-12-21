import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";

// Mute/unmute topics
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topic, muted } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: "Topic required" }, { status: 400 });
    }

    const mutedTopicsCollection = await getCollection("mutedTopics");

    if (muted) {
      await mutedTopicsCollection.updateOne(
        { userId: session.user.id, topic },
        {
          $set: {
            userId: session.user.id,
            topic,
            mutedAt: new Date().toISOString(),
          },
        },
        { upsert: true }
      );
    } else {
      await mutedTopicsCollection.deleteOne({
        userId: session.user.id,
        topic,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error muting topic:", error);
    return NextResponse.json(
      { error: "Failed to mute/unmute topic" },
      { status: 500 }
    );
  }
}



