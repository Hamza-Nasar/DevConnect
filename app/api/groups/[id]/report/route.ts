import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId, COLLECTIONS } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;
    const idObj = toObjectId(groupId);
    if (!idObj) {
      return NextResponse.json({ error: "Invalid Group ID" }, { status: 400 });
    }

    const body = await req.json();
    const { reason, description } = body;

    if (!reason) {
      return NextResponse.json({ error: "Report reason is required" }, { status: 400 });
    }

    const groupsCollection = await getCollection(COLLECTIONS.GROUPS);
    const reportsCollection = await getCollection(COLLECTIONS.REPORTS);

    const group = await groupsCollection.findOne({ _id: idObj });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Create report
    const report = {
      type: "group",
      targetId: groupId,
      targetType: "group",
      reporterId: session.user.id,
      reason,
      description: description || "",
      status: "pending",
      createdAt: new Date().toISOString(),
      groupInfo: {
        name: group.name,
        adminId: group.adminId,
      }
    };

    const result = await reportsCollection.insertOne(report);

    // Emit real-time event (could notify moderators/admins)
    const { emitToRoom } = await import("@/lib/socket-server");
    emitToRoom(`group:${groupId}`, "group_reported", {
      groupId,
      userId: session.user.id,
      groupName: group.name,
      reason
    });

    return NextResponse.json({
      message: "Group reported successfully",
      reportId: result.insertedId.toString()
    });
  } catch (error: any) {
    console.error("Error reporting group:", error);
    return NextResponse.json(
      { error: "Failed to report group" },
      { status: 500 }
    );
  }
}
