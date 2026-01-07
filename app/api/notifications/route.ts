import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notificationsCollection = await getCollection("notifications");
    const notifications = await notificationsCollection
      .find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    const unreadCount = notifications.filter((n) => !n.read).length;

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error("Error fetching notifications:", error);

    // Provide more specific error messages based on the error type
    let errorMessage = "Failed to fetch notifications";
    let statusCode = 500;

    if (error.message?.includes("ECONNREFUSED") || error.message?.includes("connection")) {
      errorMessage = "Database connection error. Please try again later.";
      statusCode = 503; // Service Unavailable
    } else if (error.message?.includes("authentication") || error.message?.includes("auth")) {
      errorMessage = "Database authentication failed.";
      statusCode = 503;
    } else if (error.message?.includes("timeout")) {
      errorMessage = "Database connection timeout. Please try again.";
      statusCode = 504; // Gateway Timeout
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { notificationId, markAll } = body;

    const notificationsCollection = await getCollection("notifications");

    if (markAll) {
      await notificationsCollection.updateMany(
        { userId: session.user.id, read: false },
        { $set: { read: true } }
      );
    } else if (notificationId) {
      await notificationsCollection.updateOne(
        { _id: notificationId, userId: session.user.id },
        { $set: { read: true } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating notification:", error);

    // Provide more specific error messages based on the error type
    let errorMessage = "Failed to update notification";
    let statusCode = 500;

    if (error.message?.includes("ECONNREFUSED") || error.message?.includes("connection")) {
      errorMessage = "Database connection error. Please try again later.";
      statusCode = 503; // Service Unavailable
    } else if (error.message?.includes("authentication") || error.message?.includes("auth")) {
      errorMessage = "Database authentication failed.";
      statusCode = 503;
    } else if (error.message?.includes("timeout")) {
      errorMessage = "Database connection timeout. Please try again.";
      statusCode = 504; // Gateway Timeout
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
