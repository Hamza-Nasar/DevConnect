import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";

// Toggle read receipts
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { enabled } = await req.json();

    const usersCollection = await getCollection("users");
    const userIdObj = toObjectId(session.user.id);
    if (!userIdObj) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    await usersCollection.updateOne(
      { _id: userIdObj },
      { $set: { readReceiptsEnabled: enabled !== false } }
    );

    return NextResponse.json({ success: true, readReceiptsEnabled: enabled !== false });
  } catch (error: any) {
    console.error("Error updating read receipts:", error);
    return NextResponse.json(
      { error: "Failed to update read receipts setting" },
      { status: 500 }
    );
  }
}


