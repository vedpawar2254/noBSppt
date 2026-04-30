import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { select: vi.fn() },
}));

vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  },
}));

import { POST } from "@/app/api/subscription/checkout/route";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe/client";

const mockGetSession = vi.mocked(getSession);
const mockDb = vi.mocked(db);
const mockCreate = vi.mocked(stripe.checkout.sessions.create);

const SESSION = { userId: "user-uuid", email: "user@example.com" };

function makeReq() {
  return new NextRequest("http://localhost/api/subscription/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

function mockUser(overrides: Partial<{ email: string; subscriptionStatus: string; stripeCustomerId: string | null }> = {}) {
  const user = {
    email: "user@example.com",
    subscriptionStatus: "free",
    stripeCustomerId: null,
    ...overrides,
  };
  mockDb.select = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([user]),
  });
  return user;
}

function mockUserNotFound() {
  mockDb.select = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  });
}

describe("POST /api/subscription/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_PRICE_ID = "price_test_123";
  });

  // Auth
  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  // User not found
  it("returns 404 when user not found in DB", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockUserNotFound();
    const res = await POST(makeReq());
    expect(res.status).toBe(404);
  });

  // Already paid (AC3)
  it("returns 409 when user is already subscribed (AC3)", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockUser({ subscriptionStatus: "paid" });
    const res = await POST(makeReq());
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already subscribed/i);
  });

  // Happy path (AC1)
  it("returns 200 with Stripe checkout URL for free user (AC1)", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockUser();
    mockCreate.mockResolvedValue({ url: "https://checkout.stripe.com/pay/cs_test_abc" } as never);

    const res = await POST(makeReq());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe("https://checkout.stripe.com/pay/cs_test_abc");
  });

  // AC1: correct Stripe params
  it("passes correct params to Stripe — client_reference_id, mode, price (AC1)", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockUser({ email: "user@example.com", stripeCustomerId: null });
    mockCreate.mockResolvedValue({ url: "https://checkout.stripe.com/pay/cs_test" } as never);

    await POST(makeReq());

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        client_reference_id: "user-uuid",
        line_items: [{ price: "price_test_123", quantity: 1 }],
        customer_email: "user@example.com", // no existing customer
        success_url: expect.stringContaining("/create?upgraded=true"),
        cancel_url: expect.stringContaining("/create"),
      })
    );
  });

  // AC1: existing Stripe customer — use customer ID not email
  it("passes customer ID (not email) when user already has stripeCustomerId", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockUser({ stripeCustomerId: "cus_existing123" });
    mockCreate.mockResolvedValue({ url: "https://checkout.stripe.com/pay/cs" } as never);

    await POST(makeReq());

    const call = mockCreate.mock.calls[0][0] as Record<string, unknown>;
    expect(call.customer).toBe("cus_existing123");
    expect(call.customer_email).toBeUndefined();
  });

  // Stripe error → 502
  it("returns 502 when Stripe throws (AC1)", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockUser();
    mockCreate.mockRejectedValue(new Error("Stripe API error"));

    const res = await POST(makeReq());

    expect(res.status).toBe(502);
  });

  // Missing STRIPE_PRICE_ID → 503
  it("returns 503 when STRIPE_PRICE_ID is not configured", async () => {
    delete process.env.STRIPE_PRICE_ID;
    mockGetSession.mockResolvedValue(SESSION);
    mockUser();

    const res = await POST(makeReq());

    expect(res.status).toBe(503);
  });
});
