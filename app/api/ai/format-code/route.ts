import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

        // Map common languages to Prettier parsers
        const parserMap: Record<string, string> = {
            javascript: "babel",
            js: "babel",
            typescript: "typescript",
            ts: "typescript",
            jsx: "babel",
            tsx: "typescript",
            css: "css",
            html: "html",
            json: "json",
            markdown: "markdown",
            md: "markdown",
            yaml: "yaml",
            yml: "yaml",
        };

        const parser = parserMap[language.toLowerCase()] || "babel";

        try {
            const formattedCode = await prettier.format(code, {
                parser,
                semi: true,
                singleQuote: false,
                tabWidth: 2,
                trailingComma: "es5",
                printWidth: 80,
            });
            return NextResponse.json({ formattedCode });
        } catch (prettierError: any) {
            console.warn("Prettier formatting failed:", prettierError.message);
            // Fallback to original code if formatting fails (e.g., syntax error)
            return NextResponse.json({ formattedCode: code, warning: prettierError.message });
        }
    } catch (error: any) {
        console.error("Error formatting code:", error);
        return NextResponse.json(
            { error: "Failed to format code" },
            { status: 500 }
        );
    }
}
