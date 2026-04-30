import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock DB before importing route
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

// Mock session module to avoid next/headers in test env
vi.mock("@/lib/auth/session", () => ({
  createSessionToken: vi.fn().mockResolvedValue("mock-jwt-token"),
  setSessionCookie: vi.fn().mockResolvedValue(undefined),
  clearSessionCookie: vi.fn().mockResolvedValue(undefined),
}));

import { POST as loginPOST } from "@/app/api/auth/login/route";
import { POST as logoutPOST } from "@/app/api/auth/logout/route";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { clearSessionCookie } from "@/lib/auth/session";

// Reset the rate-limit store between tests by re-importing with vi.resetModules
// is complex — instead we test rate limit in isolation with its own describe block.

const mockDb = vi.mocked(db);

function makeLoginRequest(body: unknown, ip = "1.2.3.4") {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

function mockUserFound(passwordHash: string) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([
      { id: "user-uuid", email: "user@example.com", passwordHash },
    ]),
  };
  mockDb.select = vi.fn().mockReturnValue(chain);
  return chain;
}

function mockUserNotFound() {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  };
  mockDb.select = vi.fn().mockReturnValue(chain);
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AC1 — happy path
  it("returns 200 and sets session for valid credentials", async () => {
    const hash = await hashPassword("correctpassword");
    mockUserFound(hash);

    const res = await loginPOST(
      makeLoginRequest({ email: "user@example.com", password: "correctpassword" }, "10.0.0.1")
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.userId).toBe("user-uuid");
  });

  // AC2 — wrong password
  it("returns 401 with generic error for wrong password (AC2)", async () => {
    const hash = await hashPassword("correctpassword");
    mockUserFound(hash);

    const res = await loginPOST(
      makeLoginRequest({ email: "user@example.com", password: "wrongpassword" }, "10.0.0.2")
    );

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/invalid email or password/i);
  });

  // AC2 — email not found (generic error, no enumeration)
  it("returns 401 with same generic error when email not found (AC2 — no enumeration)", async () => {
    mockUserNotFound();

    const res = await loginPOST(
      makeLoginRequest({ email: "ghost@example.com", password: "anypassword" }, "10.0.0.3")
    );

    expect(res.status).toBe(401);
    const data = await res.json();
    // Must be the same message as wrong-password to prevent enumeration
    expect(data.error).toMatch(/invalid email or password/i);
  });

  it("returns 401 for missing fields", async () => {
    const res = await loginPOST(makeLoginRequest({ email: "" }, "10.0.0.9"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for malformed request body", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.8" },
      body: "not-json",
    });
    const res = await loginPOST(req);
    expect(res.status).toBe(400);
  });
});

describe("Rate limiting on /api/auth/login (AC3)", () => {
  it("returns 429 after max failed attempts from same IP", async () => {
    // Use a unique IP to isolate from other tests
    const ip = "192.168.99.1";

    // Pre-fill the rate limit store by importing and calling recordFailedAttempt directly
    const { recordFailedAttempt } = await import("@/lib/auth/rate-limit");

    // Exhaust the 5-attempt window
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(ip);
    }

    const hash = await hashPassword("anything");
    mockUserFound(hash);

    const res = await loginPOST(
      makeLoginRequest({ email: "user@example.com", password: "wrong" }, ip)
    );

    expect(res.status).toBe(429);
    // Must include Retry-After header (AC3)
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("includes Retry-After header with positive value when rate limited", async () => {
    const ip = "192.168.99.2";
    const { recordFailedAttempt } = await import("@/lib/auth/rate-limit");
    for (let i = 0; i < 5; i++) recordFailedAttempt(ip);

    const hash = await hashPassword("pass");
    mockUserFound(hash);

    const res = await loginPOST(makeLoginRequest({ email: "a@b.com", password: "x" }, ip));

    const retryAfter = Number(res.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThan(0);
  });

  it("different IPs have independent rate limit buckets", async () => {
    const { recordFailedAttempt } = await import("@/lib/auth/rate-limit");
    // Exhaust IP A
    const ipA = "192.168.88.1";
    for (let i = 0; i < 5; i++) recordFailedAttempt(ipA);

    // IP B should still be allowed
    const ipB = "192.168.88.2";
    const hash = await hashPassword("correctpassword");
    mockUserFound(hash);

    const res = await loginPOST(
      makeLoginRequest({ email: "user@example.com", password: "correctpassword" }, ipB)
    );

    expect(res.status).toBe(200);
  });
});

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AC4 — session cleared
  it("returns 200 and clears session cookie (AC4)", async () => {
    const res = await logoutPOST();

    expect(res.status).toBe(200);
    expect(vi.mocked(clearSessionCookie)).toHaveBeenCalledOnce();
  });

  it("returns success payload", async () => {
    const res = await logoutPOST();
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
