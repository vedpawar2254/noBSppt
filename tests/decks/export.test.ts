import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: { select: vi.fn() },
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/pdf/generator", () => ({
  generateDeckPdf: vi.fn().mockResolvedValue(Buffer.from("%PDF-stub")),
}));

import { GET } from "@/app/api/decks/[id]/export/route";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

const mockDb = vi.mocked(db);
const mockGetSession = vi.mocked(getSession);

const SESSION = { userId: "owner-uuid", email: "owner@example.com" };
const DECK_ID = "deck-uuid-abc";
const SHARE_TOKEN = "public-share-token-123";
const MOCK_DECK = {
  id: DECK_ID,
  title: "Test Deck",
  slides: [{ title: "Slide One", bullets: ["Point A"] }],
  theme: "default",
};

function makeRequest(id = DECK_ID, token?: string) {
  const url = token
    ? `http://localhost/api/decks/${id}/export?token=${token}`
    : `http://localhost/api/decks/${id}/export`;
  return new NextRequest(url, { method: "GET" });
}

function mockDeckFound(deck = MOCK_DECK) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([deck]),
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
}

describe("GET /api/decks/[id]/export", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 401 when no session and no token", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeRequest(), { params: { id: DECK_ID } });
    expect(res.status).toBe(401);
  });

  it("returns 404 when authenticated but deck not found (wrong owner)", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockDeckNotFound();
    const res = await GET(makeRequest(), { params: { id: DECK_ID } });
    expect(res.status).toBe(404);
  });

  it("returns PDF for owner (AC1)", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockDeckFound();

    const res = await GET(makeRequest(), { params: { id: DECK_ID } });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toMatch(/attachment/);
  });

  it("returns PDF with shareToken and no session (AC2 — public export)", async () => {
    mockGetSession.mockResolvedValue(null);
    // First select (by owner) returns nothing; second (by token) returns deck
    const chain1 = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([MOCK_DECK]),
    };
    mockDb.select = vi.fn().mockReturnValue(chain1);

    const res = await GET(makeRequest(DECK_ID, SHARE_TOKEN), { params: { id: DECK_ID } });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
  });

  it("returns 404 when shareToken provided but deck not found", async () => {
    mockGetSession.mockResolvedValue(null);
    mockDeckNotFound();

    const res = await GET(makeRequest(DECK_ID, "bad-token"), { params: { id: DECK_ID } });
    expect(res.status).toBe(404);
  });
});
