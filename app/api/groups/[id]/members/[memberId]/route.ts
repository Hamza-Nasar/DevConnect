import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId, COLLECTIONS } from "@/lib/db";

export async function PATCH(
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

    const groupsCollection = await getCollection(COLLECTIONS.GROUPS);
    const groupMembersCollection = await getCollection(COLLECTIONS.GROUP_MEMBERS);

    // Check if user is admin
    const group = await groupsCollection.findOne({ _id: idObj });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.adminId !== session.user.id) {
      return NextResponse.json({ error: "Only group admin can manage members" }, { status: 403 });
    }

    // Check if member exists in group
    const memberRecord = await groupMembersCollection.findOne({
      groupId: groupId,
      userId: memberId,
    });

    if (!memberRecord) {
      return NextResponse.json({ error: "Member not found in group" }, { status: 404 });
    }

    const body = await request.json();
    const { role } = body;

    // Update member role in groupMembers collection
    await groupMembersCollection.updateOne(
      { groupId: groupId, userId: memberId },
      {
        $set: {
          role: role,
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({ message: "Member role updated successfully" });

  } catch (error) {
    console.error("Error updating member role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const groupsCollection = await getCollection(COLLECTIONS.GROUPS);
    const groupMembersCollection = await getCollection(COLLECTIONS.GROUP_MEMBERS);

    // Check if user is admin
    const group = await groupsCollection.findOne({ _id: idObj });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.adminId !== session.user.id) {
      return NextResponse.json({ error: "Only group admin can remove members" }, { status: 403 });
    }

    // Cannot remove admin
    if (memberId === group.adminId) {
      return NextResponse.json({ error: "Cannot remove group admin" }, { status: 400 });
    }

    // Remove member from groupMembers collection
    await groupMembersCollection.deleteOne({
      groupId: groupId,
      userId: memberId,
    });

    // Update group member count
    const remainingMembers = await groupMembersCollection.countDocuments({ groupId: groupId });
    await groupsCollection.updateOne(
      { _id: idObj },
      {
        $set: {
          membersCount: remainingMembers,
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({ message: "Member removed successfully" });

  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
