import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    // Simple link preview (in production, use a proper link preview service)
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      });

      if (!response.ok) {
        return NextResponse.json({
          url,
          title: new URL(url).hostname,
          description: "",
          image: null,
        });
      }

      const html = await response.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descriptionMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
      const imageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);

      return NextResponse.json({
        url,
        title: titleMatch?.[1] || new URL(url).hostname,
        description: descriptionMatch?.[1] || "",
        image: imageMatch?.[1] || null,
      });
    } catch (error) {
      // Fallback if fetch fails
      return NextResponse.json({
        url,
        title: new URL(url).hostname,
        description: "",
        image: null,
      });
    }
  } catch (error: any) {
    console.error("Error fetching link preview:", error);
    return NextResponse.json({ error: "Failed to fetch link preview" }, { status: 500 });
  }
}


