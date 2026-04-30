import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

import { POST } from "@/app/api/webhooks/stripe/route";
import { stripe } from "@/lib/stripe/client";
import { db } from "@/lib/db";

const mockConstructEvent = vi.mocked(stripe.webhooks.constructEvent);
const mockDb = vi.mocked(db);

function makeReq(body = "{}", sig = "valid-sig") {
  return new NextRequest("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": sig, "Content-Type": "application/json" },
    body,
  });
}

function mockUserSelect(subscriptionStatus: "free" | "paid") {
  mockDb.select = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ subscriptionStatus }]),
  });
}

function mockUpdateChain() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  mockDb.update = vi.fn().mockReturnValue({ set });
  return { set, where };
}

function makeCheckoutCompletedEvent(overrides: Partial<{
  client_reference_id: string | null;
  customer: string;
  subscription: string;
}> = {}) {
  return {
    type: "checkout.session.completed",
    data: {
      object: {
        client_reference_id: "user-uuid",
        customer: "cus_abc123",
        subscription: "sub_xyz789",
        ...overrides,
      },
    },
  };
}

function makeSubscriptionDeletedEvent(customerId = "cus_abc123") {
  return {
    type: "customer.subscription.deleted",
    data: {
      object: {
        customer: customerId,
      },
    },
  };
}

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  // Missing signature header
  it("returns 400 when stripe-signature header is missing", async () => {
    const req = new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/stripe-signature/i);
  });

  // Invalid signature — blocks spoofed events (AC2 security)
  it("returns 400 when Stripe signature verification fails (AC2)", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature for payload");
    });

    const res = await POST(makeReq());

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/signature verification failed/i);
  });

  // Missing env var
  it("returns 503 when STRIPE_WEBHOOK_SECRET is not configured", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await POST(makeReq());
    expect(res.status).toBe(503);
  });

  // AC2: successful checkout → user upgraded
  it("upgrades user to paid on checkout.session.completed (AC2)", async () => {
    mockConstructEvent.mockReturnValue(makeCheckoutCompletedEvent() as never);
    mockUserSelect("free");
    const { set, where } = mockUpdateChain();

    const res = await POST(makeReq());

    expect(res.status).toBe(200);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionStatus: "paid",
        stripeCustomerId: "cus_abc123",
        stripeSubscriptionId: "sub_xyz789",
      })
    );
    expect(where).toHaveBeenCalled();
  });

  // AC2 idempotency — duplicate webhook fires must not error
  it("is idempotent: does not re-update user already on paid (AC2)", async () => {
    mockConstructEvent.mockReturnValue(makeCheckoutCompletedEvent() as never);
    mockUserSelect("paid"); // already upgraded
    mockUpdateChain();

    const res = await POST(makeReq());

    expect(res.status).toBe(200);
    // update should NOT be called — user already paid
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  // AC2: missing client_reference_id — can't correlate to user
  it("returns 400 when client_reference_id is missing from completed session (AC2)", async () => {
    mockConstructEvent.mockReturnValue(
      makeCheckoutCompletedEvent({ client_reference_id: null }) as never
    );

    const res = await POST(makeReq());

    expect(res.status).toBe(400);
  });

  // AC3: subscription cancelled → downgrade
  it("downgrades user on customer.subscription.deleted (AC3)", async () => {
    mockConstructEvent.mockReturnValue(makeSubscriptionDeletedEvent() as never);
    const { where } = mockUpdateChain();

    const res = await POST(makeReq());

    expect(res.status).toBe(200);
    expect(mockDb.update).toHaveBeenCalled();
    expect(where).toHaveBeenCalled();
  });

  // Unknown event type — silently accepted (Stripe sends many event types)
  it("returns 200 for unhandled event types", async () => {
    mockConstructEvent.mockReturnValue({ type: "payment_intent.created", data: { object: {} } } as never);

    const res = await POST(makeReq());

    expect(res.status).toBe(200);
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  // DB error → 500 so Stripe retries
  it("returns 500 on DB error so Stripe retries the webhook", async () => {
    mockConstructEvent.mockReturnValue(makeCheckoutCompletedEvent() as never);
    mockUserSelect("free");
    mockDb.update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error("DB connection lost")),
      }),
    });

    const res = await POST(makeReq());

    expect(res.status).toBe(500);
  });
});
