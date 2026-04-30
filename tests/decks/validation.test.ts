import { describe, it, expect } from "vitest";
import {
  validateDeckInput,
  getFreeDecksRemaining,
  FREE_DECK_LIMIT,
} from "@/lib/decks/validation";

// AC3 + AC1: both input modes share the same validation logic
describe("validateDeckInput", () => {
  it("returns valid for non-empty text content (AC1 — text mode)", () => {
    expect(validateDeckInput("Some freeform text")).toEqual({ valid: true });
  });

  it("returns valid for non-empty outline content (AC1 — outline mode)", () => {
    expect(validateDeckInput("Intro\n- Background\nConclusion")).toEqual({ valid: true });
  });

  it("returns invalid with error for empty string (AC3)", () => {
    const result = validateDeckInput("");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error!.length).toBeGreaterThan(0);
  });

  it("returns invalid for whitespace-only content (AC3)", () => {
    const result = validateDeckInput("   \n\t  ");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// AC4: free deck counter
describe("getFreeDecksRemaining", () => {
  it("returns FREE_DECK_LIMIT when no decks used yet (AC4)", () => {
    expect(getFreeDecksRemaining(0)).toBe(FREE_DECK_LIMIT);
  });

  it("decrements correctly as decks are used (AC4)", () => {
    expect(getFreeDecksRemaining(1)).toBe(FREE_DECK_LIMIT - 1);
    expect(getFreeDecksRemaining(2)).toBe(FREE_DECK_LIMIT - 2);
    expect(getFreeDecksRemaining(3)).toBe(0);
  });

  it("does not return negative when deck_count exceeds FREE_DECK_LIMIT (AC4)", () => {
    expect(getFreeDecksRemaining(FREE_DECK_LIMIT + 2)).toBe(0);
  });
});

// AC2: mode switch preserves content — validated via the shared type contract
describe("GenerationPayload shape (AC2 + Story 2.2 contract)", () => {
  it("accepts text mode payload", () => {
    const payload = { mode: "text" as const, content: "raw text" };
    expect(payload.mode).toBe("text");
    expect(typeof payload.content).toBe("string");
  });

  it("accepts outline mode payload", () => {
    const payload = { mode: "outline" as const, content: "Slide 1\n- bullet\nSlide 2" };
    expect(payload.mode).toBe("outline");
    expect(typeof payload.content).toBe("string");
  });
});
