import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 🟢 Create new post
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        console.log("🟢 SESSION:", session);

        // 🔒 Ensure user is authenticated
        if (!session?.user?.email) {
            console.log("🔴 Unauthorized");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { title, content } = await req.json();
        console.log("🟢 BODY:", { title, content });

        // 🔒 Validate input
        if (!title?.trim() || !content?.trim()) {
            console.log("🔴 Missing title/content");
            return NextResponse.json({ error: "Missing title or content" }, { status: 400 });
        }

        // 🔍 Get user
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            console.log("🔴 User not found");
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // 📝 Create post
        const post = await prisma.post.create({
            data: {
                title: title.trim(),
                content: content.trim(),
                userId: user.id,
            },
            include: {
                user: { select: { name: true, image: true } },
            },
        });


        console.log("✅ Post created:", post);
        return NextResponse.json(post, { status: 201 });

    } catch (error: any) {
        console.error("🔥 POST /api/posts error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// 🟢 Fetch all posts
export async function GET() {
    try {
        // ✅ Fetch all posts (no where filter yet)
        let posts = await prisma.post.findMany({
            include: {
                user: { select: { name: true, image: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        // ✅ Filter out any post missing userId or user manually (safe for MongoDB)
        posts = posts.filter((p) => p.userId && p.user);

        console.log(`📦 ${posts.length} valid posts fetched`);
        return NextResponse.json(posts, { status: 200 });
    } catch (error: any) {
        console.error("❌ Error fetching posts:", error);
        return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
    }
}
