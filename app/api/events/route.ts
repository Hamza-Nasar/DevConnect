import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";

// Get events
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type"); // "session" | "ama" | "live"
    const upcoming = searchParams.get("upcoming") === "true";

    const eventsCollection = await getCollection("events");
    const query: any = {};
    if (type) query.eventType = type;
    if (upcoming) {
      query.startTime = { $gte: new Date().toISOString() };
    }

    const events = await eventsCollection
      .find(query)
      .sort({ startTime: 1 })
      .limit(50)
      .toArray();

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

// Create event
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      title,
      description,
      eventType,
      startTime,
      endTime,
      maxParticipants,
      isPublic,
    } = await req.json();

    if (!title || !eventType || !startTime) {
      return NextResponse.json(
        { error: "Title, event type, and start time required" },
        { status: 400 }
      );
    }

    const eventsCollection = await getCollection("events");

    const event = {
      title,
      description: description || null,
      eventType, // "session" | "ama" | "live"
      hostId: session.user.id,
      startTime,
      endTime: endTime || null,
      maxParticipants: maxParticipants || null,
      isPublic: isPublic !== false,
      participants: [],
      createdAt: new Date().toISOString(),
    };

    const result = await eventsCollection.insertOne(event);

    return NextResponse.json({
      event: {
        id: result.insertedId.toString(),
        ...event,
      },
    });
  } catch (error: any) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
