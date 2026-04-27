import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createMessage, getMessageThreadsForUser } from "@/services/message.service";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chats = await getMessageThreadsForUser(session.user.id);
    return NextResponse.json({ chats });
  } catch (error: any) {
    console.error("[Message API] Error fetching chats:", error.message || error);

    if (
      error.name === "MongoNetworkTimeoutError" ||
      error.name === "MongoServerSelectionError" ||
      error.message?.includes("timed out") ||
      error.message?.includes("connection")
    ) {
      return NextResponse.json(
        { chats: [], error: "Database connection timeout. Please try again." },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch chats", details: error.message },
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
    const { receiverId, content, type = "text", imageUrl, videoUrl, fileUrl, fileName } = body;

    if (!receiverId || (!content && !imageUrl && !videoUrl && !fileUrl)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const message = await createMessage({
      senderId: session.user.id,
      receiverId,
      content,
      type,
      imageUrl,
      videoUrl,
      fileUrl,
      fileName,
    });

    return NextResponse.json({ message });
  } catch (error: any) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
