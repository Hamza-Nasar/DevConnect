import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserById } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await findUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return basic user info for navigation
    return NextResponse.json({
      id: user._id?.toString(),
      username: user.username,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error("Error fetching basic profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


