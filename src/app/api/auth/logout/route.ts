import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";

export async function POST() {
  // Stateless JWT: session termination = deleting the httpOnly cookie.
  // The JWT itself remains technically valid until expiry (7 days), but
  // without the cookie the client cannot send it. No token blacklist needed
  // at MVP scale — document in Epic 4 if subscription revocation requires it.
  await clearSessionCookie();

  return NextResponse.json({ success: true }, { status: 200 });
}
