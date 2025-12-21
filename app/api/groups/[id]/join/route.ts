import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const idObj = toObjectId(id);
    if (!idObj) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }
    const groupsCollection = await getCollection("groups");
    const groupMembersCollection = await getCollection("groupMembers");

    const group = await groupsCollection.findOne({ _id: idObj });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check if already a member
    const existing = await groupMembersCollection.findOne({
      groupId: id,
      userId: session.user.id,
    });

    if (existing) {
      return NextResponse.json({ error: "Already a member" }, { status: 400 });
    }

    // Add member
    await groupMembersCollection.insertOne({
      groupId: id,
      userId: session.user.id,
      role: "member",
      joinedAt: new Date().toISOString(),
    });

    // Update member count
    await groupsCollection.updateOne(
      { _id: idObj },
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
