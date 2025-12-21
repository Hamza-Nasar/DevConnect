import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";

// Get drafts
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const draftsCollection = await getCollection("drafts");
    const drafts = await draftsCollection
      .find({ userId: session.user.id })
      .sort({ updatedAt: -1 })
      .toArray();

    return NextResponse.json({ drafts });
  } catch (error: any) {
    console.error("Error fetching drafts:", error);
    return NextResponse.json(
      { error: "Failed to fetch drafts" },
      { status: 500 }
    );
  }
}

// Save draft
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { draftId, content, title, metadata } = await req.json();

    const draftsCollection = await getCollection("drafts");

    if (draftId) {
      // Update existing draft
      const draftIdObj = toObjectId(draftId);
      if (!draftIdObj) {
        return NextResponse.json({ error: "Invalid draft ID" }, { status: 400 });
      }

      await draftsCollection.updateOne(
        { _id: draftIdObj, userId: session.user.id },
        {
          $set: {
            content,
            title: title || null,
            metadata: metadata || {},
            updatedAt: new Date().toISOString(),
          },
        }
      );

      return NextResponse.json({ success: true, draftId });
    } else {
      // Create new draft
      const result = await draftsCollection.insertOne({
        userId: session.user.id,
        content: content || "",
        title: title || null,
        metadata: metadata || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        draftId: result.insertedId.toString(),
      });
    }
  } catch (error: any) {
    console.error("Error saving draft:", error);
    return NextResponse.json(
      { error: "Failed to save draft" },
      { status: 500 }
    );
  }
}

// Delete draft
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const draftId = searchParams.get("draftId");

    if (!draftId) {
      return NextResponse.json({ error: "Draft ID required" }, { status: 400 });
    }

    const draftsCollection = await getCollection("drafts");
    const draftIdObj = toObjectId(draftId);
    if (!draftIdObj) {
      return NextResponse.json({ error: "Invalid draft ID" }, { status: 400 });
    }

    await draftsCollection.deleteOne({
      _id: draftIdObj,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting draft:", error);
    return NextResponse.json(
      { error: "Failed to delete draft" },
      { status: 500 }
    );
  }
}



