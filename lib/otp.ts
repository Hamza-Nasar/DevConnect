// OTP management utilities
// In production, use Redis or a database for storage

interface OTPData {
  otp: string;
  expiresAt: Date;
  attempts: number;
  type?: string; // "login" | "password-reset" | "email-verification" | "phone-verification"
}

// In-memory storage (use Redis in production)
const otpStore = new Map<string, OTPData>();
const rateLimitStore = new Map<string, { count: number; resetAt: Date }>();

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function storeOTP(
  identifier: string,
  otp: string,
  expiresAt: Date,
  type: string = "login"
): Promise<void> {
  otpStore.set(identifier, {
    otp,
    expiresAt,
    attempts: 0,
    type,
  });

  // Clean up expired OTPs periodically
  setTimeout(() => {
    const data = otpStore.get(identifier);
    if (data && new Date() > data.expiresAt) {
      otpStore.delete(identifier);
    }
  }, 5 * 60 * 1000);
}

export async function verifyOTP(
  identifier: string,
  otp: string,
  type?: string
): Promise<boolean> {
  const data = otpStore.get(identifier);

  if (!data) {
    return false;
  }

  // Check type if specified
  if (type && data.type !== type) {
    return false;
  }

  // Check if OTP is expired
  if (new Date() > data.expiresAt) {
    otpStore.delete(identifier);
    return false;
  }

  // Check attempts
  if (data.attempts >= 5) {
    otpStore.delete(identifier);
    return false;
  }

  // Verify OTP
  if (data.otp !== otp) {
    data.attempts++;
    return false;
  }

  return true;
}

export async function clearOTP(identifier: string): Promise<void> {
  otpStore.delete(identifier);
}

export async function verifyRateLimit(identifier: string): Promise<{
  allowed: boolean;
  retryAfter?: number;
}> {
  const now = new Date();
  const key = `rate_limit_${identifier}`;
  const data = rateLimitStore.get(key);

  if (!data || now > data.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: new Date(now.getTime() + 15 * 60 * 1000), // 15 minutes
    });
    return { allowed: true };
  }

  if (data.count >= 5) {
    const retryAfter = Math.ceil((data.resetAt.getTime() - now.getTime()) / 1000);
    return { allowed: false, retryAfter };
  }

  data.count++;
  return { allowed: true };
}


