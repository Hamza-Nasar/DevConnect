import { NextRequest, NextResponse } from "next/server";
import { verifyOTP, clearOTP } from "@/lib/otp";
import { findUserByEmail, findUserByUsername, createUser } from "@/lib/db";
import { getCollection } from "@/lib/mongodb";
import { resetRateLimit } from "@/lib/auth-security";

export async function POST(req: NextRequest) {
  try {
    const { email, phone, otp } = await req.json();

    if (!email && !phone) {
      return NextResponse.json(
        { error: "Email or phone number is required" },
        { status: 400 }
      );
    }

    if (!otp || otp.length !== 6) {
      return NextResponse.json(
        { error: "Invalid OTP format" },
        { status: 400 }
      );
    }

    const identifier = email || phone;

    // Verify OTP
    const isValid = await verifyOTP(identifier, otp);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 401 }
      );
    }

    // Clear OTP after successful verification
    await clearOTP(identifier);
    resetRateLimit(identifier);

    // Find or create user
    let user;
    if (email) {
      user = await findUserByEmail(email);
    } else {
      // Find by phone
      const usersCollection = await getCollection("users");
      user = await usersCollection.findOne({ phone });
    }

    // If user doesn't exist, this is a signup via OTP
    // In this case, we need to redirect to signup completion
    if (!user) {
      return NextResponse.json({
        success: true,
        verified: true,
        requiresSignup: true,
        message: "OTP verified. Please complete your profile.",
      });
    }

    // User exists - return success (frontend will handle NextAuth signIn)
    return NextResponse.json({
      success: true,
      verified: true,
      requiresSignup: false,
      message: "OTP verified successfully",
      user: {
        id: user._id?.toString(),
        email: user.email,
        phone: user.phone,
        name: user.name,
        username: user.username,
      },
    });
  } catch (error: any) {
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP. Please try again." },
      { status: 500 }
    );
  }
}


