import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";

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
    const idObj = toObjectId(id);
    if (!idObj) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }
    const snippetsCollection = await getCollection("codeSnippets");
    const likesCollection = await getCollection("snippetLikes");

    const existing = await likesCollection.findOne({
      snippetId: id,
      userId: session.user.id,
    });

    if (existing) {
      await likesCollection.deleteOne({ _id: existing._id });
      await snippetsCollection.updateOne(
        { _id: idObj },
        { $inc: { likesCount: -1 } }
      );
    } else {
      await likesCollection.insertOne({
        snippetId: id,
        userId: session.user.id,
        createdAt: new Date().toISOString(),
      });
      await snippetsCollection.updateOne(
        { _id: idObj },
        { $inc: { likesCount: 1 } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error liking snippet:", error);
    return NextResponse.json(
      { error: "Failed to like snippet" },
      { status: 500 }
    );
  }
}




