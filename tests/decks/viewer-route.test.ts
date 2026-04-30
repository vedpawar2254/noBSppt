import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: { select: vi.fn() },
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

import { GET } from "@/app/api/decks/[id]/route";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

const mockDb = vi.mocked(db);
const mockGetSession = vi.mocked(getSession);

const SESSION = { userId: "owner-uuid", email: "owner@example.com" };
const DECK_ID = "deck-uuid-abc";
const MOCK_DECK = {
  id: DECK_ID,
  title: "Test Deck Title",
  slides: [
    { title: "Slide One", bullets: ["Point A", "Point B"] },
    { title: "Slide Two", bullets: ["Point C"] },
  ],
  theme: "default",
  status: "done",
  createdAt: new Date("2026-04-01"),
};

function makeRequest(id = DECK_ID) {
  return new NextRequest(`http://localhost/api/decks/${id}`, { method: "GET" });
}

function mockDeckFound() {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([MOCK_DECK]),
  };
  mockDb.select = vi.fn().mockReturnValue(chain);
}

function mockDeckNotFound() {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  };
  mockDb.select = vi.fn().mockReturnValue(chain);
  return chain;
}

describe("GET /api/decks/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeRequest(), { params: { id: DECK_ID } });
    expect(res.status).toBe(401);
  });

  // AC4 — fetch stored deck
  it("returns 200 with deck data when owner requests it (AC4)", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockDeckFound();

    const res = await GET(makeRequest(), { params: { id: DECK_ID } });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.deck.id).toBe(DECK_ID);
    expect(body.deck.title).toBe("Test Deck Title");
    expect(body.deck.slides).toHaveLength(2);
    expect(body.deck.theme).toBe("default");
  });

  // AC3 — UUID in URL (not sequential)
  it("uses the id param directly as UUID lookup (AC3 — NFR9)", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const chain = mockDeckNotFound();

    await GET(makeRequest("some-uuid-123"), { params: { id: "some-uuid-123" } });

    // where() was called — verifies id-based lookup path
    expect(chain.where).toHaveBeenCalled();
  });

  // Owner-only access
  it("returns 404 when deck belongs to a different user", async () => {
    mockGetSession.mockResolvedValue({ userId: "other-user", email: "other@example.com" });
    mockDeckNotFound(); // AND(deckId, userId) finds nothing for wrong user

    const res = await GET(makeRequest(), { params: { id: DECK_ID } });
    expect(res.status).toBe(404);
  });

  it("returns 404 when deck id does not exist", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockDeckNotFound();

    const res = await GET(makeRequest("nonexistent"), { params: { id: "nonexistent" } });
    expect(res.status).toBe(404);
  });

  it("returns slides array in response", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockDeckFound();

    const res = await GET(makeRequest(), { params: { id: DECK_ID } });
    const body = await res.json();
    expect(body.deck.slides[0]).toEqual({ title: "Slide One", bullets: ["Point A", "Point B"] });
  });
});
