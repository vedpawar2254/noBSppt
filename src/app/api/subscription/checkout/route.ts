import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { razorpay } from "@/lib/razorpay/client";

/**
 * POST /api/subscription/checkout
 *
 * Creates a Razorpay Subscription and returns { subscriptionId, keyId }.
 * The client opens the Razorpay modal with these — no redirect to hosted page (AC1).
 * Card data never touches nobsppt servers (AC1, NFR7).
 */
export async function POST(req: NextRequest) {
  void req;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [user] = await db
    .select({ subscriptionStatus: users.subscriptionStatus })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (user.subscriptionStatus === "paid") {
    return NextResponse.json({ error: "Already subscribed." }, { status: 409 });
  }

  const planId = process.env.RAZORPAY_PLAN_ID;
  if (!planId) {
    console.error("[checkout] RAZORPAY_PLAN_ID env variable not set");
    return NextResponse.json({ error: "Checkout not configured." }, { status: 503 });
  }

  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12, // 12 billing cycles
      quantity: 1,
      notes: { userId: session.userId },
    });

    return NextResponse.json(
      {
        subscriptionId: subscription.id,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[checkout] Razorpay error:", message);
    return NextResponse.json({ error: "Failed to create checkout session." }, { status: 502 });
  }
}
