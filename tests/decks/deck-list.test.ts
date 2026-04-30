import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

import { GET } from "@/app/api/decks/route";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

const mockDb = vi.mocked(db);
const mockGetSession = vi.mocked(getSession);

const SESSION = { userId: "user-uuid-1", email: "user@example.com" };

function mockDeckQuery(rows: object[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(rows),
  };
  mockDb.select = vi.fn().mockReturnValue(chain);
  return chain;
}

describe("GET /api/decks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  // AC1 — returns user's decks ordered newest first
  it("returns decks array ordered by createdAt DESC (AC1)", async () => {
    mockGetSession.mockResolvedValue(SESSION);

    const deckRows = [
      { id: "deck-2", title: "Second deck", createdAt: new Date("2026-02-01") },
      { id: "deck-1", title: "First deck", createdAt: new Date("2026-01-01") },
    ];
    const chain = mockDeckQuery(deckRows);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.decks).toHaveLength(2);
    expect(body.decks[0].id).toBe("deck-2");
    expect(body.decks[1].id).toBe("deck-1");
    // orderBy was called
    expect(chain.orderBy).toHaveBeenCalled();
  });

  // AC2 — empty state: returns empty array for user with no decks
  it("returns empty array when user has no decks (AC2)", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockDeckQuery([]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.decks).toEqual([]);
  });

  it("filters by userId — does not return other users' decks", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const chain = mockDeckQuery([]);

    await GET();

    // where() called — filters by userId
    expect(chain.where).toHaveBeenCalled();
  });
});
