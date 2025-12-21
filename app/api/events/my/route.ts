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

    const rsvpsCollection = await getCollection("eventRSVPs");
    const eventsCollection = await getCollection("events");
    const usersCollection = await getCollection("users");

    const rsvps = await rsvpsCollection
      .find({ userId: session.user.id, attending: true })
      .toArray();

    const events = await Promise.all(
      rsvps.map(async (rsvp) => {
        const event = await eventsCollection.findOne({ _id: rsvp.eventId });
        if (event && event.organizerId) {
          const organizer = await usersCollection.findOne({ _id: event.organizerId });
          event.organizer = organizer;
        }
        return { ...event, isAttending: true };
      })
    );

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error("Error fetching my events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}







