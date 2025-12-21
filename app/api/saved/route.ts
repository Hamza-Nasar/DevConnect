import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";

// Get saved items
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type"); // "post" | "profile" | "project"

    const savedCollection = await getCollection("savedItems");
    const query: any = { userId: session.user.id };
    if (type) query.itemType = type;

    const savedItems = await savedCollection
      .find(query)
      .sort({ savedAt: -1 })
      .toArray();

    return NextResponse.json({ savedItems });
  } catch (error: any) {
    console.error("Error fetching saved items:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved items" },
      { status: 500 }
    );
  }
}

// Save an item
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId, itemType, note } = await req.json();
    // itemType: "post" | "profile" | "project"

    if (!itemId || !itemType) {
      return NextResponse.json(
        { error: "Item ID and type required" },
        { status: 400 }
      );
    }

    const savedCollection = await getCollection("savedItems");

    // Check if already saved
    const existing = await savedCollection.findOne({
      userId: session.user.id,
      itemId,
      itemType,
    });

    if (existing) {
      // Update note if provided
      if (note !== undefined) {
        await savedCollection.updateOne(
          { _id: existing._id },
          { $set: { note, updatedAt: new Date().toISOString() } }
        );
      }
      return NextResponse.json({ success: true, saved: true });
    }

    // Create new saved item
    await savedCollection.insertOne({
      userId: session.user.id,
      itemId,
      itemType,
      note: note || null,
      savedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, saved: true });
  } catch (error: any) {
    console.error("Error saving item:", error);
    return NextResponse.json(
      { error: "Failed to save item" },
      { status: 500 }
    );
  }
}

// Remove saved item
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const itemId = searchParams.get("itemId");
    const itemType = searchParams.get("itemType");

    if (!itemId || !itemType) {
      return NextResponse.json(
        { error: "Item ID and type required" },
        { status: 400 }
      );
    }

    const savedCollection = await getCollection("savedItems");
    await savedCollection.deleteOne({
      userId: session.user.id,
      itemId,
      itemType,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error removing saved item:", error);
    return NextResponse.json(
      { error: "Failed to remove saved item" },
      { status: 500 }
    );
  }
}



