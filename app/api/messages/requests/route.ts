import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";

// Get message requests
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const messageRequestsCollection = await getCollection("messageRequests");
    const usersCollection = await getCollection("users");

    const requests = await messageRequestsCollection
      .find({ receiverId: session.user.id, status: "pending" })
      .sort({ createdAt: -1 })
      .toArray();

    // Populate sender data
    const requestsWithUsers = await Promise.all(
      requests.map(async (req: any) => {
        const senderIdObj = toObjectId(req.senderId);
        const sender = senderIdObj
          ? await usersCollection.findOne({ _id: senderIdObj })
          : null;
        return {
          ...req,
          sender: {
            id: req.senderId,
            name: sender?.name,
            username: sender?.username,
            avatar: sender?.avatar || sender?.image,
          },
        };
      })
    );

    return NextResponse.json({ requests: requestsWithUsers });
  } catch (error: any) {
    console.error("Error fetching message requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch message requests" },
      { status: 500 }
    );
  }
}

// Accept or reject message request
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { requestId, action } = await req.json(); // action: "accept" | "reject"

    if (!requestId || !action) {
      return NextResponse.json(
        { error: "Request ID and action required" },
        { status: 400 }
      );
    }

    const messageRequestsCollection = await getCollection("messageRequests");
    const requestIdObj = toObjectId(requestId);
    if (!requestIdObj) {
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
    }

    const request = await messageRequestsCollection.findOne({ _id: requestIdObj });
    if (!request || request.receiverId !== session.user.id) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (action === "accept") {
      await messageRequestsCollection.updateOne(
        { _id: requestIdObj },
        { $set: { status: "accepted", respondedAt: new Date().toISOString() } }
      );
      return NextResponse.json({ success: true, message: "Request accepted" });
    } else if (action === "reject") {
      await messageRequestsCollection.updateOne(
        { _id: requestIdObj },
        { $set: { status: "rejected", respondedAt: new Date().toISOString() } }
      );
      return NextResponse.json({ success: true, message: "Request rejected" });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Error handling message request:", error);
    return NextResponse.json(
      { error: "Failed to handle message request" },
      { status: 500 }
    );
  }
}




