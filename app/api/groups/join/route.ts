import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { groupId } = body;

    if (!groupId) {
      return NextResponse.json(
        { error: "Group ID is required" },
        { status: 400 }
      );
    }

    const membersCollection = await getCollection(COLLECTIONS.GROUP_MEMBERS);
    const groupsCollection = await getCollection("groups");

    // Check if already a member
    const existing = await membersCollection.findOne({
      groupId,
      userId: session.user.id,
    });

    if (existing) {
      return NextResponse.json(
        { error: "Already a member" },
        { status: 400 }
      );
    }

    // Add member
    await membersCollection.insertOne({
      groupId,
      userId: session.user.id,
      role: "member",
      joinedAt: new Date().toISOString(),
    });

    // Update group member count
    await groupsCollection.updateOne(
      { _id: groupId },
      { $inc: { membersCount: 1 } }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error joining group:", error);
    return NextResponse.json(
      { error: "Failed to join group" },
      { status: 500 }
    );
  }
}







