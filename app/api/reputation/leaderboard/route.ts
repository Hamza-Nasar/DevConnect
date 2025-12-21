import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";

// Get top contributors leaderboard
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");

    const usersCollection = await getCollection("users");

    const topUsers = await usersCollection
      .find({ reputationScore: { $exists: true } })
      .sort({ reputationScore: -1 })
      .limit(limit)
      .toArray();

    const leaderboard = topUsers.map((user: any, index: number) => ({
      rank: index + 1,
      userId: user._id.toString(),
      name: user.name,
      username: user.username,
      avatar: user.avatar || user.image,
      reputationScore: user.reputationScore || 0,
      verified: user.verified || false,
    }));

    return NextResponse.json({ leaderboard });
  } catch (error: any) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}




