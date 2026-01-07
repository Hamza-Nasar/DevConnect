import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get("category");
    const query = searchParams.get("q");

    const groupsCollection = await getCollection(COLLECTIONS.GROUPS);
    const usersCollection = await getCollection(COLLECTIONS.USERS);
    const groupMembersCollection = await getCollection(COLLECTIONS.GROUP_MEMBERS);

    let filter: any = {};
    if (category && category !== "all") {
      filter.category = category;
    }
    if (query) {
      filter.$or = [
        { name: new RegExp(query, "i") },
        { description: new RegExp(query, "i") },
      ];
    }

    const groups = await groupsCollection
      .find(filter)
      .sort({ membersCount: -1 })
      .limit(50)
      .toArray();

    // Populate admin and check membership
    const formattedGroups = [];
    for (const group of groups) {
      if (group.adminId) {
        const admin = await usersCollection.findOne({ _id: group.adminId });
        group.admin = admin || { id: group.adminId };
      }

      const membership = await groupMembersCollection.findOne({
        groupId: group._id.toString(),
        userId: session.user.id,
      });

      formattedGroups.push({
        id: group._id.toString(),
        name: group.name,
        description: group.description,
        avatar: group.avatar,
        coverImage: group.coverImage,
        membersCount: group.membersCount || 0,
        postsCount: group.postsCount || 0,
        isPrivate: group.isPrivate || false,
        isMember: !!membership,
        isAdmin: group.adminId === session.user.id,
        category: group.category,
        createdAt: group.createdAt,
        admin: group.admin,
      });
    }

    return NextResponse.json({ groups: formattedGroups });
  } catch (error: any) {
    console.error("Error fetching groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch groups" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, category, isPrivate } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 }
      );
    }

    const groupsCollection = await getCollection(COLLECTIONS.GROUPS);
    const groupMembersCollection = await getCollection(COLLECTIONS.GROUP_MEMBERS);

    const group = {
      name,
      description: description || "",
      category: category || "general",
      isPrivate: isPrivate || false,
      adminId: session.user.id,
      membersCount: 1,
      postsCount: 0,
      createdAt: new Date().toISOString(),
    };

    const result = await groupsCollection.insertOne(group);

    // Add creator as member
    await groupMembersCollection.insertOne({
      groupId: result.insertedId,
      userId: session.user.id,
      role: "admin",
      joinedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      group: {
        id: result.insertedId.toString(),
        ...group,
      },
    });
  } catch (error: any) {
    console.error("Error creating group:", error);
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 }
    );
  }
}
