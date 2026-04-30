import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { stripe } from "@/lib/stripe/client";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

/**
 * POST /api/webhooks/stripe
 *
 * Stripe sends raw POST — body must not be parsed before signature verification.
 * This is the ONLY source of truth for subscription upgrades (NFR7 / AC2).
 * Never upgrade a user on the success redirect alone.
 *
 * Excluded from auth middleware — Stripe calls this directly.
 * Excluded from Next.js body parser — we read raw text for signature verification.
 */
export async function POST(req: NextRequest) {
  // Raw body required for Stripe signature verification
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[webhook] Signature verification failed:", message);
    return NextResponse.json({ error: "Webhook signature verification failed." }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const customerId = typeof session.customer === "string" ? session.customer : null;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : null;

      if (!userId) {
        console.error("[webhook] checkout.session.completed missing client_reference_id");
        return NextResponse.json({ error: "Missing user reference." }, { status: 400 });
      }

      // Idempotent: only update if not already paid (webhook may fire more than once)
      const [user] = await db
        .select({ subscriptionStatus: users.subscriptionStatus })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user && user.subscriptionStatus !== "paid") {
        await db
          .update(users)
          .set({
            subscriptionStatus: "paid",
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
          })
          .where(eq(users.id, userId));

        console.log(`[webhook] User ${userId} upgraded to paid`);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      // AC3 future: downgrade on cancellation/payment failure
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string" ? subscription.customer : null;

      if (customerId) {
        await db
          .update(users)
          .set({ subscriptionStatus: "free" })
          .where(eq(users.stripeCustomerId, customerId));

        console.log(`[webhook] Customer ${customerId} downgraded to free`);
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[webhook] DB error handling event:", message);
    // Return 500 so Stripe retries the webhook
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
