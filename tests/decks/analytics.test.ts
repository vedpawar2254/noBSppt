import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  getSessionFromRequest: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("@/lib/auth/admin-guard", () => ({
  getAdminSession: vi.fn(),
}));

import { POST as PostView } from "@/app/api/decks/[id]/view/route";
import { GET as GetStats } from "@/app/api/decks/[id]/stats/route";
import { GET as GetMetrics } from "@/app/api/admin/metrics/route";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getAdminSession } from "@/lib/auth/admin-guard";
import { db } from "@/lib/db";

const mockGetSession = vi.mocked(getSessionFromRequest);
const mockGetAdminSession = vi.mocked(getAdminSession);
const mockDb = vi.mocked(db);

const OWNER_SESSION = { userId: "owner-uuid", email: "owner@example.com" };
const OTHER_SESSION = { userId: "other-uuid", email: "other@example.com" };
const ADMIN_SESSION = { userId: "admin-uuid", email: "admin@example.com" };

function makeReq(path: string, opts?: { cookies?: Record<string, string> }) {
  const url = new URL(`http://localhost${path}`);
  const headers = new Headers();
  if (opts?.cookies) {
    const cookieStr = Object.entries(opts.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
    headers.set("Cookie", cookieStr);
  }
  return new NextRequest(url.toString(), { method: "POST", headers });
}

function makeGetReq(path: string) {
  return new NextRequest(`http://localhost${path}`, { method: "GET" });
}

/** Chain mock for db.select queries — thenable so it resolves when awaited directly
 * (no .limit() call needed) AND resolves on .limit() too. */
function mockSelectChain(result: unknown[]) {
  const resolved = Promise.resolve(result);
  const chain: Record<string, unknown> = {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
    // Thenable: resolves when awaited directly (e.g. inside Promise.all without .limit())
    then: resolved.then.bind(resolved),
    catch: resolved.catch.bind(resolved),
    finally: resolved.finally.bind(resolved),
  };
  return chain;
}

/** Mock db.insert().values() */
function mockInsert() {
  const chain = { values: vi.fn().mockResolvedValue([]) };
  mockDb.insert = vi.fn().mockReturnValue(chain);
  return chain;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/decks/[id]/view
// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/decks/[id]/view", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 for unknown deck", async () => {
    mockGetSession.mockResolvedValue(null);
    mockDb.select = vi.fn().mockReturnValue(mockSelectChain([])); // deck not found
    const res = await PostView(makeReq("/api/decks/no-deck/view"), {
      params: { id: "no-deck" },
    });
    expect(res.status).toBe(404);
  });

  it("records view for anonymous visitor (AC1)", async () => {
    mockGetSession.mockResolvedValue(null);
    const insertChain = mockInsert();

    // deck found, no existing dedup row
    mockDb.select = vi.fn()
      .mockReturnValueOnce(mockSelectChain([{ userId: "owner-uuid" }]))  // deck lookup
      .mockReturnValueOnce(mockSelectChain([]));                          // no dedup row

    const res = await PostView(makeReq("/api/decks/deck-1/view"), {
      params: { id: "deck-1" },
    });

    expect(res.status).toBe(200);
    expect(insertChain.values).toHaveBeenCalled();
  });

  it("sets nobsppt_vid cookie for new visitor (AC1)", async () => {
    mockGetSession.mockResolvedValue(null);
    mockInsert();

    mockDb.select = vi.fn()
      .mockReturnValueOnce(mockSelectChain([{ userId: "owner-uuid" }]))
      .mockReturnValueOnce(mockSelectChain([]));

    const res = await PostView(makeReq("/api/decks/deck-1/view"), {
      params: { id: "deck-1" },
    });

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("nobsppt_vid=");
  });

  it("does NOT set cookie when visitor already has one", async () => {
    mockGetSession.mockResolvedValue(null);
    mockInsert();

    mockDb.select = vi.fn()
      .mockReturnValueOnce(mockSelectChain([{ userId: "owner-uuid" }]))
      .mockReturnValueOnce(mockSelectChain([]));

    // Request with existing cookie
    const res = await PostView(
      makeReq("/api/decks/deck-1/view", { cookies: { nobsppt_vid: "existing-vid" } }),
      { params: { id: "deck-1" } }
    );

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeNull();
  });

  it("skips insert when owner is viewing (no self-view — AC1 dev notes)", async () => {
    mockGetSession.mockResolvedValue(OWNER_SESSION); // viewer = owner
    const insertChain = mockInsert();

    mockDb.select = vi.fn()
      .mockReturnValue(mockSelectChain([{ userId: "owner-uuid" }])); // deck.userId = owner

    const res = await PostView(makeReq("/api/decks/deck-1/view"), {
      params: { id: "deck-1" },
    });

    expect(res.status).toBe(200);
    expect(insertChain.values).not.toHaveBeenCalled();
  });

  it("skips insert when same visitor viewed within last 30 min (AC4)", async () => {
    mockGetSession.mockResolvedValue(null);
    const insertChain = mockInsert();

    mockDb.select = vi.fn()
      .mockReturnValueOnce(mockSelectChain([{ userId: "owner-uuid" }]))  // deck
      .mockReturnValueOnce(mockSelectChain([{ id: "view-uuid" }]));      // dedup hit

    const res = await PostView(
      makeReq("/api/decks/deck-1/view", { cookies: { nobsppt_vid: "visitor-abc" } }),
      { params: { id: "deck-1" } }
    );

    expect(res.status).toBe(200);
    expect(insertChain.values).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/decks/[id]/stats
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/decks/[id]/stats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GetStats(makeGetReq("/api/decks/deck-1/stats"), {
      params: { id: "deck-1" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 for deck owned by another user", async () => {
    mockGetSession.mockResolvedValue(OTHER_SESSION);
    mockDb.select = vi.fn().mockReturnValue(mockSelectChain([])); // ownership check fails
    const res = await GetStats(makeGetReq("/api/decks/deck-1/stats"), {
      params: { id: "deck-1" },
    });
    expect(res.status).toBe(404);
  });

  it("returns stats for deck owner (AC2)", async () => {
    mockGetSession.mockResolvedValue(OWNER_SESSION);

    // ownership check, then two parallel selects (allTime, recent)
    mockDb.select = vi.fn()
      .mockReturnValueOnce(mockSelectChain([{ id: "deck-1" }]))               // ownership
      .mockReturnValueOnce(mockSelectChain([{ totalViews: 42, uniqueVisitors: 18 }])) // allTime
      .mockReturnValueOnce(mockSelectChain([{ viewsLast7Days: 7 }]));         // recent

    const res = await GetStats(makeGetReq("/api/decks/deck-1/stats"), {
      params: { id: "deck-1" },
    });

    expect(res.status).toBe(200);
    const { stats } = await res.json();
    expect(stats.totalViews).toBe(42);
    expect(stats.uniqueVisitors).toBe(18);
    expect(stats.viewsLast7Days).toBe(7);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/metrics — verify view metrics extension (AC3)
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/admin/metrics — view analytics extension", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 for unauthenticated admin", async () => {
    mockGetAdminSession.mockResolvedValue({ session: null, status: 401 });
    const res = await GetMetrics();
    expect(res.status).toBe(401);
  });

  it("includes totalViews and topDecks in metrics (AC3)", async () => {
    mockGetAdminSession.mockResolvedValue({ session: ADMIN_SESSION, status: "ok" });

    const chain0 = mockSelectChain([{ totalDecks: 10 }]);
    const chain1 = mockSelectChain([{ totalUsers: 5 }]);
    const chain2 = mockSelectChain([{ totalPaid: 2 }]);
    const chain3 = mockSelectChain([{ conversions: 1 }]);
    const chain4 = mockSelectChain([{ totalViews: 99 }]);
    const topDecksChain = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        { deckId: "d1", title: "Best Deck", views: 60 },
        { deckId: "d2", title: "Second", views: 39 },
      ]),
    };

    mockDb.select = vi.fn()
      .mockReturnValueOnce(chain0)
      .mockReturnValueOnce(chain1)
      .mockReturnValueOnce(chain2)
      .mockReturnValueOnce(chain3)
      .mockReturnValueOnce(chain4)
      .mockReturnValueOnce(topDecksChain);

    const res = await GetMetrics();
    expect(res.status).toBe(200);
    const { metrics } = await res.json();

    expect(metrics.totalViews).toBe(99);
    expect(metrics.topDecks).toHaveLength(2);
    expect(metrics.topDecks[0].title).toBe("Best Deck");
  });
});
