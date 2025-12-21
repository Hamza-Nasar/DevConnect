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
    const streamsCollection = await getCollection("liveStreams");

    await streamsCollection.updateOne(
      { _id: idObj },
      { $inc: { likesCount: 1 } }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error liking stream:", error);
    return NextResponse.json(
      { error: "Failed to like stream" },
      { status: 500 }
    );
  }
}




