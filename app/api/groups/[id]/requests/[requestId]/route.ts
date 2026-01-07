import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId, COLLECTIONS } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId, requestId } = await params;

    if (!groupId || !requestId) {
      return NextResponse.json({ error: "Group ID and Request ID are required" }, { status: 400 });
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
      return NextResponse.json({ error: "Only group admin can manage requests" }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Must be 'approve' or 'reject'" }, { status: 400 });
    }

    // Find and update the request
    const joinRequests = group.joinRequests || [];
    const requestIndex = joinRequests.findIndex((req: any) =>
      req.id === requestId || req._id === requestId
    );

    if (requestIndex === -1) {
      return NextResponse.json({ error: "Join request not found" }, { status: 404 });
    }

    const joinRequest = joinRequests[requestIndex];
    const userId = joinRequest.userId;

    // Update request status
    joinRequests[requestIndex].status = action === "approve" ? "approved" : "rejected";

    const updateData: any = {
      joinRequests: joinRequests,
      updatedAt: new Date()
    };

    // If approving, add user to members
    if (action === "approve") {
      // Check if user is already a member
      if (!group.members?.includes(userId)) {
        updateData.$push = { members: userId };
        updateData.$set = {
          ...updateData.$set,
          [`memberJoinDates.${userId}`]: new Date(),
          updatedAt: new Date()
        };
      }
    }

    await groupsCollection.updateOne(
      { _id: idObj },
      updateData
    );

    // Emit real-time event for join request action
    const { emitToRoom } = await import("@/lib/socket-server");
    if (action === "approve") {
      // Emit member joined event
      const { getUsersCollection } = await import("@/lib/db-collections");
      const usersCollection = await getUsersCollection();
      const user = await usersCollection.findOne({ _id: userId });

      if (user) {
        const memberData = {
          id: user._id.toString(),
          name: user.name,
          username: user.username,
          avatar: user.image || user.avatar,
          role: "member",
          joinedAt: new Date().toISOString()
        };

        emitToRoom(`group:${groupId}`, "group_member_joined", {
          groupId,
          member: memberData,
          membersCount: group.members?.length || 0 + 1
        });
      }
    }

    return NextResponse.json({
      message: `Join request ${action}d successfully`
    });

  } catch (error) {
    console.error("Error processing join request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


