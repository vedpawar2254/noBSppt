import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { stripe } from "@/lib/stripe/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(req: NextRequest) {
  void req; // no body needed

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [user] = await db
    .select({
      email: users.email,
      subscriptionStatus: users.subscriptionStatus,
      stripeCustomerId: users.stripeCustomerId,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  // AC3: already paid — don't create a redundant session
  if (user.subscriptionStatus === "paid") {
    return NextResponse.json({ error: "Already subscribed." }, { status: 409 });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    console.error("[checkout] STRIPE_PRICE_ID env variable not set");
    return NextResponse.json({ error: "Checkout not configured." }, { status: 503 });
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // Reuse existing Stripe customer if present; otherwise pre-fill email
      ...(user.stripeCustomerId
        ? { customer: user.stripeCustomerId }
        : { customer_email: user.email }),
      // client_reference_id lets the webhook correlate back to our userId (AC2)
      client_reference_id: session.userId,
      // AC2: success → /create with flag for success banner
      // AC3: cancel → /create (input still in page state if not refreshed)
      success_url: `${APP_URL}/create?upgraded=true`,
      cancel_url: `${APP_URL}/create`,
    });

    return NextResponse.json({ url: checkoutSession.url }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[checkout] Stripe error:", message);
    return NextResponse.json({ error: "Failed to create checkout session." }, { status: 502 });
  }
}
