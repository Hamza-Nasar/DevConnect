import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const streamsCollection = await getCollection("liveStreams");
    const usersCollection = await getCollection("users");

    const streams = await streamsCollection
      .find({ isLive: true })
      .sort({ viewersCount: -1 })
      .limit(20)
      .toArray();

    // Populate streamer data
    for (const stream of streams) {
      if (stream.streamerId) {
        const user = await usersCollection.findOne({ _id: stream.streamerId });
        stream.streamer = user || { id: stream.streamerId };
      }
    }

    return NextResponse.json({ streams });
  } catch (error: any) {
    console.error("Error fetching live streams:", error);
    return NextResponse.json(
      { error: "Failed to fetch live streams" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, category, thumbnail } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const streamsCollection = await getCollection("liveStreams");
    const stream = {
      title,
      description: description || "",
      category: category || "General",
      thumbnail: thumbnail || undefined,
      streamerId: session.user.id,
      viewersCount: 0,
      likesCount: 0,
      isLive: true,
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const result = await streamsCollection.insertOne(stream);

    return NextResponse.json({
      stream: {
        id: result.insertedId.toString(),
        ...stream,
      },
    });
  } catch (error: any) {
    console.error("Error creating live stream:", error);
    return NextResponse.json(
      { error: "Failed to create live stream" },
      { status: 500 }
    );
  }
}







