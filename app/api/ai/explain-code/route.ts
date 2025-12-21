import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { explainCode } from "@/lib/ai/openai";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code, language } = await req.json();
    if (!code) {
      return NextResponse.json({ error: "Code required" }, { status: 400 });
    }

    const explanation = await explainCode(code, language);
    return NextResponse.json({ explanation });
  } catch (error: any) {
    console.error("Error explaining code:", error);
    return NextResponse.json(
      { error: "Failed to explain code" },
      { status: 500 }
    );
  }
}




