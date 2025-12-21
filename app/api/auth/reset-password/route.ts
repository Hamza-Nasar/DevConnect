import { NextRequest, NextResponse } from "next/server";
import { verifyOTP, clearOTP } from "@/lib/otp";
import { findUserByEmail, updateUser } from "@/lib/db";
import { getCollection } from "@/lib/mongodb";
import { hashPassword, resetRateLimit } from "@/lib/auth-security";
import { toObjectId } from "@/lib/db";

// Verify OTP for password reset (step 1)
export async function GET(req: NextRequest) {
    try {
      const searchParams = req.nextUrl.searchParams;
      const email = searchParams.get("email");
      const phone = searchParams.get("phone");
      const otp = searchParams.get("otp");

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

      const identifier = (email || phone) as string;

    // Verify OTP
    const isValid = await verifyOTP(identifier, otp, "password-reset");

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 401 }
      );
    }

    // Find user
    let user;
    if (email) {
      user = await findUserByEmail(email);
    } else {
      const usersCollection = await getCollection("users");
      user = await usersCollection.findOne({ phone });
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      message: "OTP verified. You can now set a new password.",
    });
  } catch (error: any) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP. Please try again." },
      { status: 500 }
    );
  }
}

// Reset password with OTP (step 2)
export async function POST(req: NextRequest) {
  try {
    const { email, phone, otp, newPassword } = await req.json();

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

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const identifier = email || phone;

    // Verify OTP again
    const isValid = await verifyOTP(identifier, otp, "password-reset");

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 401 }
      );
    }

    // Find user
    let user;
    if (email) {
      user = await findUserByEmail(email);
    } else {
      const usersCollection = await getCollection("users");
      user = await usersCollection.findOne({ phone });
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    const userId = user._id?.toString();
    if (userId) {
      await updateUser(userId, { 
        password: hashedPassword,
        updatedAt: new Date(),
      });
    } else {
      // Fallback: direct MongoDB update
      const usersCollection = await getCollection("users");
      const userIdObj = toObjectId(user._id?.toString());
      if (userIdObj) {
        await usersCollection.updateOne(
          { _id: userIdObj },
          { $set: { password: hashedPassword, updatedAt: new Date() } }
        );
      }
    }

    // Clear OTP and reset rate limit
    await clearOTP(identifier);
    resetRateLimit(identifier);

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. Please login with your new password.",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Failed to reset password. Please try again." },
      { status: 500 }
    );
  }
}

