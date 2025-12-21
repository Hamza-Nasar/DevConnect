import { getCollection } from "@/lib/mongodb";

export interface PhoneOTP {
  _id?: any;
  phone: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
  createdAt: Date;
}

export async function createPhoneOTPIndexes(): Promise<void> {
  const otpsCollection = await getCollection("phone_otps");

  // Create indexes
  await otpsCollection.createIndex({ phone: 1 });
  await otpsCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await otpsCollection.createIndex({ phone: 1, verified: 1, expiresAt: 1 });
}



