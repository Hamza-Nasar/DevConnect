import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserByEmail, updateUser } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth-security";
import { toObjectId } from "@/lib/db";
import { getCollection } from "@/lib/mongodb";

// Change password (requires current password)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Find user
    const user = await findUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Verify current password
    if (!user.password) {
      return NextResponse.json(
        { error: "Password not set. Please use password reset." },
        { status: 400 }
      );
    }

    const isPasswordValid = await verifyPassword(currentPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // Check if new password is same as current
    const isSamePassword = await verifyPassword(newPassword, user.password);
    if (isSamePassword) {
      return NextResponse.json(
        { error: "New password must be different from current password" },
        { status: 400 }
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

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error: any) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Failed to change password. Please try again." },
      { status: 500 }
    );
  }
}



