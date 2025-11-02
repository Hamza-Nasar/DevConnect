import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    const { content } = body;

    const post = await prisma.post.create({
        data: {
            content,
            authorId: session.user ? session.user.id : null,
        },
    });

    return new Response(JSON.stringify(post), { status: 201 });
}
