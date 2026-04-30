export const FREE_DECK_LIMIT = 3;

export type InputMode = "text" | "outline";

/**
 * Payload sent to POST /api/decks/generate (Story 2.2 must match this exactly).
 *
 * - mode: which input mode was active
 * - content: raw string from the active textarea
 *   - "text" mode: freeform prose / pasted notes
 *   - "outline" mode: newline-separated lines; hierarchy via leading dashes/spaces
 *     e.g. "Intro\n- Background\nMain\n- Point 1"
 *     Story 2.2 is responsible for parsing outline structure server-side.
 */
export interface GenerationPayload {
  mode: InputMode;
  content: string;
}

export interface DeckInputValidation {
  valid: boolean;
  error?: string;
}

export function validateDeckInput(content: string): DeckInputValidation {
  if (content.trim().length === 0) {
    return { valid: false, error: "Please enter some content before generating." };
  }
  return { valid: true };
}

export function getFreeDecksRemaining(deckCount: number): number {
  return Math.max(0, FREE_DECK_LIMIT - deckCount);
}
