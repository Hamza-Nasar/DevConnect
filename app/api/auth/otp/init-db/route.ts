import { NextResponse } from "next/server";
import { createPhoneOTPIndexes } from "@/lib/db-schemas/phone-otp";

export async function POST() {
  try {
    await createPhoneOTPIndexes();
    return NextResponse.json({
      success: true,
      message: "Phone OTP indexes created successfully",
    });
  } catch (error: any) {
    console.error("Init DB error:", error);
    return NextResponse.json(
      { error: "Failed to initialize database indexes" },
      { status: 500 }
    );
  }
}



