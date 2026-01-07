import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId, COLLECTIONS } from "@/lib/db";

export async function DELETE(
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
    const groupsCollection = await getCollection(COLLECTIONS.GROUPS);
    const groupMembersCollection = await getCollection(COLLECTIONS.GROUP_MEMBERS);

    const group = await groupsCollection.findOne({ _id: idObj });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check if admin
    if (group.adminId === session.user.id) {
      return NextResponse.json(
        { error: "Admin cannot leave group" },
        { status: 400 }
      );
    }

    // Remove member
    await groupMembersCollection.deleteOne({
      groupId: id,
      userId: session.user.id,
    });

    // Update member count
    await groupsCollection.updateOne(
      { _id: idObj },
      { $inc: { membersCount: -1 } }
    );

    // Emit real-time event for group member left
    const { emitToRoom } = await import("@/lib/socket-server");
    emitToRoom(`group:${id}`, "group_member_left", {
      groupId: id,
      memberId: session.user.id,
      membersCount: group.membersCount - 1
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error leaving group:", error);
    return NextResponse.json(
      { error: "Failed to leave group" },
      { status: 500 }
    );
  }
}




