import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDevConnectMetadataCollection, getCollectionsList, initializeDevConnectMetadata } from "@/lib/db-collections";

// Get all collections list from devconnect metadata
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const collections = await getCollectionsList();
    
    // If collections list is empty, initialize it
    if (collections.length === 0) {
      const initialized = await initializeDevConnectMetadata();
      return NextResponse.json({ collections: initialized });
    }

    return NextResponse.json({ collections });
  } catch (error: any) {
    console.error("Error fetching collections list:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Update collections list (admin only)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Re-initialize collections list
    const collections = await initializeDevConnectMetadata();
    
    return NextResponse.json({ 
      success: true,
      message: "Collections list updated",
      collections 
    });
  } catch (error: any) {
    console.error("Error updating collections list:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}













