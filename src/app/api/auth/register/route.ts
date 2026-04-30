import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { validateRegistrationInput } from "@/lib/auth/validation";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, password } = body as { email?: string; password?: string };

  // Server-side validation
  const { valid, errors } = validateRegistrationInput({
    email: email ?? "",
    password: password ?? "",
  });

  if (!valid) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  const normalizedEmail = email!.trim().toLowerCase();

  // Check for duplicate email
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { errors: { email: "An account with this email already exists." } },
      { status: 409 }
    );
  }

  // Hash password — never store plaintext (NFR6)
  const passwordHash = await hashPassword(password!);

  // Create user
  const [newUser] = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      passwordHash,
    })
    .returning({ id: users.id, email: users.email });

  // Create session and set httpOnly cookie
  const token = await createSessionToken({ userId: newUser.id, email: newUser.email });
  await setSessionCookie(token);

  return NextResponse.json({ userId: newUser.id }, { status: 201 });
}
