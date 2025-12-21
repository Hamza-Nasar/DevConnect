import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";
import { generateOTP, storeOTP, verifyOTP, clearOTP } from "@/lib/otp";
import { verifyRateLimit } from "@/lib/auth-security";

// Send phone verification OTP
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Validate phone format
    if (!/^\+?[1-9]\d{1,14}$/.test(phone.replace(/\s/g, ""))) {
      return NextResponse.json(
        { error: "Invalid phone format. Include country code (e.g., +1234567890)" },
        { status: 400 }
      );
    }

    const usersCollection = await getCollection("users");
    const userIdObj = toObjectId(session.user.id);
    if (!userIdObj) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const user = await usersCollection.findOne({ _id: userIdObj });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.phoneVerified) {
      return NextResponse.json({
        success: true,
        message: "Phone already verified",
        verified: true,
      });
    }

    // Rate limiting
    const rateLimitResult = await verifyRateLimit(phone);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please try again in ${rateLimitResult.retryAfter} seconds.` },
        { status: 429 }
      );
    }

    // Generate verification OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store OTP
    await storeOTP(phone, otp, expiresAt, "phone-verification");

    // Send verification SMS
    // In production, use SMS service like Twilio, AWS SNS, etc.
    console.log(`Phone verification OTP for ${phone}: ${otp}`);
    // await sendVerificationSMS(phone, otp);

    // Update user's phone number if different
    if (user.phone !== phone) {
      await usersCollection.updateOne(
        { _id: userIdObj },
        { $set: { phone, updatedAt: new Date() } }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your phone",
    });
  } catch (error: any) {
    console.error("Phone verification error:", error);
    return NextResponse.json(
      { error: "Failed to send verification code. Please try again." },
      { status: 500 }
    );
  }
}

// Verify phone with OTP
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      return NextResponse.json(
        { error: "Phone number and OTP are required" },
        { status: 400 }
      );
    }

    if (otp.length !== 6) {
      return NextResponse.json(
        { error: "Invalid OTP format" },
        { status: 400 }
      );
    }

    // Verify OTP
    const isValid = await verifyOTP(phone, otp, "phone-verification");

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 401 }
      );
    }

    // Update user phone as verified
    const usersCollection = await getCollection("users");
    const userIdObj = toObjectId(session.user.id);
    if (!userIdObj) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    await usersCollection.updateOne(
      { _id: userIdObj },
      {
        $set: {
          phone,
          phoneVerified: true,
          phoneVerifiedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    // Clear OTP
    await clearOTP(phone);

    return NextResponse.json({
      success: true,
      message: "Phone verified successfully",
      verified: true,
    });
  } catch (error: any) {
    console.error("Phone verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify phone. Please try again." },
      { status: 500 }
    );
  }
}



