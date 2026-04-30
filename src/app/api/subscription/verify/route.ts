import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

/**
 * POST /api/subscription/verify
 *
 * Verifies the Razorpay payment signature and upgrades the user.
 * This is the source of truth for upgrades — never trust the client-side
 * success callback alone (AC2).
 *
 * Body: { razorpay_payment_id, razorpay_subscription_id, razorpay_signature }
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: {
    razorpay_payment_id?: string;
    razorpay_subscription_id?: string;
    razorpay_signature?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = body;

  if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment verification fields." }, { status: 400 });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    console.error("[verify] RAZORPAY_KEY_SECRET not set");
    return NextResponse.json({ error: "Payment verification not configured." }, { status: 503 });
  }

  // HMAC-SHA256(payment_id + "|" + subscription_id, key_secret)
  const expectedSignature = createHmac("sha256", keySecret)
    .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    console.warn("[verify] Invalid signature for userId:", session.userId);
    return NextResponse.json({ error: "Invalid payment signature." }, { status: 400 });
  }

  // Signature valid — upgrade user (idempotent: only update if not already paid)
  await db
    .update(users)
    .set({
      subscriptionStatus: "paid",
      razorpaySubscriptionId: razorpay_subscription_id,
    })
    .where(eq(users.id, session.userId));

  console.log(`[verify] User ${session.userId} upgraded to paid via Razorpay`);

  return NextResponse.json({ success: true }, { status: 200 });
}
