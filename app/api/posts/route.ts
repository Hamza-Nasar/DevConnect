import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface PostRequestBody {
    title: string;
    content: string;
}

// 🟢 Create new post
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body: PostRequestBody = await req.json();
        const { title, content } = body;

        if (!title?.trim() || !content?.trim()) {
            return NextResponse.json({ error: "Missing title or content" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const post = await prisma.post.create({
            data: {
                title: title.trim(),
                content: content.trim(),
                userId: user.id,
            },
            include: {
                user: { select: { name: true, avatar: true } },
            },
        });

        return NextResponse.json(post, { status: 201 });
    } catch (error: any) {
        console.error("🔥 POST /api/posts error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// 🟢 Fetch all posts
export async function GET() {
    try {
        const posts = await prisma.post.findMany({
            include: {
                user: { select: { name: true, avatar: true } },
                comments: true,
                likedBy: true,
            },
            orderBy: { createdAt: "desc" },
        });

        const formattedPosts = posts.map(p => ({
            id: p.id,
            title: p.title,
            content: p.content,
            createdAt: p.createdAt,
            user: p.user,
            commentsCount: p.comments.length,
            likesCount: p.likedBy.length,
        }));

        return NextResponse.json(formattedPosts, { status: 200 });
    } catch (error: any) {
        console.error("❌ Error fetching posts:", error);
        return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
    }
}
