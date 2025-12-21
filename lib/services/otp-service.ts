import { getCollection } from "@/lib/mongodb";
import bcrypt from "bcryptjs";

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 3;

export async function generateAndSendOTP(phone: string): Promise<{
  success: boolean;
  error?: string;
  retryAfter?: number;
  errorCode?: string;
  otp?: string; // Return OTP in development mode
}> {
  // Validate phone format (E.164)
  if (!/^\+[1-9]\d{1,14}$/.test(phone)) {
    return { success: false, error: "Invalid phone format. Use E.164 format (+923xxxxxxxxx)" };
  }

  const otpsCollection = await getCollection("phone_otps");

  // Rate limiting check
  const recentOTPs = await otpsCollection
    .find({
      phone,
      createdAt: { $gte: new Date(Date.now() - RATE_LIMIT_WINDOW) },
    })
    .sort({ createdAt: -1 })
    .limit(MAX_REQUESTS_PER_WINDOW)
    .toArray();

  if (recentOTPs.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldestRequest = recentOTPs[recentOTPs.length - 1];
    const retryAfter = Math.ceil(
      (oldestRequest.createdAt.getTime() + RATE_LIMIT_WINDOW - Date.now()) / 1000
    );
    return {
      success: false,
      error: "Too many requests. Please try again later.",
      retryAfter,
    };
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash OTP
  const otpHash = await bcrypt.hash(otp, 10);

  // Expiry time
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Delete any existing unverified OTPs for this phone
  await otpsCollection.deleteMany({
    phone,
    verified: false,
  });


  // Save to database
  await otpsCollection.insertOne({
    phone,
    otpHash,
    expiresAt,
    attempts: 0,
    verified: false,
    createdAt: new Date(),
  });

  // Local-only authentication system - no external APIs needed!
  console.log("\n" + "=".repeat(70));
  console.log("🔐 LOCAL PHONE AUTHENTICATION - OTP CODE");
  console.log("=".repeat(70));
  console.log(`📱 Phone Number: ${phone}`);
  console.log(`🔑 OTP Code: ${otp}`);
  console.log(`⏱️  Expires in: ${OTP_EXPIRY_MINUTES} minutes`);
  console.log(`🕒 Generated at: ${new Date().toLocaleString()}`);
  console.log("=".repeat(70));
  console.log("💡 This is a LOCAL authentication system.");
  console.log("   The OTP is displayed here and returned in the API response.");
  console.log("   No external SMS/WhatsApp service required!");
  console.log("=".repeat(70) + "\n");

  // Return OTP for local system (always returned, no external service)
  return { success: true, otp };
}

export async function verifyOTP(
  phone: string,
  otp: string
): Promise<{
  success: boolean;
  error?: string;
  verified?: boolean;
}> {
  if (!/^\+[1-9]\d{1,14}$/.test(phone)) {
    return { success: false, error: "Invalid phone format" };
  }

  if (!/^\d{6}$/.test(otp)) {
    return { success: false, error: "Invalid OTP format" };
  }

  const otpsCollection = await getCollection("phone_otps");

  // Find unverified OTP for this phone
  const otpRecord = await otpsCollection.findOne({
    phone,
    verified: false,
    expiresAt: { $gt: new Date() },
  });

  if (!otpRecord) {
    return { success: false, error: "Invalid or expired OTP" };
  }

  // Check attempts
  if (otpRecord.attempts >= MAX_ATTEMPTS) {
    await otpsCollection.deleteOne({ _id: otpRecord._id });
    return { success: false, error: "Too many attempts. Please request a new OTP." };
  }

  // Verify OTP
  const isValid = await bcrypt.compare(otp, otpRecord.otpHash);

  if (!isValid) {
    // Increment attempts
    await otpsCollection.updateOne(
      { _id: otpRecord._id },
      { $inc: { attempts: 1 } }
    );
    return { success: false, error: "Invalid OTP" };
  }

  // Mark as verified
  await otpsCollection.updateOne(
    { _id: otpRecord._id },
    { $set: { verified: true } }
  );

  return { success: true, verified: true };
}

export async function cleanupExpiredOTPs(): Promise<void> {
  const otpsCollection = await getCollection("phone_otps");
  await otpsCollection.deleteMany({
    expiresAt: { $lt: new Date() },
  });
}

