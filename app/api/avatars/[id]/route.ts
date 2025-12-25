import { NextResponse } from "next/server";
import { findUserById } from "@/lib/db";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await findUserById(id);

        if (!user || (!user.avatar && !user.image)) {
            // Return a default transparent pixel or redirect to a default avatar
            return NextResponse.redirect("https://api.dicebear.com/7.x/avataaars/svg?seed=fallback");
        }

        const avatarData = user.avatar || user.image;

        // If it's already a URL (like Dicebear), redirect to it
        if (avatarData.startsWith("http")) {
            return NextResponse.redirect(avatarData);
        }

        // If it's a data URI (base64)
        if (avatarData.startsWith("data:")) {
            const matches = avatarData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const contentType = matches[1];
                const buffer = Buffer.from(matches[2], "base64");

                return new NextResponse(buffer, {
                    headers: {
                        "Content-Type": contentType,
                        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
                    },
                });
            }
        }

        // Fallback
        return NextResponse.redirect("https://api.dicebear.com/7.x/avataaars/svg?seed=" + id);
    } catch (error) {
        console.error("Error serving avatar:", error);
        return new NextResponse("Error", { status: 500 });
    }
}
