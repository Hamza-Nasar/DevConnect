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
    const { isPrivate, showEmail, showLocation, allowMessages, allowFollowRequests } = body;

    const usersCollection = await getCollection("users");
    const settingsCollection = await getCollection("settings");

    const userIdObj = toObjectId(session.user.id);
    if (!userIdObj) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Update user privacy
    await usersCollection.updateOne(
      { _id: userIdObj },
      { $set: { isPrivate: isPrivate || false } }
    );

    // Update settings
    await settingsCollection.updateOne(
      { userId: session.user.id },
      {
        $set: {
          privacy: {
            isPrivate: isPrivate || false,
            showEmail: showEmail || false,
            showLocation: showLocation !== false,
            allowMessages: allowMessages !== false,
            allowFollowRequests: allowFollowRequests || false,
          },
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating privacy:", error);
    return NextResponse.json(
      { error: "Failed to update privacy settings" },
      { status: 500 }
    );
  }
}




