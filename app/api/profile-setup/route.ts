import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserByEmail, updateUser, toStringId, toObjectId } from "@/lib/db";
import { getCollection } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { username, bio, skills, location, website, avatar } = await req.json();

        const user = await findUserByEmail(session.user.email);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check if username is taken (if provided)
        if (username) {
            const usersCollection = await getCollection(COLLECTIONS.USERS);
            const existing = await usersCollection.findOne({
                username: username.trim(),
                _id: { $ne: user._id },
            });
            if (existing) {
                return NextResponse.json({ error: "Username already taken" }, { status: 400 });
            }
        }

        const updateData: any = {};
        if (username) updateData.username = username.trim();
        if (bio !== undefined) updateData.bio = bio?.trim() || null;
        if (skills) updateData.skills = skills;
        if (location !== undefined) updateData.location = location?.trim() || null;
        if (website !== undefined) updateData.website = website?.trim() || null;
        if (avatar) updateData.avatar = avatar; // Allow avatar update
        if (avatar) updateData.image = avatar; // Sync NextAuth image field too for consistency

        const userId = toStringId(user._id);
        if (!userId) {
            return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
        }
        await updateUser(userId, updateData);

        const updatedUser = await findUserByEmail(session.user.email);

        return NextResponse.json({
            id: toStringId(updatedUser?._id),
            username: updatedUser?.username || null,
            bio: updatedUser?.bio || null,
            skills: updatedUser?.skills || [],
            location: updatedUser?.location || null,
            website: updatedUser?.website || null,
        });
    } catch (error: any) {
        console.error("Error updating profile:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
