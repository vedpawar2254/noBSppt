/**
 * Restraint Engine — the core product differentiator.
 *
 * Two-layer restraint:
 *   Layer 1 — Hard Constraints (system prompt):   max slides, bullets, words
 *   Layer 2 — Signal Scoring   (system prompt):   cut low-density content
 *
 * AI provider: Anthropic
 * Model:       claude-haiku-4-5-20251001
 *              — fastest inference, sufficient quality for structured JSON, stays well inside 15s target
 *
 * Safety net:  Constraints are enforced post-hoc too — if the model goes over,
 *              truncation keeps the product promise without failing the request.
 */

import type { InputMode } from "@/lib/decks/validation";
import type { SlideObject } from "@/lib/db/schema";
import { anthropic } from "@/lib/ai/client";

// ────────────────────────────────────────────────────────────────────────────
// Constants — single source of truth for all constraint values
// ────────────────────────────────────────────────────────────────────────────
export const CONSTRAINTS = {
  MAX_SLIDES: 10,
  MAX_BULLETS_PER_SLIDE: 3,
  MAX_WORDS_PER_BULLET: 10,
  MODEL: "claude-haiku-4-5-20251001",
  THEME: "default",
} as const;

// ────────────────────────────────────────────────────────────────────────────
// System prompt — Layer 1 (hard constraints) + Layer 2 (signal scoring)
// ────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a presentation distiller. Your only job is subtraction.

HARD CONSTRAINTS — non-negotiable:
- Maximum ${CONSTRAINTS.MAX_SLIDES} slides per deck
- Maximum ${CONSTRAINTS.MAX_BULLETS_PER_SLIDE} bullets per slide
- Maximum ${CONSTRAINTS.MAX_WORDS_PER_BULLET} words per bullet
- Each bullet carries exactly one distinct, non-redundant point
- The deck title (first slide heading) must capture the core argument in ≤6 words

SIGNAL SCORING — apply before outputting:
Before writing each bullet, score it 1–3 for information density:
  3 = essential: audience cannot understand the point without this
  2 = useful: adds value, not obvious from context
  1 = filler: generic, obvious, redundant, or padded
Remove all bullets scoring 1. If fewer than 2 bullets remain on a slide, merge the slide into an adjacent one or cut the slide entirely.

TONE:
- Terse and professional
- No filler openers: no "In conclusion", "It is important to note", "As we can see", "Key takeaway:"
- Bullet = one complete thought, not a fragment, not a sentence
- Avoid nominalisations: prefer "we reduced costs" over "cost reduction was achieved"

OUTPUT FORMAT:
Return ONLY a valid JSON array — no markdown fences, no explanation, no preamble, nothing outside the array.
[
  { "title": "Short Declarative Title", "bullets": ["Bullet one ≤10 words", "Bullet two"] },
  ...
]`;

// ────────────────────────────────────────────────────────────────────────────
// Prompt builder — wraps content with mode-specific framing
// ────────────────────────────────────────────────────────────────────────────
export function buildUserPrompt(mode: InputMode, content: string): string {
  if (mode === "outline") {
    return `[OUTLINE INPUT]
The following is a structured outline. Treat top-level lines as potential slide topics.
Indented or dash-prefixed lines are supporting points for the slide above them.
Apply signal scoring — cut redundant or low-density items.

${content.trim()}`;
  }

  return `[FREE TEXT INPUT]
Distil the following content into a signal-dense slide deck.
Extract the core points, discard padding, apply signal scoring.

${content.trim()}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Response parser — extracts and validates the JSON array from AI output
// ────────────────────────────────────────────────────────────────────────────
export function parseAIResponse(raw: string): SlideObject[] {
  const trimmed = raw.trim();

  // Strip markdown fences if the model wraps despite instructions
  const unwrapped = trimmed.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(unwrapped);
  } catch {
    throw new Error(`AI returned non-JSON output: ${unwrapped.slice(0, 200)}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`AI response is not an array: ${JSON.stringify(parsed).slice(0, 200)}`);
  }

  // Validate and coerce each slide
  return parsed.map((item: unknown, i: number) => {
    if (typeof item !== "object" || item === null) {
      throw new Error(`Slide ${i} is not an object`);
    }
    const s = item as Record<string, unknown>;
    if (typeof s.title !== "string" || !Array.isArray(s.bullets)) {
      throw new Error(`Slide ${i} missing title or bullets`);
    }
    return { title: s.title, bullets: s.bullets.map(String) };
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Constraint enforcer — safety net post-processing
// Applied after AI output to guarantee product promises even on edge cases.
// ────────────────────────────────────────────────────────────────────────────
export function enforceConstraints(slides: SlideObject[]): SlideObject[] {
  // Hard cap on slide count
  const capped = slides.slice(0, CONSTRAINTS.MAX_SLIDES);

  return capped.map((slide) => ({
    title: slide.title.trim(),
    bullets: slide.bullets
      // Hard cap on bullets per slide
      .slice(0, CONSTRAINTS.MAX_BULLETS_PER_SLIDE)
      // Hard cap on words per bullet
      .map((b) => {
        const words = b.trim().split(/\s+/);
        return words.slice(0, CONSTRAINTS.MAX_WORDS_PER_BULLET).join(" ");
      })
      // Remove empty bullets
      .filter((b) => b.length > 0),
  }));
}

// ────────────────────────────────────────────────────────────────────────────
// Derive a deck title from the first slide
// ────────────────────────────────────────────────────────────────────────────
export function deriveDeckTitle(slides: SlideObject[]): string {
  return slides[0]?.title ?? "Untitled Deck";
}

// ────────────────────────────────────────────────────────────────────────────
// Main entry point — generate slides from user input
// ────────────────────────────────────────────────────────────────────────────
export interface GenerationResult {
  slides: SlideObject[];
  title: string;
  latencyMs: number;
}

export async function generateDeck(
  mode: InputMode,
  content: string
): Promise<GenerationResult> {
  const t0 = Date.now();

  const userPrompt = buildUserPrompt(mode, content);

  const message = await anthropic.messages.create({
    model: CONSTRAINTS.MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const latencyMs = Date.now() - t0;

  // Extract text content from the response
  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI returned no text content");
  }

  const rawSlides = parseAIResponse(textBlock.text);
  const slides = enforceConstraints(rawSlides);

  if (slides.length === 0) {
    throw new Error("AI returned zero slides after constraint enforcement");
  }

  const title = deriveDeckTitle(slides);

  return { slides, title, latencyMs };
}
