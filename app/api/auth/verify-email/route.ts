import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserByEmail, updateUser } from "@/lib/db";
import { generateOTP, storeOTP, verifyOTP, clearOTP } from "@/lib/otp";
import { verifyRateLimit } from "@/lib/auth-security";

// Send email verification OTP
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await findUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: "Email already verified",
        verified: true,
      });
    }

    // Rate limiting
    const rateLimitResult = await verifyRateLimit(session.user.email);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please try again in ${rateLimitResult.retryAfter} seconds.` },
        { status: 429 }
      );
    }

    // Generate verification OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store OTP
    await storeOTP(session.user.email, otp, expiresAt, "email-verification");

    // Send verification email
    // In production, use email service
    console.log(`Email verification OTP for ${session.user.email}: ${otp}`);
    // await sendVerificationEmail(session.user.email, otp);

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your email",
    });
  } catch (error: any) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { error: "Failed to send verification code. Please try again." },
      { status: 500 }
    );
  }
}

// Verify email with OTP
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { otp } = await req.json();

    if (!otp || otp.length !== 6) {
      return NextResponse.json(
        { error: "Invalid OTP format" },
        { status: 400 }
      );
    }

    // Verify OTP
    const isValid = await verifyOTP(session.user.email, otp, "email-verification");

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 401 }
      );
    }

    // Update user email as verified
    const user = await findUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = user._id?.toString();
    if (userId) {
      await updateUser(userId, {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Clear OTP
    await clearOTP(session.user.email);

    return NextResponse.json({
      success: true,
      message: "Email verified successfully",
      verified: true,
    });
  } catch (error: any) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify email. Please try again." },
      { status: 500 }
    );
  }
}



