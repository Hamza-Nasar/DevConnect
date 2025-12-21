import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Mock trending searches - in production, this would come from analytics
    const trendingSearches = [
      "react",
      "nextjs",
      "typescript",
      "javascript",
      "web development",
      "ai",
      "machine learning",
      "coding",
      "programming",
      "developer",
    ];

    return NextResponse.json({ searches: trendingSearches });
  } catch (error: any) {
    console.error("Error fetching trending searches:", error);
    return NextResponse.json(
      { error: "Failed to fetch trending searches" },
      { status: 500 }
    );
  }
}







