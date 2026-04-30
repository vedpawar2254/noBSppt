import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createHmac } from "crypto";

vi.mock("@/lib/db", () => ({ db: { select: vi.fn(), update: vi.fn() } }));
vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn() }));

import { POST } from "@/app/api/subscription/verify/route";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

const mockDb = vi.mocked(db);
const mockGetSession = vi.mocked(getSession);
const SESSION = { userId: "user-uuid", email: "user@example.com" };

const KEY_SECRET = "test-razorpay-key-secret";
const PAYMENT_ID = "pay_test_123";
const SUBSCRIPTION_ID = "sub_test_abc";

function makeSignature(paymentId: string, subscriptionId: string) {
  return createHmac("sha256", KEY_SECRET)
    .update(`${paymentId}|${subscriptionId}`)
    .digest("hex");
}

function makeRequest(body: Record<string, string>) {
  return new NextRequest("http://localhost/api/subscription/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockUpdateChain() {
  const chain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  };
  mockDb.update = vi.fn().mockReturnValue(chain);
  return chain;
}

describe("POST /api/subscription/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(makeRequest({
      razorpay_payment_id: PAYMENT_ID,
      razorpay_subscription_id: SUBSCRIPTION_ID,
      razorpay_signature: "any",
    }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await POST(makeRequest({ razorpay_payment_id: PAYMENT_ID }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when signature is invalid (AC2 — source of truth)", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await POST(makeRequest({
      razorpay_payment_id: PAYMENT_ID,
      razorpay_subscription_id: SUBSCRIPTION_ID,
      razorpay_signature: "invalid-signature",
    }));
    expect(res.status).toBe(400);
    // Must NOT upgrade user on invalid signature
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("returns 200 and upgrades user on valid HMAC-SHA256 signature (AC2)", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const updateChain = mockUpdateChain();
    const validSignature = makeSignature(PAYMENT_ID, SUBSCRIPTION_ID);

    const res = await POST(makeRequest({
      razorpay_payment_id: PAYMENT_ID,
      razorpay_subscription_id: SUBSCRIPTION_ID,
      razorpay_signature: validSignature,
    }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify DB update was called to set paid status
    expect(mockDb.update).toHaveBeenCalled();
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionStatus: "paid",
        razorpaySubscriptionId: SUBSCRIPTION_ID,
      })
    );
  });

  it("rejects tampered payment_id (AC2)", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const validSignature = makeSignature(PAYMENT_ID, SUBSCRIPTION_ID);

    const res = await POST(makeRequest({
      razorpay_payment_id: "pay_tampered",
      razorpay_subscription_id: SUBSCRIPTION_ID,
      razorpay_signature: validSignature,
    }));

    expect(res.status).toBe(400);
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});
