import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return new Response("Unauthorized", { status: 401 });

    const { content, postId } = await req.json();
    const comment = await prisma.comment.create({
        data: {
            content,
            postId,
            userId: session.user?.id!,
        },
    });

    return new Response(JSON.stringify(comment));
}
