import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

/**
 * POST /api/webhooks/razorpay
 *
 * Handles Razorpay subscription lifecycle events (AC4).
 * Webhook signature verified via HMAC-SHA256(body, RAZORPAY_WEBHOOK_SECRET).
 *
 * Events handled:
 *   subscription.activated  → set paid (idempotent)
 *   subscription.charged    → renewal confirmation (log only)
 *   subscription.cancelled  → set free
 *   subscription.completed  → set free
 *   payment.failed          → log (user remains on current status)
 */

// Raw body required for signature verification — disable body parsing
export const config = { api: { bodyParser: false } };

function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return expected === signature;
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook/razorpay] RAZORPAY_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
    console.warn("[webhook/razorpay] Invalid signature");
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: { event: string; payload?: { subscription?: { entity?: { id?: string; notes?: { userId?: string } } } } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const subscriptionEntity = event.payload?.subscription?.entity;
  const subscriptionId = subscriptionEntity?.id;
  const userId = subscriptionEntity?.notes?.userId;

  console.log(`[webhook/razorpay] event=${event.event} subscriptionId=${subscriptionId} userId=${userId}`);

  switch (event.event) {
    case "subscription.activated":
      // AC4: renewal / initial activation — set paid (idempotent)
      if (userId) {
        await db
          .update(users)
          .set({ subscriptionStatus: "paid", razorpaySubscriptionId: subscriptionId ?? null })
          .where(eq(users.id, userId));
        console.log(`[webhook/razorpay] User ${userId} activated`);
      }
      break;

    case "subscription.charged":
      // AC4: successful renewal — subscription stays active, log only
      console.log(`[webhook/razorpay] Renewal charged for subscription ${subscriptionId}`);
      break;

    case "subscription.cancelled":
    case "subscription.completed":
      // Subscription ended — downgrade to free
      if (userId) {
        await db
          .update(users)
          .set({ subscriptionStatus: "free", razorpaySubscriptionId: null })
          .where(eq(users.id, userId));
        console.log(`[webhook/razorpay] User ${userId} downgraded (${event.event})`);
      }
      break;

    case "payment.failed":
      // Log only — user stays on current status, Razorpay retries automatically
      console.warn(`[webhook/razorpay] Payment failed for subscription ${subscriptionId}`);
      break;

    default:
      // Unknown event — acknowledge without action
      console.log(`[webhook/razorpay] Unhandled event: ${event.event}`);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
