import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: { select: vi.fn(), update: vi.fn() },
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

import { POST } from "@/app/api/decks/[id]/share/route";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

const mockDb = vi.mocked(db);
const mockGetSession = vi.mocked(getSession);

const SESSION = { userId: "owner-uuid", email: "owner@example.com" };
const DECK_ID = "deck-uuid-abc";
const EXISTING_TOKEN = "existing-share-token-uuid";

function makeRequest(id = DECK_ID) {
  return new NextRequest(`http://localhost/api/decks/${id}/share`, {
    method: "POST",
  });
}

function mockDeckFound(shareToken: string | null = null) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ id: DECK_ID, shareToken }]),
  };
  mockDb.select = vi.fn().mockReturnValue(chain);
  return chain;
}

function mockDeckNotFound() {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  };
  mockDb.select = vi.fn().mockReturnValue(chain);
}

function mockUpdateChain() {
  const chain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  };
  mockDb.update = vi.fn().mockReturnValue(chain);
  return chain;
}

describe("POST /api/decks/[id]/share", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(makeRequest(), { params: { id: DECK_ID } });
    expect(res.status).toBe(401);
  });

  it("returns 404 when deck not found or wrong owner", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockDeckNotFound();
    const res = await POST(makeRequest(), { params: { id: DECK_ID } });
    expect(res.status).toBe(404);
  });

  it("returns 200 with new shareToken when deck has none", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockDeckFound(null);
    mockUpdateChain();

    const res = await POST(makeRequest(), { params: { id: DECK_ID } });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(typeof body.shareToken).toBe("string");
    expect(body.shareToken.length).toBeGreaterThan(0);
  });

  it("calls db.update to persist new shareToken", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockDeckFound(null);
    const updateChain = mockUpdateChain();

    await POST(makeRequest(), { params: { id: DECK_ID } });

    expect(mockDb.update).toHaveBeenCalled();
    expect(updateChain.set).toHaveBeenCalled();
  });

  it("returns 200 with existing shareToken and skips update (idempotent)", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockDeckFound(EXISTING_TOKEN);

    const res = await POST(makeRequest(), { params: { id: DECK_ID } });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.shareToken).toBe(EXISTING_TOKEN);
    // Should NOT call update when token already exists
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});
