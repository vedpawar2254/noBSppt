import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ db: { select: vi.fn() } }));
vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/razorpay/client", () => ({
  razorpay: {
    subscriptions: { create: vi.fn() },
  },
}));

import { POST } from "@/app/api/subscription/checkout/route";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { razorpay } from "@/lib/razorpay/client";

const mockDb = vi.mocked(db);
const mockGetSession = vi.mocked(getSession);
const mockRazorpay = vi.mocked(razorpay);

const SESSION = { userId: "user-uuid", email: "user@example.com" };

function makeRequest() {
  return new NextRequest("http://localhost/api/subscription/checkout", { method: "POST" });
}

function mockUserFound(subscriptionStatus = "free") {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ subscriptionStatus }]),
  };
  mockDb.select = vi.fn().mockReturnValue(chain);
}

function mockUserNotFound() {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  };
  mockDb.select = vi.fn().mockReturnValue(chain);
}

describe("POST /api/subscription/checkout (Razorpay)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAZORPAY_PLAN_ID = "plan_test_123";
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 404 when user not found", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockUserNotFound();
    const res = await POST(makeRequest());
    expect(res.status).toBe(404);
  });

  it("returns 409 when already subscribed", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockUserFound("paid");
    const res = await POST(makeRequest());
    expect(res.status).toBe(409);
  });

  it("returns 200 with subscriptionId and keyId (AC1)", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockUserFound("free");
    mockRazorpay.subscriptions.create = vi.fn().mockResolvedValue({
      id: "sub_razorpay_123",
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.subscriptionId).toBe("sub_razorpay_123");
    expect(body.keyId).toBe("rzp_test_key");
    // Must NOT return a redirect URL (Razorpay uses modal, not redirect)
    expect(body.url).toBeUndefined();
  });

  it("returns 503 when RAZORPAY_PLAN_ID is not configured", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockUserFound("free");
    delete process.env.RAZORPAY_PLAN_ID;

    const res = await POST(makeRequest());
    expect(res.status).toBe(503);
  });

  it("returns 502 when Razorpay SDK throws", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockUserFound("free");
    mockRazorpay.subscriptions.create = vi.fn().mockRejectedValue(new Error("API error"));

    const res = await POST(makeRequest());
    expect(res.status).toBe(502);
  });
});
