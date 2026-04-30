"use client";
import { useEffect } from "react";

interface Props {
  deckId: string;
}

/**
 * Story 6.4: Fire-and-forget view event on public deck page load.
 * Renders nothing — purely a side-effect component.
 * The POST handler sets/reads the nobsppt_vid httpOnly cookie and handles deduplication.
 */
export default function DeckViewTracker({ deckId }: Props) {
  useEffect(() => {
    fetch(`/api/decks/${deckId}/view`, { method: "POST" }).catch(() => {});
  }, [deckId]);

  return null;
}
