import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createHmac } from "crypto";

vi.mock("@/lib/db", () => ({ db: { update: vi.fn() } }));

import { POST } from "@/app/api/webhooks/razorpay/route";
import { db } from "@/lib/db";

const mockDb = vi.mocked(db);

const WEBHOOK_SECRET = "test-webhook-secret";
const USER_ID = "user-uuid-webhook";
const SUBSCRIPTION_ID = "sub_webhook_abc";

function makeSignature(body: string) {
  return createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
}

function makeRequest(eventType: string, signature?: string) {
  const body = JSON.stringify({
    event: eventType,
    payload: {
      subscription: {
        entity: {
          id: SUBSCRIPTION_ID,
          notes: { userId: USER_ID },
        },
      },
    },
  });
  const sig = signature ?? makeSignature(body);
  return new NextRequest("http://localhost/api/webhooks/razorpay", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": sig,
    },
    body,
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

describe("POST /api/webhooks/razorpay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  it("returns 400 when signature is invalid", async () => {
    const res = await POST(makeRequest("subscription.activated", "bad-sig"));
    expect(res.status).toBe(400);
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("sets subscription_status = paid on subscription.activated (AC4)", async () => {
    const updateChain = mockUpdateChain();
    const res = await POST(makeRequest("subscription.activated"));

    expect(res.status).toBe(200);
    expect(mockDb.update).toHaveBeenCalled();
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionStatus: "paid" })
    );
  });

  it("returns 200 without DB update on subscription.charged (AC4 — renewal log)", async () => {
    const res = await POST(makeRequest("subscription.charged"));
    expect(res.status).toBe(200);
    // charged = already paid, just log — no DB update needed
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("sets subscription_status = free on subscription.cancelled (AC3)", async () => {
    const updateChain = mockUpdateChain();
    const res = await POST(makeRequest("subscription.cancelled"));

    expect(res.status).toBe(200);
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionStatus: "free" })
    );
  });

  it("sets subscription_status = free on subscription.completed", async () => {
    const updateChain = mockUpdateChain();
    const res = await POST(makeRequest("subscription.completed"));

    expect(res.status).toBe(200);
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionStatus: "free" })
    );
  });

  it("returns 200 without DB update on payment.failed", async () => {
    const res = await POST(makeRequest("payment.failed"));
    expect(res.status).toBe(200);
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("returns 200 for unknown events (no crash)", async () => {
    const res = await POST(makeRequest("unknown.event"));
    expect(res.status).toBe(200);
  });
});
