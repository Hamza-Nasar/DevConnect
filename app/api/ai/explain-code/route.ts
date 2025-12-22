import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { explainCode } from "@/lib/ai/openai";
import * as prettier from "prettier";

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

    let codeToExplain = code;
    try {
      const parserMap: Record<string, string> = {
        javascript: "babel",
        js: "babel",
        typescript: "typescript",
        ts: "typescript",
        jsx: "babel",
        tsx: "typescript",
      };
      const parser = parserMap[language?.toLowerCase()] || "babel";
      codeToExplain = await prettier.format(code, { parser, semi: true, singleQuote: false });
    } catch (e) {
      console.warn("Prettier formatting skipped before explanation");
    }

    const explanation = await explainCode(codeToExplain, language);
    return NextResponse.json({ explanation });
  } catch (error: any) {
    console.error("Error explaining code:", error);
    return NextResponse.json(
      { error: "Failed to explain code" },
      { status: 500 }
    );
  }
}




