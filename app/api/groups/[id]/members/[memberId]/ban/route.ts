import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId, COLLECTIONS } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId, memberId } = await params;

    if (!groupId || !memberId) {
      return NextResponse.json({ error: "Group ID and Member ID are required" }, { status: 400 });
    }

    const idObj = toObjectId(groupId);
    if (!idObj) {
      return NextResponse.json({ error: "Invalid Group ID" }, { status: 400 });
    }

    const groupsCollection = await getCollection("groups");

    // Check if user is admin
    const group = await groupsCollection.findOne({ _id: idObj });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.adminId !== session.user.id) {
      return NextResponse.json({ error: "Only group admin can ban members" }, { status: 403 });
    }

    // Cannot ban admin
    if (memberId === group.adminId) {
      return NextResponse.json({ error: "Cannot ban group admin" }, { status: 400 });
    }

    const groupMembersCollection = await getCollection(COLLECTIONS.GROUP_MEMBERS);

    // Remove member from groupMembers collection
    await groupMembersCollection.deleteOne({
      groupId: groupId,
      userId: memberId,
    });

    // Add to banned list in groups collection
    await groupsCollection.updateOne(
      { _id: idObj },
      {
        $addToSet: {
          bannedMembers: memberId
        },
        $inc: { membersCount: -1 },
        $set: { updatedAt: new Date() }
      }
    );

    return NextResponse.json({ message: "Member banned successfully" });

  } catch (error) {
    console.error("Error banning member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
