import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username, bio, skills } = await req.json();

    try {
        const user = await prisma.user.update({
            where: { email: session.user.email },
            data: { username, bio, skills },
        });

        return NextResponse.json(user);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
}
