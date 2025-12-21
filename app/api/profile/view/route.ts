import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { recordProfileView } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { viewedId } = await req.json();

        if (!viewedId) {
            return NextResponse.json({ error: "Missing viewedId" }, { status: 400 });
        }

        const viewerId = (session.user as any).id;

        if (viewerId === viewedId) {
            return NextResponse.json({ message: "Self view ignored" });
        }

        await recordProfileView(viewerId, viewedId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error recording profile view:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
