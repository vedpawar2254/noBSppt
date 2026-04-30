import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock("@/lib/decks/engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/decks/engine")>();
  return { ...actual, generateDeck: vi.fn() };
});

import { POST } from "@/app/api/decks/generate/route";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { generateDeck } from "@/lib/decks/engine";
import { FREE_DECK_LIMIT } from "@/lib/decks/validation";

const mockGetSession = vi.mocked(getSession);
const mockDb = vi.mocked(db);
const mockGenerateDeck = vi.mocked(generateDeck);

const SESSION = { userId: "user-uuid", email: "user@example.com" };
const MOCK_RESULT = {
  slides: [{ title: "Slide", bullets: ["One point"] }],
  title: "Test Deck",
  latencyMs: 3000,
};

function makeReq(content = "some valid content") {
  return new NextRequest("http://localhost/api/decks/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "text", content }),
  });
}

function mockUser(deckCount: number, subscriptionStatus: "free" | "paid") {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ deckCount, subscriptionStatus }]),
  };
  mockDb.select = vi.fn().mockReturnValue(chain);
}

function mockSuccessfulTransaction() {
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
  const txUpdate = vi.fn().mockReturnValue({ set: updateSet });

  const insertReturning = vi.fn().mockResolvedValue([{ id: "deck-uuid" }]);
  const insertValues = vi.fn().mockReturnValue({ returning: insertReturning });
  const txInsert = vi.fn().mockReturnValue({ values: insertValues });

  mockDb.transaction = vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
    await fn({ insert: txInsert, update: txUpdate });
  });

  return { txUpdate, updateSet, updateWhere };
}

describe("Paywall enforcement — AC1, AC2, AC4 (Story 4.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION);
  });

  // AC2: exact boundary — deckCount === FREE_DECK_LIMIT triggers block
  it("blocks free user when deck_count equals FREE_DECK_LIMIT (AC2)", async () => {
    mockUser(FREE_DECK_LIMIT, "free");

    const res = await POST(makeReq());

    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.code).toBe("PAYWALL");
    expect(body.error).toMatch(/upgrade/i);
  });

  // AC2: one over limit also blocked
  it("blocks free user when deck_count exceeds FREE_DECK_LIMIT (AC2)", async () => {
    mockUser(FREE_DECK_LIMIT + 1, "free");

    const res = await POST(makeReq());

    expect(res.status).toBe(402);
  });

  // AC2: one under limit passes through
  it("does not block free user when deck_count is one below FREE_DECK_LIMIT (AC2)", async () => {
    mockUser(FREE_DECK_LIMIT - 1, "free");
    mockGenerateDeck.mockResolvedValue(MOCK_RESULT);
    mockSuccessfulTransaction();

    const res = await POST(makeReq());

    expect(res.status).toBe(201);
  });

  // AC4: paid user with deck_count at limit bypasses paywall
  it("does not block paid user at limit (AC4)", async () => {
    mockUser(FREE_DECK_LIMIT, "paid");
    mockGenerateDeck.mockResolvedValue(MOCK_RESULT);
    mockSuccessfulTransaction();

    const res = await POST(makeReq());

    expect(res.status).toBe(201);
  });

  // AC4: paid user well over limit also bypasses
  it("does not block paid user with very high deck_count (AC4)", async () => {
    mockUser(999, "paid");
    mockGenerateDeck.mockResolvedValue(MOCK_RESULT);
    mockSuccessfulTransaction();

    const res = await POST(makeReq());

    expect(res.status).toBe(201);
  });

  // AC1: deck_count increment runs in same transaction as deck insert
  it("increments deck_count atomically after successful generation (AC1)", async () => {
    mockUser(1, "free");
    mockGenerateDeck.mockResolvedValue(MOCK_RESULT);
    const { txUpdate } = mockSuccessfulTransaction();

    const res = await POST(makeReq());

    expect(res.status).toBe(201);
    // update() called once inside the transaction for the deck_count increment
    expect(txUpdate).toHaveBeenCalledTimes(1);
  });

  // AC1: deck_count NOT incremented if AI generation fails (no transaction reached)
  it("does not increment deck_count when AI generation fails (AC1)", async () => {
    mockUser(1, "free");
    mockGenerateDeck.mockRejectedValue(new Error("AI timeout"));

    const res = await POST(makeReq());

    expect(res.status).toBe(502);
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  // AC1: deck_count NOT incremented if DB transaction fails
  it("does not increment deck_count when DB transaction fails (AC1 atomicity)", async () => {
    mockUser(1, "free");
    mockGenerateDeck.mockResolvedValue(MOCK_RESULT);
    mockDb.transaction = vi.fn().mockRejectedValue(new Error("DB write failed"));

    const res = await POST(makeReq());

    expect(res.status).toBe(500);
    // transaction attempted but rolled back — no partial increment
    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
  });
});
