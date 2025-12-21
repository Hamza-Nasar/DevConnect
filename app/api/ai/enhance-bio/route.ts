import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { enhanceBio } from "@/lib/ai/openai";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bio } = await req.json();
    if (!bio) {
      return NextResponse.json({ error: "Bio required" }, { status: 400 });
    }

    const enhanced = await enhanceBio(bio);
    return NextResponse.json({ enhanced });
  } catch (error: any) {
    console.error("Error enhancing bio:", error);
    return NextResponse.json(
      { error: "Failed to enhance bio" },
      { status: 500 }
    );
  }
}




