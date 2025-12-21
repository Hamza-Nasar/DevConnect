import { NextRequest, NextResponse } from "next/server";
import { generateAndSendOTP } from "@/lib/services/otp-service";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const result = await generateAndSendOTP(phone);

    if (!result.success) {
      const status = result.retryAfter ? 429 : 400;
      console.error("❌ Failed to generate OTP:", result.error);
      return NextResponse.json(
        {
          error: result.error || "Failed to generate OTP",
          retryAfter: result.retryAfter,
          errorCode: result.errorCode,
        },
        { status }
      );
    }

    // Always return OTP for local authentication system
    return NextResponse.json({
      success: true,
      message: "OTP generated successfully (Local Authentication)",
      otp: result.otp,
      localMode: true,
    });
  } catch (error: any) {
    console.error("Generate OTP error:", error);
    return NextResponse.json(
      { error: "Failed to generate OTP. Please try again." },
      { status: 500 }
    );
  }
}


