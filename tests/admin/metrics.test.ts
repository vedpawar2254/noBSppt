import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: { select: vi.fn() },
}));

// Mock admin-guard so tests control auth outcome without DB role lookup
vi.mock("@/lib/auth/admin-guard", () => ({
  getAdminSession: vi.fn(),
}));

import { GET } from "@/app/api/admin/metrics/route";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/admin-guard";

const mockDb = vi.mocked(db);
const mockGetAdminSession = vi.mocked(getAdminSession);

const ADMIN_SESSION = { userId: "admin-uuid", email: "admin@example.com" };

function makeRequest() {
  return new NextRequest("http://localhost/api/admin/metrics", { method: "GET" });
}

function mockMetrics({
  totalDecks = 42,
  totalUsers = 18,
  totalPaid = 3,
  conversions = 3,
} = {}) {
  mockDb.select = vi.fn()
    .mockReturnValueOnce({
      from: vi.fn().mockResolvedValue([{ totalDecks }]),
    })
    .mockReturnValueOnce({
      from: vi.fn().mockResolvedValue([{ totalUsers }]),
    })
    .mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ totalPaid }]),
      }),
    })
    .mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ conversions }]),
      }),
    });
}

describe("GET /api/admin/metrics", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 401 when not authenticated", async () => {
    mockGetAdminSession.mockResolvedValue({ session: null, status: 401 });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 when authenticated but not admin", async () => {
    mockGetAdminSession.mockResolvedValue({ session: null, status: 403 });
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns 200 with all four metrics for admin (AC1, AC2)", async () => {
    mockGetAdminSession.mockResolvedValue({ session: ADMIN_SESSION, status: "ok" });
    mockMetrics({ totalDecks: 42, totalUsers: 18, totalPaid: 3, conversions: 3 });

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.metrics.totalDecks).toBe(42);
    expect(body.metrics.totalUsers).toBe(18);
    expect(body.metrics.totalPaid).toBe(3);
    expect(body.metrics.conversions).toBe(3);
  });

  it("returns zero counts when database is empty", async () => {
    mockGetAdminSession.mockResolvedValue({ session: ADMIN_SESSION, status: "ok" });
    mockMetrics({ totalDecks: 0, totalUsers: 0, totalPaid: 0, conversions: 0 });

    const res = await GET();
    const body = await res.json();
    expect(body.metrics.totalDecks).toBe(0);
    expect(body.metrics.totalUsers).toBe(0);
    expect(body.metrics.totalPaid).toBe(0);
    expect(body.metrics.conversions).toBe(0);
  });

  it("conversions are a subset of paid (AC2 — FR29)", async () => {
    // conversions can be less than totalPaid (paid users with 0 decks)
    mockGetAdminSession.mockResolvedValue({ session: ADMIN_SESSION, status: "ok" });
    mockMetrics({ totalDecks: 10, totalUsers: 5, totalPaid: 3, conversions: 2 });

    const res = await GET();
    const body = await res.json();
    expect(body.metrics.conversions).toBeLessThanOrEqual(body.metrics.totalPaid);
  });
});
