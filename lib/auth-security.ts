import bcrypt from "bcryptjs";

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Password verification
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Rate limiting for login attempts
interface RateLimitData {
  count: number;
  resetAt: Date;
  lockedUntil?: Date;
}

const loginAttempts = new Map<string, RateLimitData>();

export async function verifyRateLimit(identifier: string): Promise<{
  allowed: boolean;
  retryAfter?: number;
}> {
  const now = new Date();
  const data = loginAttempts.get(identifier);

  // Check if account is locked
  if (data?.lockedUntil && now < data.lockedUntil) {
    const retryAfter = Math.ceil((data.lockedUntil.getTime() - now.getTime()) / 1000);
    return { allowed: false, retryAfter };
  }

  // Reset if lock expired
  if (data?.lockedUntil && now >= data.lockedUntil) {
    loginAttempts.delete(identifier);
    return { allowed: true };
  }

  // Check rate limit
  if (!data || now > data.resetAt) {
    loginAttempts.set(identifier, {
      count: 1,
      resetAt: new Date(now.getTime() + 15 * 60 * 1000), // 15 minutes window
    });
    return { allowed: true };
  }

  // Lock account after 5 failed attempts
  if (data.count >= 5) {
    data.lockedUntil = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes lock
    const retryAfter = Math.ceil(5 * 60);
    return { allowed: false, retryAfter };
  }

  data.count++;
  return { allowed: true };
}

// Reset rate limit on successful login
export function resetRateLimit(identifier: string): void {
  loginAttempts.delete(identifier);
}


