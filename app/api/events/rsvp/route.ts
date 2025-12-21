import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";

// RSVP to event
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventId, rsvp } = await req.json(); // rsvp: "yes" | "no" | "maybe"

    if (!eventId || !rsvp) {
      return NextResponse.json(
        { error: "Event ID and RSVP status required" },
        { status: 400 }
      );
    }

    const eventsCollection = await getCollection("events");
    const eventIdObj = toObjectId(eventId);
    if (!eventIdObj) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    const event = await eventsCollection.findOne({ _id: eventIdObj });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Update participants array
    const participants = event.participants || [];
    const existingIndex = participants.findIndex(
      (p: any) => p.userId === session.user.id
    );

    if (existingIndex >= 0) {
      participants[existingIndex] = {
        userId: session.user.id,
        rsvp,
        rsvpAt: new Date().toISOString(),
      };
    } else {
      participants.push({
        userId: session.user.id,
        rsvp,
        rsvpAt: new Date().toISOString(),
      });
    }

    await eventsCollection.updateOne(
      { _id: eventIdObj },
      { $set: { participants } }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error RSVPing to event:", error);
    return NextResponse.json(
      { error: "Failed to RSVP to event" },
      { status: 500 }
    );
  }
}
