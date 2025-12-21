import { NextRequest, NextResponse } from "next/server";
import { generateOTP, storeOTP, verifyRateLimit } from "@/lib/otp";

export async function POST(req: NextRequest) {
  try {
    const { email, phone } = await req.json();

    if (!email && !phone) {
      return NextResponse.json(
        { error: "Email or phone number is required" },
        { status: 400 }
      );
    }

    // Rate limiting check
    const identifier = email || phone;
    const rateLimitResult = await verifyRateLimit(identifier);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please try again in ${rateLimitResult.retryAfter} seconds.` },
        { status: 429 }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP (in production, use Redis or database)
    await storeOTP(identifier, otp, expiresAt);

    // Send OTP via email or SMS
    if (email) {
      // In production, use a service like SendGrid, AWS SES, etc.
      console.log(`OTP for ${email}: ${otp}`);
      // await sendEmailOTP(email, otp);
    } else if (phone) {
      // In production, use a service like Twilio, AWS SNS, etc.
      console.log(`OTP for ${phone}: ${otp}`);
      // await sendSMSOTP(phone, otp);
    }

    return NextResponse.json({
      success: true,
      message: `OTP sent to your ${email ? "email" : "phone"}`,
    });
  } catch (error: any) {
    console.error("OTP generation error:", error);
    return NextResponse.json(
      { error: "Failed to send OTP. Please try again." },
      { status: 500 }
    );
  }
}


