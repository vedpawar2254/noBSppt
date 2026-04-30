import { describe, it, expect } from "vitest";
import {
  buildUserPrompt,
  parseAIResponse,
  enforceConstraints,
  deriveDeckTitle,
  CONSTRAINTS,
} from "@/lib/decks/engine";

// ──────────────────────────────────────────────────────────────────────────
// buildUserPrompt
// ──────────────────────────────────────────────────────────────────────────
describe("buildUserPrompt", () => {
  it("wraps text mode content with FREE TEXT framing", () => {
    const p = buildUserPrompt("text", "My notes here");
    expect(p).toContain("[FREE TEXT INPUT]");
    expect(p).toContain("My notes here");
  });

  it("wraps outline mode content with OUTLINE framing", () => {
    const p = buildUserPrompt("outline", "Intro\n- Point 1");
    expect(p).toContain("[OUTLINE INPUT]");
    expect(p).toContain("Intro\n- Point 1");
  });

  it("trims leading/trailing whitespace from content", () => {
    const p = buildUserPrompt("text", "  spaced content  ");
    expect(p).toContain("spaced content");
    expect(p).not.toMatch(/  spaced content  /); // whitespace stripped
  });
});

// ──────────────────────────────────────────────────────────────────────────
// parseAIResponse
// ──────────────────────────────────────────────────────────────────────────
describe("parseAIResponse", () => {
  const validJSON = JSON.stringify([
    { title: "Slide One", bullets: ["Point A", "Point B"] },
    { title: "Slide Two", bullets: ["Point C"] },
  ]);

  it("parses valid JSON array correctly", () => {
    const result = parseAIResponse(validJSON);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("Slide One");
    expect(result[0].bullets).toEqual(["Point A", "Point B"]);
  });

  it("strips markdown code fences (```json ... ```)", () => {
    const fenced = `\`\`\`json\n${validJSON}\n\`\`\``;
    const result = parseAIResponse(fenced);
    expect(result).toHaveLength(2);
  });

  it("strips bare code fences (``` ... ```)", () => {
    const fenced = `\`\`\`\n${validJSON}\n\`\`\``;
    const result = parseAIResponse(fenced);
    expect(result).toHaveLength(2);
  });

  it("throws on non-JSON output", () => {
    expect(() => parseAIResponse("Here is your deck...")).toThrow(/non-JSON/);
  });

  it("throws when response is a JSON object instead of array", () => {
    expect(() => parseAIResponse('{"title":"x"}')).toThrow(/not an array/);
  });

  it("throws when a slide is missing bullets", () => {
    const bad = JSON.stringify([{ title: "Slide" }]);
    expect(() => parseAIResponse(bad)).toThrow(/missing title or bullets/);
  });

  it("coerces bullet values to strings", () => {
    const withNums = JSON.stringify([{ title: "S", bullets: [42, "text"] }]);
    const result = parseAIResponse(withNums);
    expect(result[0].bullets[0]).toBe("42");
  });
});

// ──────────────────────────────────────────────────────────────────────────
// enforceConstraints — safety net for hard limits (AC2)
// ──────────────────────────────────────────────────────────────────────────
describe("enforceConstraints", () => {
  it(`caps slides at MAX_SLIDES (${CONSTRAINTS.MAX_SLIDES})`, () => {
    const tooMany = Array.from({ length: 15 }, (_, i) => ({
      title: `Slide ${i + 1}`,
      bullets: ["One point only"],
    }));
    expect(enforceConstraints(tooMany)).toHaveLength(CONSTRAINTS.MAX_SLIDES);
  });

  it(`caps bullets per slide at MAX_BULLETS_PER_SLIDE (${CONSTRAINTS.MAX_BULLETS_PER_SLIDE})`, () => {
    const slides = [{ title: "T", bullets: ["a", "b", "c", "d", "e"] }];
    const result = enforceConstraints(slides);
    expect(result[0].bullets).toHaveLength(CONSTRAINTS.MAX_BULLETS_PER_SLIDE);
  });

  it(`truncates bullet to MAX_WORDS_PER_BULLET (${CONSTRAINTS.MAX_WORDS_PER_BULLET}) words`, () => {
    const longBullet = "one two three four five six seven eight nine ten eleven twelve";
    const slides = [{ title: "T", bullets: [longBullet] }];
    const result = enforceConstraints(slides);
    const wordCount = result[0].bullets[0].split(" ").length;
    expect(wordCount).toBeLessThanOrEqual(CONSTRAINTS.MAX_WORDS_PER_BULLET);
  });

  it("removes empty bullets", () => {
    const slides = [{ title: "T", bullets: ["", "  ", "valid point here"] }];
    const result = enforceConstraints(slides);
    expect(result[0].bullets).toHaveLength(1);
    expect(result[0].bullets[0]).toBe("valid point here");
  });

  it("trims whitespace from titles", () => {
    const slides = [{ title: "  Padded Title  ", bullets: ["point"] }];
    expect(enforceConstraints(slides)[0].title).toBe("Padded Title");
  });

  it("passes through compliant slides unchanged (structure preserved)", () => {
    const slides = [
      { title: "Clean Slide", bullets: ["Short point one", "Short point two"] },
    ];
    const result = enforceConstraints(slides);
    expect(result[0].title).toBe("Clean Slide");
    expect(result[0].bullets).toHaveLength(2);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// deriveDeckTitle
// ──────────────────────────────────────────────────────────────────────────
describe("deriveDeckTitle", () => {
  it("returns title of the first slide", () => {
    const slides = [
      { title: "Main Topic", bullets: [] },
      { title: "Second Slide", bullets: [] },
    ];
    expect(deriveDeckTitle(slides)).toBe("Main Topic");
  });

  it("returns fallback for empty slides array", () => {
    expect(deriveDeckTitle([])).toBe("Untitled Deck");
  });
});
