import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, findUserByUsername } from "@/lib/db";
import { generateOTP, storeOTP, verifyRateLimit } from "@/lib/otp";

// Send password reset OTP
export async function POST(req: NextRequest) {
  try {
    const { email, phone } = await req.json();

    if (!email && !phone) {
      return NextResponse.json(
        { error: "Email or phone number is required" },
        { status: 400 }
      );
    }

    // Rate limiting
    const identifier = email || phone;
    const rateLimitResult = await verifyRateLimit(identifier);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please try again in ${rateLimitResult.retryAfter} seconds.` },
        { status: 429 }
      );
    }

    // Find user
    let user;
    if (email) {
      user = await findUserByEmail(email);
    } else {
      // Find by phone
      const { getCollection } = await import("@/lib/mongodb");
      const usersCollection = await getCollection("users");
      user = await usersCollection.findOne({ phone });
    }

    if (!user) {
      // Don't reveal if user exists or not (security best practice)
      return NextResponse.json({
        success: true,
        message: "If an account exists, a password reset code has been sent.",
      });
    }

    // Generate reset OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes for password reset

    // Store OTP with reset flag
    await storeOTP(identifier, otp, expiresAt, "password-reset");

    // Send OTP via email or SMS
    if (email) {
      // In production, use email service like SendGrid, AWS SES, etc.
      console.log(`Password reset OTP for ${email}: ${otp}`);
      // await sendEmailOTP(email, otp, "password-reset");
    } else if (phone) {
      // In production, use SMS service like Twilio, AWS SNS, etc.
      console.log(`Password reset OTP for ${phone}: ${otp}`);
      // await sendSMSOTP(phone, otp, "password-reset");
    }

    return NextResponse.json({
      success: true,
      message: `Password reset code sent to your ${email ? "email" : "phone"}`,
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to send password reset code. Please try again." },
      { status: 500 }
    );
  }
}



