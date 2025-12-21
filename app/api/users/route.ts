import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/db";
import { toStringId } from "@/lib/db";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search");
        const limit = parseInt(searchParams.get("limit") || "20", 10);
        const skip = parseInt(searchParams.get("skip") || "0", 10);

        const usersCollection = await getCollection(COLLECTIONS.USERS);
        let query: any = {};

        if (search) {
            query = {
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { username: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                ],
            };
        }

        const users = await usersCollection
            .find(query)
            .skip(skip)
            .limit(limit)
            .toArray();

        const formattedUsers = users.map((user) => ({
            id: toStringId(user._id),
            name: user.name || null,
            username: user.username || null,
            avatar: user.avatar || null,
            image: user.image || user.avatar || null,
            bio: user.bio || null,
            verified: user.verified || false,
        }));

        return NextResponse.json(formattedUsers);
    } catch (error: any) {
        console.error("Error fetching users:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}







