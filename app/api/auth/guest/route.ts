import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
    try {
        const { guestName } = await req.json();

        // Generate unique guest identifier
        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 10000);
        const guestId = `guest_${timestamp}_${randomNum}`;

        // Use provided name or generate a random one
        const name = guestName?.trim() || `Guest${Math.floor(Math.random() * 10000)}`;
        const username = name.toLowerCase().replace(/\s+/g, '') + randomNum;

        // Create guest user in database
        const usersCollection = await getCollection("users");

        // Check if guest user already exists (by email if provided, otherwise create new)
        const guestEmail = `${guestId}@guest.local`;

        const existingGuest = await usersCollection.findOne({ email: guestEmail });

        let guestUser;
        if (existingGuest) {
            guestUser = existingGuest;
        } else {
            // Create new guest user
            const result = await usersCollection.insertOne({
                email: guestEmail,
                name: name,
                username: username,
                guestAccount: true,
                guestId: guestId,
                emailVerified: false,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            guestUser = await usersCollection.findOne({ _id: result.insertedId });
        }

        if (!guestUser) {
            return NextResponse.json(
                { error: "Failed to create guest account" },
                { status: 500 }
            );
        }

        console.log("\n" + "=".repeat(70));
        console.log("👤 GUEST LOGIN");
        console.log("=".repeat(70));
        console.log(`Name: ${name}`);
        console.log(`Username: ${username}`);
        console.log(`Guest ID: ${guestId}`);
        console.log("=".repeat(70) + "\n");

        return NextResponse.json({
            success: true,
            message: "Guest account created successfully",
            user: {
                id: guestUser._id.toString(),
                email: guestUser.email,
                name: guestUser.name,
                username: guestUser.username,
                image: guestUser.avatar,
                guestAccount: true,
            },
        });
    } catch (error: any) {
        console.error("Guest login error:", error);
        return NextResponse.json(
            { error: "Failed to create guest account. Please try again." },
            { status: 500 }
        );
    }
}
