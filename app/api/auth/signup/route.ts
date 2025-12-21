import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { hashPassword, verifyRateLimit } from "@/lib/auth-security";
import { findUserByEmail, findUserByUsername, createUser } from "@/lib/db";
import { signIn } from "next-auth/react";

export async function POST(req: NextRequest) {
  try {
    const { email, phone, password, name, username } = await req.json();

    // Validate input
    if (!email && !phone) {
      return NextResponse.json(
        { error: "Email or phone number is required" },
        { status: 400 }
      );
    }

    if (!name || !username) {
      return NextResponse.json(
        { error: "Name and username are required" },
        { status: 400 }
      );
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (phone && !/^\+?[1-9]\d{1,14}$/.test(phone.replace(/\s/g, ""))) {
      return NextResponse.json(
        { error: "Invalid phone format. Include country code (e.g., +1234567890)" },
        { status: 400 }
      );
    }

    if (password && password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Rate limiting
    const identifier = email || phone;
    const rateLimitResult = await verifyRateLimit(identifier);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: `Too many signup attempts. Please try again in ${rateLimitResult.retryAfter} seconds.` },
        { status: 429 }
      );
    }

    // Check if user already exists
    if (email) {
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 409 }
        );
      }
    }

    // Check if username is taken
    const existingUsername = await findUserByUsername(username);
    if (existingUsername) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 }
      );
    }

    // Hash password if provided
    const hashedPassword = password ? await hashPassword(password) : null;

    // Create user
    const userData: any = {
      email: email || null,
      phone: phone || null,
      password: hashedPassword,
      name,
      username,
      emailVerified: false,
      phoneVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const user = await createUser(userData);

    if (!user) {
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user._id?.toString(),
        email: user.email,
        phone: user.phone,
        name: user.name,
        username: user.username,
      },
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}



