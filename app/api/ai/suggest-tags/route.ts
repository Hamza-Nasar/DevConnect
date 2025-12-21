import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { suggestTags } from "@/lib/ai/openai";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content } = await req.json();
    if (!content) {
      return NextResponse.json({ error: "Content required" }, { status: 400 });
    }

    const tags = await suggestTags(content);
    return NextResponse.json({ tags });
  } catch (error: any) {
    console.error("Error suggesting tags:", error);
    return NextResponse.json(
      { error: "Failed to suggest tags" },
      { status: 500 }
    );
  }
}




