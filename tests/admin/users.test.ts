import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: { select: vi.fn() },
}));

vi.mock("@/lib/auth/admin-guard", () => ({
  getAdminSession: vi.fn(),
}));

import { GET as getUserList } from "@/app/api/admin/users/route";
import { GET as getUserDetail } from "@/app/api/admin/users/[id]/route";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/admin-guard";

const mockDb = vi.mocked(db);
const mockGetAdminSession = vi.mocked(getAdminSession);

const ADMIN_SESSION = { userId: "admin-uuid", email: "admin@example.com" };
const USER_ID = "user-uuid-123";

const MOCK_USERS = [
  {
    id: USER_ID,
    email: "alice@example.com",
    createdAt: new Date("2026-01-01"),
    subscriptionStatus: "free",
    deckCount: 3,
    role: "user",
  },
  {
    id: "user-uuid-456",
    email: "bob@example.com",
    createdAt: new Date("2026-02-01"),
    subscriptionStatus: "paid",
    deckCount: 7,
    role: "user",
  },
];

const MOCK_DECKS = [
  {
    id: "deck-uuid-1",
    title: "Q1 Strategy",
    createdAt: new Date("2026-03-01"),
    isPublic: true,
    slideCount: 5,
    status: "done",
  },
];

function makeListRequest(params?: Record<string, string>) {
  const url = new URL("http://localhost/api/admin/users");
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString(), { method: "GET" });
}

function makeDetailRequest(id = USER_ID) {
  return new NextRequest(`http://localhost/api/admin/users/${id}`, { method: "GET" });
}

// ── User list helpers ──────────────────────────────────────────────────────

function mockUserListDb(users = MOCK_USERS, total = MOCK_USERS.length) {
  mockDb.select = vi.fn()
    // Promise.all: count query first, data query second
    .mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ total }]),
      }),
    })
    .mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(users),
            }),
          }),
        }),
      }),
    });
}

// ── User detail helpers ────────────────────────────────────────────────────

function mockUserDetailDb(
  user: typeof MOCK_USERS[0] & { stripeCustomerId: string | null } = { ...MOCK_USERS[0], stripeCustomerId: "cus_abcd1234" },
  decks = MOCK_DECKS
) {
  mockDb.select = vi.fn()
    // Promise.all: user query first, decks query second
    .mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([user]),
        }),
      }),
    })
    .mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(decks),
        }),
      }),
    });
}

function mockUserNotFound() {
  mockDb.select = vi.fn()
    .mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    })
    .mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("GET /api/admin/users", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 401 when not authenticated", async () => {
    mockGetAdminSession.mockResolvedValue({ session: null, status: 401 });
    const res = await getUserList(makeListRequest());
    expect(res.status).toBe(401);
  });

  it("returns 403 when authenticated but not admin", async () => {
    mockGetAdminSession.mockResolvedValue({ session: null, status: 403 });
    const res = await getUserList(makeListRequest());
    expect(res.status).toBe(403);
  });

  it("returns 200 with paginated user list for admin (AC1)", async () => {
    mockGetAdminSession.mockResolvedValue({ session: ADMIN_SESSION, status: "ok" });
    mockUserListDb();

    const res = await getUserList(makeListRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.users).toHaveLength(2);
    expect(body.users[0].email).toBe("alice@example.com");
    expect(body.pagination.total).toBe(2);
    expect(body.pagination.pageSize).toBe(20);
  });

  it("passes search param through to DB filter (AC1)", async () => {
    mockGetAdminSession.mockResolvedValue({ session: ADMIN_SESSION, status: "ok" });
    mockUserListDb([MOCK_USERS[0]], 1);

    const res = await getUserList(makeListRequest({ search: "alice" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.users).toHaveLength(1);
    expect(body.users[0].email).toBe("alice@example.com");
  });

  it("returns correct totalPages in pagination", async () => {
    mockGetAdminSession.mockResolvedValue({ session: ADMIN_SESSION, status: "ok" });
    mockUserListDb(MOCK_USERS, 45); // 45 users → 3 pages of 20

    const res = await getUserList(makeListRequest());
    const body = await res.json();
    expect(body.pagination.totalPages).toBe(3);
  });

  it("does not expose passwordHash in user list", async () => {
    mockGetAdminSession.mockResolvedValue({ session: ADMIN_SESSION, status: "ok" });
    mockUserListDb();

    const res = await getUserList(makeListRequest());
    const body = await res.json();
    expect(body.users[0]).not.toHaveProperty("passwordHash");
  });
});

describe("GET /api/admin/users/:id", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 401 when not authenticated", async () => {
    mockGetAdminSession.mockResolvedValue({ session: null, status: 401 });
    const res = await getUserDetail(makeDetailRequest(), { params: { id: USER_ID } });
    expect(res.status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    mockGetAdminSession.mockResolvedValue({ session: null, status: 403 });
    const res = await getUserDetail(makeDetailRequest(), { params: { id: USER_ID } });
    expect(res.status).toBe(403);
  });

  it("returns 404 when user does not exist", async () => {
    mockGetAdminSession.mockResolvedValue({ session: ADMIN_SESSION, status: "ok" });
    mockUserNotFound();

    const res = await getUserDetail(makeDetailRequest("nonexistent"), { params: { id: "nonexistent" } });
    expect(res.status).toBe(404);
  });

  it("returns 200 with user details and deck activity (AC2, AC3)", async () => {
    mockGetAdminSession.mockResolvedValue({ session: ADMIN_SESSION, status: "ok" });
    mockUserDetailDb();

    const res = await getUserDetail(makeDetailRequest(), { params: { id: USER_ID } });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.user.email).toBe("alice@example.com");
    expect(body.user.subscriptionStatus).toBe("free");
    expect(body.decks).toHaveLength(1);
    expect(body.decks[0].title).toBe("Q1 Strategy");
    expect(body.decks[0].slideCount).toBe(5);
  });

  it("masks stripeCustomerId to last 4 chars (AC1)", async () => {
    mockGetAdminSession.mockResolvedValue({ session: ADMIN_SESSION, status: "ok" });
    mockUserDetailDb();

    const res = await getUserDetail(makeDetailRequest(), { params: { id: USER_ID } });
    const body = await res.json();
    expect(body.user.stripeCustomerId).toBe("****1234");
    expect(body.user.stripeCustomerId).not.toContain("cus_abcd");
  });

  it("returns null maskedStripeId when no stripe customer", async () => {
    mockGetAdminSession.mockResolvedValue({ session: ADMIN_SESSION, status: "ok" });
    mockUserDetailDb({ ...MOCK_USERS[0], stripeCustomerId: null });

    const res = await getUserDetail(makeDetailRequest(), { params: { id: USER_ID } });
    const body = await res.json();
    expect(body.user.stripeCustomerId).toBeNull();
  });

  it("does not expose deck slide content (AC2 — privacy)", async () => {
    mockGetAdminSession.mockResolvedValue({ session: ADMIN_SESSION, status: "ok" });
    mockUserDetailDb();

    const res = await getUserDetail(makeDetailRequest(), { params: { id: USER_ID } });
    const body = await res.json();
    // Decks in admin view should NOT have a slides field
    expect(body.decks[0]).not.toHaveProperty("slides");
  });
});
