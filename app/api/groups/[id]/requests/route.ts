import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId, COLLECTIONS } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!groupId) {
      return NextResponse.json({ error: "Group ID is required" }, { status: 400 });
    }

    const idObj = toObjectId(groupId);
    if (!idObj) {
      return NextResponse.json({ error: "Invalid Group ID" }, { status: 400 });
    }

    const groupsCollection = await getCollection("groups");
    const usersCollection = await getCollection("users");

    // Check if user is admin
    const group = await groupsCollection.findOne({ _id: idObj });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.adminId !== session.user.id) {
      return NextResponse.json({ error: "Only group admin can view requests" }, { status: 403 });
    }

    // Get join requests
    const requests = group.joinRequests || [];

    // Get user details for each request
    const userIds = requests.map((req: any) => req.userId);
    const users = await usersCollection.find({
      _id: { $in: userIds }
    }).toArray();

    const userMap = users.reduce((map, user) => {
      map[user._id.toString()] = user;
      return map;
    }, {} as Record<string, any>);

    const formattedRequests = requests.map((req: any) => ({
      id: req._id || req.id,
      userId: req.userId,
      user: {
        id: req.userId,
        name: userMap[req.userId]?.name,
        avatar: userMap[req.userId]?.image || userMap[req.userId]?.avatar
      },
      reason: req.reason,
      requestedAt: req.requestedAt,
      status: req.status || "pending"
    }));

    return NextResponse.json({ requests: formattedRequests });

  } catch (error) {
    console.error("Error fetching join requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!groupId) {
      return NextResponse.json({ error: "Group ID is required" }, { status: 400 });
    }

    const idObj = toObjectId(groupId);
    if (!idObj) {
      return NextResponse.json({ error: "Invalid Group ID" }, { status: 400 });
    }

    const groupsCollection = await getCollection("groups");

    // Check if group exists and is private
    const group = await groupsCollection.findOne({ _id: idObj });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check if user is already a member
    if (group.members?.includes(session.user.id)) {
      return NextResponse.json({ error: "You are already a member of this group" }, { status: 400 });
    }

    // Check if user is banned
    if (group.bannedMembers?.includes(session.user.id)) {
      return NextResponse.json({ error: "You are banned from this group" }, { status: 403 });
    }

    const body = await request.json();
    const { reason } = body;

    // Create join request
    const joinRequest = {
      id: Date.now().toString(),
      userId: session.user.id,
      reason: reason || "",
      requestedAt: new Date(),
      status: "pending"
    };

    await groupsCollection.updateOne(
      { _id: idObj },
      {
        $push: { joinRequests: joinRequest },
        $set: { updatedAt: new Date() }
      }
    );

    return NextResponse.json({ message: "Join request sent successfully" });

  } catch (error) {
    console.error("Error creating join request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


