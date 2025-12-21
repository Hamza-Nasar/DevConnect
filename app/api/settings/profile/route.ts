import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, username, bio, location, website, avatar } = body;

    const usersCollection = await getCollection("users");

    // Try to find user by multiple methods (for Google OAuth and regular users)
    let userIdObj = toObjectId(session.user.id);
    let user;

    // Method 1: Try ObjectId lookup
    if (userIdObj) {
      user = await usersCollection.findOne({ _id: userIdObj });
    }

    // Method 2: Try finding by email (for Google OAuth users)
    if (!user && session.user.email) {
      user = await usersCollection.findOne({ email: session.user.email });
    }

    // Method 3: Try finding by accounts collection (OAuth users)
    if (!user) {
      const accountsCollection = await getCollection("accounts");
      const account = await accountsCollection.findOne({
        providerAccountId: session.user.id
      });

      if (account?.userId) {
        userIdObj = toObjectId(account.userId);
        if (userIdObj) {
          user = await usersCollection.findOne({ _id: userIdObj });
        }
      }
    }

    // Method 4: Try string ID lookup
    if (!user) {
      user = await usersCollection.findOne({ id: session.user.id } as any);
    }

    if (!user) {
      console.error("User not found for session ID:", session.user.id, "Email:", session.user.email);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Use actual user ID from database
    userIdObj = user._id;

    // Check if username is already taken (if username is being changed)
    if (username) {
      const existingUser = await usersCollection.findOne({
        username: username.trim(),
        _id: { $ne: userIdObj },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Username already taken" },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name?.trim() || null;
    if (username !== undefined) updateData.username = username?.trim() || null;
    if (bio !== undefined) updateData.bio = bio?.trim() || null;
    if (location !== undefined) updateData.location = location?.trim() || null;
    if (website !== undefined) {
      // Validate website URL format if provided
      const websiteUrl = website?.trim() || null;
      if (websiteUrl && !websiteUrl.startsWith("http://") && !websiteUrl.startsWith("https://")) {
        updateData.website = `https://${websiteUrl}`;
      } else {
        updateData.website = websiteUrl;
      }
    }
    if (avatar !== undefined) {
      updateData.avatar = avatar;
      updateData.image = avatar;
    }

    // Only update if there's data to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { ...updateData, updatedAt: new Date().toISOString() } }
    );

    // Return updated user data
    const updatedUser = await usersCollection.findOne({ _id: user._id });

    return NextResponse.json({
      success: true,
      profile: {
        name: updatedUser?.name || null,
        username: updatedUser?.username || null,
        bio: updatedUser?.bio || null,
        location: updatedUser?.location || null,
        website: updatedUser?.website || null,
        avatar: updatedUser?.avatar || updatedUser?.image || null,
      },
    });
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}




