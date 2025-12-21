import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const usersCollection = await getCollection("users");
    const settingsCollection = await getCollection("settings");

    // Try to convert user ID to ObjectId
    let userIdObj = toObjectId(session.user.id);
    let user;

    if (userIdObj) {
      // Try finding by ObjectId
      user = await usersCollection.findOne({ _id: userIdObj });
    }

    // If not found, try finding by email (for Google OAuth users)
    if (!user && session.user.email) {
      user = await usersCollection.findOne({ email: session.user.email });
    }

    // If still not found, try finding by accounts collection (OAuth users)
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

    // If still not found, try string ID lookup
    if (!user) {
      user = await usersCollection.findOne({ id: session.user.id } as any);
    }

    if (!user) {
      console.error("User not found for session ID:", session.user.id, "Email:", session.user.email);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Use actual user ID from database
    userIdObj = user._id;
    const settings = await settingsCollection.findOne({ userId: userIdObj.toString() });

    return NextResponse.json({
      profile: {
        name: user?.name,
        username: user?.username,
        bio: user?.bio,
        location: user?.location,
        website: user?.website,
        avatar: user?.avatar || user?.image,
      },
      privacy: settings?.privacy || {
        isPrivate: user?.isPrivate || false,
        showEmail: false,
        showLocation: true,
        allowMessages: true,
        allowFollowRequests: false,
      },
      notifications: settings?.notifications || {
        email: true,
        push: true,
        likes: true,
        comments: true,
        follows: true,
        mentions: true,
        messages: true,
      },
      security: settings?.security || {
        twoFactor: false,
        loginAlerts: true,
        activeSessions: [],
      },
    });
  } catch (error: any) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}
