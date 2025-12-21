import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserByEmail, updateUser, toStringId } from "@/lib/db";
import { authenticator } from "otplib";
import QRCode from "qrcode";

// Generate MFA secret and QR code
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await findUserByEmail(session.user.email);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const secret = authenticator.generateSecret();
        const serviceName = "DevConnect";
        const accountName = (user.email || user.name || "User") as string;

        const otpAuthUrl = authenticator.keyuri(accountName, serviceName, secret);

        const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);

        // Store secret temporarily (in production, encrypt this)
        const userId = toStringId(user._id);
        if (userId) {
            await updateUser(userId, { mfaSecret: secret });
        }

        return NextResponse.json({
            secret,
            qrCode: qrCodeUrl,
        });
    } catch (error: any) {
        console.error("Error generating MFA:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

// Verify and enable MFA
export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { token } = await req.json();
        const user = await findUserByEmail(session.user.email);
        if (!user || !user.mfaSecret) {
            return NextResponse.json({ error: "MFA not set up" }, { status: 400 });
        }

        const isValid = authenticator.verify({
            token,
            secret: user.mfaSecret,
        });

        if (!isValid) {
            return NextResponse.json({ error: "Invalid token" }, { status: 400 });
        }

        const userId = toStringId(user._id);
        if (userId) {
            await updateUser(userId, { mfaEnabled: true });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error verifying MFA:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
