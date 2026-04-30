import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock all external dependencies before importing the route
vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    transaction: vi.fn(),
  },
}));

// Mock the engine so tests are fast and deterministic — engine unit tests are separate
vi.mock("@/lib/decks/engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/decks/engine")>();
  return {
    ...actual, // keep CONSTRAINTS, enforceConstraints etc.
    generateDeck: vi.fn(),
  };
});

import { POST } from "@/app/api/decks/generate/route";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { generateDeck } from "@/lib/decks/engine";

const mockGetSession = vi.mocked(getSession);
const mockDb = vi.mocked(db);
const mockGenerateDeck = vi.mocked(generateDeck);

const SESSION = { userId: "user-uuid", email: "user@example.com" };
const MOCK_SLIDES = [
  { title: "Core Argument", bullets: ["Point one here", "Point two here"] },
  { title: "Evidence", bullets: ["Data supports claim"] },
];
const MOCK_RESULT = { slides: MOCK_SLIDES, title: "Core Argument", latencyMs: 4200 };

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/decks/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockFreeUserUnderLimit(deckCount = 1) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ deckCount, subscriptionStatus: "free" }]),
  };
  mockDb.select = vi.fn().mockReturnValue(chain);
}

function mockFreeUserAtLimit() {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ deckCount: 3, subscriptionStatus: "free" }]),
  };
  mockDb.select = vi.fn().mockReturnValue(chain);
}

function mockPaidUser() {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ deckCount: 99, subscriptionStatus: "paid" }]),
  };
  mockDb.select = vi.fn().mockReturnValue(chain);
}

function mockSuccessfulTransaction() {
  mockDb.transaction = vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
    const tx = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "new-deck-uuid" }]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    };
    await fn(tx);
  });
}

describe("POST /api/decks/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Auth check
  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(makeRequest({ mode: "text", content: "some content" }));
    expect(res.status).toBe(401);
  });

  // Validation
  it("returns 422 for empty content", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await POST(makeRequest({ mode: "text", content: "" }));
    expect(res.status).toBe(422);
  });

  it("returns 422 for invalid mode", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await POST(makeRequest({ mode: "invalid", content: "some content" }));
    expect(res.status).toBe(422);
  });

  it("returns 400 for malformed JSON body", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const req = new NextRequest("http://localhost/api/decks/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // Paywall (AC3 — Epic 4 paywall foundation)
  it("returns 402 with PAYWALL code when free user is at limit", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockFreeUserAtLimit();

    const res = await POST(makeRequest({ mode: "text", content: "some notes" }));

    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.code).toBe("PAYWALL");
  });

  it("does not block paid users regardless of deck_count (AC paywall bypass)", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockPaidUser();
    mockGenerateDeck.mockResolvedValue(MOCK_RESULT);
    mockSuccessfulTransaction();

    const res = await POST(makeRequest({ mode: "text", content: "notes" }));
    expect(res.status).toBe(201);
  });

  // AC2 — happy path: generation, constraints, theme
  it("returns 201 with deckId, slides, theme on success (AC2, AC3)", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockFreeUserUnderLimit();
    mockGenerateDeck.mockResolvedValue(MOCK_RESULT);
    mockSuccessfulTransaction();

    const res = await POST(makeRequest({ mode: "text", content: "My presentation notes here" }));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.deckId).toBe("new-deck-uuid");
    expect(body.slides).toEqual(MOCK_SLIDES);
    expect(body.theme).toBe("default"); // AC3 — auto-theme applied
    expect(body.title).toBe("Core Argument");
  });

  it("passes mode and content to generateDeck", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockFreeUserUnderLimit();
    mockGenerateDeck.mockResolvedValue(MOCK_RESULT);
    mockSuccessfulTransaction();

    await POST(makeRequest({ mode: "outline", content: "Intro\n- Background" }));

    expect(mockGenerateDeck).toHaveBeenCalledWith("outline", "Intro\n- Background");
  });

  // AC5 — NFR11: error surfaced to client, not silent
  it("returns 502 with error message when AI generation fails (AC5 — NFR11)", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockFreeUserUnderLimit();
    mockGenerateDeck.mockRejectedValue(new Error("API timeout"));

    const res = await POST(makeRequest({ mode: "text", content: "notes" }));

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toMatch(/generation failed/i);
  });

  it("returns 500 when DB save fails after successful generation", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockFreeUserUnderLimit();
    mockGenerateDeck.mockResolvedValue(MOCK_RESULT);
    mockDb.transaction = vi.fn().mockRejectedValue(new Error("DB connection lost"));

    const res = await POST(makeRequest({ mode: "text", content: "notes" }));

    expect(res.status).toBe(500);
  });

  // NFR9 — UUID via DB (drizzle defaultRandom()) — covered by schema
  it("includes latencyMs in response for monitoring (AC4 — NFR1)", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockFreeUserUnderLimit();
    mockGenerateDeck.mockResolvedValue({ ...MOCK_RESULT, latencyMs: 8500 });
    mockSuccessfulTransaction();

    const res = await POST(makeRequest({ mode: "text", content: "notes" }));
    const body = await res.json();
    expect(body.latencyMs).toBe(8500);
  });
});
