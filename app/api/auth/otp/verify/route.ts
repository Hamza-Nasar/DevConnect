import { NextRequest, NextResponse } from "next/server";
import { verifyOTP } from "@/lib/services/otp-service";
import { findUserByPhone } from "@/lib/db";
import { getCollection } from "@/lib/mongodb";
import { toObjectId } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      return NextResponse.json(
        { error: "Phone number and OTP are required" },
        { status: 400 }
      );
    }

    const result = await verifyOTP(phone, otp);

    if (!result.success || !result.verified) {
      return NextResponse.json(
        { error: result.error || "OTP verification failed" },
        { status: 401 }
      );
    }

    // Find or create user
    let user = await findUserByPhone(phone);

    if (!user) {
      // Create new user with phone
      const usersCollection = await getCollection("users");
      const newUser = await usersCollection.insertOne({
        phone,
        phoneVerified: true,
        phoneVerifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      user = await usersCollection.findOne({ _id: newUser.insertedId });
    } else {
      // Update phone verification status
      const usersCollection = await getCollection("users");
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            phoneVerified: true,
            phoneVerifiedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "Failed to create or update user" },
        { status: 500 }
      );
    }

    // Return user data for session creation
    return NextResponse.json({
      success: true,
      verified: true,
      userId: user._id?.toString(),
      phone: user.phone,
      message: "OTP verified successfully",
    });
  } catch (error: any) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP. Please try again." },
      { status: 500 }
    );
  }
}

