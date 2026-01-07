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
    console.log('🔍 [Group API] Fetching group with params:', params);
    const { id: groupId } = await params;
    console.log('🔍 [Group API] Group ID:', groupId);

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('❌ [Group API] Unauthorized - no session');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!groupId) {
      console.log('❌ [Group API] No groupId provided');
      return NextResponse.json({ error: "Group ID is required" }, { status: 400 });
    }

    const idObj = toObjectId(groupId);
    if (!idObj) {
      console.log('❌ [Group API] Invalid Group ID format:', groupId);
      return NextResponse.json({ error: "Invalid Group ID" }, { status: 400 });
    }

    console.log('🔍 [Group API] Getting collections...');
    const groupsCollection = await getCollection(COLLECTIONS.GROUPS);
    const usersCollection = await getCollection(COLLECTIONS.USERS);
    const groupMembersCollection = await getCollection(COLLECTIONS.GROUP_MEMBERS);

    console.log('🔍 [Group API] Fetching group details...');
    // Get group details
    const group = await groupsCollection.findOne({ _id: idObj });
    if (!group) {
      console.log('❌ [Group API] Group not found:', groupId);
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    console.log('✅ [Group API] Group found:', group.name);

    console.log('🔍 [Group API] Checking membership...');
    // Check membership using groupMembers collection
    const membership = await groupMembersCollection.findOne({
      groupId: groupId,
      userId: session.user.id,
    });

    const isMember = !!membership;
    const isAdmin = group.adminId?.toString() === session.user.id;
    console.log('✅ [Group API] Membership check - isMember:', isMember, 'isAdmin:', isAdmin);

    // If group is private and user is not a member or admin, don't show it
    if (group.isPrivate && !isMember && !isAdmin) {
      return NextResponse.json({ error: "You don't have permission to view this group" }, { status: 403 });
    }

    // Get admin user details
    const admin = await usersCollection.findOne({ _id: group.adminId });

    // Get member details (only for members and admins)
    let members: any[] = [];
    if (isMember || isAdmin) {
      const memberRecords = await groupMembersCollection
        .find({ groupId: groupId })
        .sort({ joinedAt: 1 })
        .toArray();

      const memberIds = memberRecords.map(m => m.userId);
      if (memberIds.length > 0) {
        const memberUsers = await usersCollection.find({
          _id: { $in: memberIds }
        }).toArray();

        const userMap = memberUsers.reduce((map, user) => {
          map[user._id.toString()] = user;
          return map;
        }, {} as Record<string, any>);

        members = memberRecords.map(record => {
          const user = userMap[record.userId];
          if (!user) {
            console.warn('⚠️ [Group API] User not found for member:', record.userId);
            return {
              id: record.userId,
              name: "Unknown User",
              username: null,
              avatar: null,
              role: record.role || "member",
              joinedAt: record.joinedAt
            };
          }
          return {
            id: user._id.toString(),
            name: user.name,
            username: user.username,
            avatar: user.image || user.avatar,
            role: record.role || (user._id.toString() === group.adminId?.toString() ? "admin" : "member"),
            joinedAt: record.joinedAt
          };
        });
      }
    }

    // Get recent posts (only for members)
    let posts: any[] = [];
    if (isMember || isAdmin) {
      const postsCollection = await getCollection("posts");
      const groupPosts = await postsCollection
        .find({ groupId: groupId })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();

      // Get post authors
      const authorIds = groupPosts.map(post => post.authorId);
      const authors = await usersCollection.find({
        _id: { $in: authorIds }
      }).toArray();

      const authorMap = authors.reduce((map, author) => {
        map[author._id.toString()] = author;
        return map;
      }, {} as Record<string, any>);

      posts = groupPosts.map(post => {
        const author = authorMap[post.authorId];
        return {
          id: post._id?.toString(),
          title: post.title || "Untitled",
          content: post.content || "",
          author: {
            id: post.authorId?.toString(),
            name: author?.name || "Unknown Author",
            avatar: author?.image || author?.avatar || null
          },
          createdAt: post.createdAt || new Date().toISOString(),
          likesCount: post.likes?.length || 0,
          commentsCount: post.comments?.length || 0,
          isLiked: post.likes?.includes(session.user.id) || false
        };
      });
    }

    // Format group data
    const groupData = {
      id: group._id,
      name: group.name,
      description: group.description,
      avatar: group.avatar,
      coverImage: group.coverImage,
      membersCount: group.members?.length || 0,
      postsCount: group.postsCount || 0,
      isPrivate: group.isPrivate || false,
      isMember: isMember,
      isAdmin: isAdmin,
      category: group.category,
      createdAt: group.createdAt,
      admin: {
        id: group.adminId?.toString(),
        name: admin?.name,
        avatar: admin?.image || admin?.avatar
      },
      members: members,
      posts: posts,
      settings: {
        allowMemberPosts: group.allowMemberPosts ?? true,
        requireApproval: group.requireApproval ?? false,
        isVisible: group.isVisible ?? true
      }
    };

    return NextResponse.json({ group: groupData });

  } catch (error: any) {
    console.error("❌ [Group API] Error fetching group:", error);
    console.error("❌ [Group API] Stack trace:", error.stack);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    // Check if user is admin
    const group = await groupsCollection.findOne({ _id: idObj });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.adminId !== session.user.id) {
      return NextResponse.json({ error: "Only group admin can update settings" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      isPrivate,
      settings
    } = body;

    // Update group
    const updateData: any = {
      updatedAt: new Date()
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate;

    if (settings) {
      if (settings.allowMemberPosts !== undefined) updateData.allowMemberPosts = settings.allowMemberPosts;
      if (settings.requireApproval !== undefined) updateData.requireApproval = settings.requireApproval;
      if (settings.maxMembers !== undefined) updateData.maxMembers = settings.maxMembers;
      if (settings.isVisible !== undefined) updateData.isVisible = settings.isVisible;
    }

    await groupsCollection.updateOne(
      { _id: idObj },
      { $set: updateData }
    );

    // Emit real-time event for group update
    const { emitToRoom } = await import("@/lib/socket-server");
    emitToRoom(`group:${groupId}`, "group_updated", {
      groupId,
      updates: updateData
    });

    return NextResponse.json({ message: "Group updated successfully" });

  } catch (error) {
    console.error("Error updating group:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Check if user is admin
    const group = await groupsCollection.findOne({ _id: idObj });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.adminId !== session.user.id) {
      return NextResponse.json({ error: "Only group admin can delete group" }, { status: 403 });
    }

    // Delete group
    await groupsCollection.deleteOne({ _id: idObj });

    return NextResponse.json({ message: "Group deleted successfully" });

  } catch (error) {
    console.error("Error deleting group:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
