import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const commentsCollection = await getCollection("liveComments");
    const usersCollection = await getCollection("users");

    const comments = await commentsCollection
      .find({ streamId: id })
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();

    // Populate user data
    for (const comment of comments) {
      if (comment.userId) {
        const user = await usersCollection.findOne({ _id: comment.userId });
        comment.user = user || { id: comment.userId };
      }
    }

    return NextResponse.json({ comments });
  } catch (error: any) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { message, isGift } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const commentsCollection = await getCollection("liveComments");
    const comment = {
      streamId: id,
      userId: session.user.id,
      message,
      isGift: isGift || false,
      timestamp: new Date().toISOString(),
    };

    const result = await commentsCollection.insertOne(comment);

    return NextResponse.json({
      comment: {
        id: result.insertedId.toString(),
        ...comment,
      },
    });
  } catch (error: any) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}




