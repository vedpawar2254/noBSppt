import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { checkRateLimit, recordFailedAttempt, resetAttempts, getClientIp } from "@/lib/auth/rate-limit";

// Generic error — never reveal whether email or password was wrong (prevents enumeration)
const INVALID_CREDENTIALS_MSG = "Invalid email or password.";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // NFR8: rate limit check before any processing
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, password } = body as { email?: string; password?: string };

  if (!email || !password) {
    recordFailedAttempt(ip);
    return NextResponse.json({ error: INVALID_CREDENTIALS_MSG }, { status: 401 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Look up user — always run bcrypt compare to prevent timing attacks
  const [user] = await db
    .select({ id: users.id, email: users.email, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  // If user not found, compare against a dummy hash to maintain constant timing
  const hashToCompare = user?.passwordHash ?? "$2a$12$dummyhashtopreventtimingattacksonmissingusers.padded";
  const passwordValid = await verifyPassword(password, hashToCompare);

  if (!user || !passwordValid) {
    recordFailedAttempt(ip);
    return NextResponse.json({ error: INVALID_CREDENTIALS_MSG }, { status: 401 });
  }

  // Success — clear failure count for this IP
  resetAttempts(ip);

  const token = await createSessionToken({ userId: user.id, email: user.email });
  await setSessionCookie(token);

  return NextResponse.json({ userId: user.id }, { status: 200 });
}
