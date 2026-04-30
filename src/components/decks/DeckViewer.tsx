"use client";

/**
 * DeckViewer — reusable in-browser slide viewer.
 *
 * Reuse contract (Stories 3.1 and 3.3 extend this):
 *   - Story 3.1 (public share viewer): import DeckViewer, pass actions={<ShareActions />}
 *   - Story 3.3 (mobile responsive):   this component is already responsive-first;
 *     extend THEME_STYLES["default"] or pass a new theme string if needed.
 *
 * Props interface is intentionally stable — do not break it in downstream stories.
 */

import { useState, useEffect, useCallback, useRef } from "react";

// Minimum horizontal swipe distance to trigger slide change (px)
const SWIPE_THRESHOLD = 50;
import type { SlideObject } from "@/lib/db/schema";

// ────────────────────────────────────────────────────────────────────────────
// Theme definitions — add entries here when new themes are introduced
// ────────────────────────────────────────────────────────────────────────────
export const THEME_STYLES: Record<
  string,
  {
    slide: string;
    title: string;
    bullet: string;
    bulletDot: string;
    nav: string;
    counter: string;
  }
> = {
  default: {
    slide: "bg-white",
    // AC1 (Story 3.3): 2xl on 375px prevents long titles from overflowing
    title: "text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight break-words",
    bullet: "text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed",
    bulletDot: "text-gray-300 mr-3 select-none shrink-0",
    // AC3 (Story 3.3): min 44×44px tap targets for touch devices
    nav: "text-gray-400 hover:text-gray-900 disabled:opacity-20 disabled:cursor-not-allowed transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center",
    counter: "text-sm text-gray-400 tabular-nums",
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Props interface — stable contract for Stories 3.1 and 3.3
// ────────────────────────────────────────────────────────────────────────────
export interface DeckViewerProps {
  /** Slide data from deck.slides (SlideObject[]) */
  slides: SlideObject[];
  /** Deck title shown in header */
  deckTitle: string;
  /** Theme name from deck.theme — default: "default" */
  theme?: string;
  /**
   * Optional action buttons rendered in the header bar.
   * Creator view injects a back-to-dashboard link.
   * Public view (Story 3.1) injects Share / Export PDF buttons.
   */
  headerActions?: React.ReactNode;
}

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────
export default function DeckViewer({
  slides,
  deckTitle,
  theme = "default",
  headerActions,
}: DeckViewerProps) {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const styles = THEME_STYLES[theme] ?? THEME_STYLES.default;
  const total = slides.length;
  const slide = slides[current];

  const goNext = useCallback(() => {
    setCurrent((i) => Math.min(i + 1, total - 1));
  }, [total]);

  const goPrev = useCallback(() => {
    setCurrent((i) => Math.max(i - 1, 0));
  }, []);

  // AC2: keyboard navigation — left/right arrows
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  // AC3 (Story 3.3): touch swipe navigation — swipe left = next, swipe right = prev
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let startX = 0;

    function onTouchStart(e: TouchEvent) {
      startX = e.touches[0].clientX;
    }

    function onTouchEnd(e: TouchEvent) {
      const diff = startX - e.changedTouches[0].clientX;
      if (diff > SWIPE_THRESHOLD) goNext();
      else if (diff < -SWIPE_THRESHOLD) goPrev();
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [goNext, goPrev]);

  if (!slide) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        No slides to display.
      </div>
    );
  }

  return (
    // AC1 (Story 3.3): overflow-x-hidden prevents horizontal scroll on any slide
    <div ref={containerRef} className="flex flex-col h-full min-h-0 overflow-x-hidden" aria-label="Deck viewer">
      {/* Header — title + injected actions */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 shrink-0">
        <h1 className="text-base font-semibold text-gray-900 truncate max-w-xs sm:max-w-md">
          {deckTitle}
        </h1>
        {headerActions && (
          <div className="flex items-center gap-3 shrink-0">{headerActions}</div>
        )}
      </div>

      {/* Slide area — fills remaining vertical space */}
      {/* AC3 (Story 3.3): touch-pan-y lets browser handle vertical scroll; we handle horizontal swipe */}
      <div
        className={`flex-1 flex flex-col justify-center px-6 sm:px-16 py-8 sm:py-16 touch-pan-y ${styles.slide}`}
        role="region"
        aria-label={`Slide ${current + 1} of ${total}`}
        aria-live="polite"
      >
        {/* Slide title */}
        <h2 className={`mb-6 sm:mb-8 ${styles.title}`}>{slide.title}</h2>

        {/* Bullets */}
        {slide.bullets.length > 0 && (
          <ul className="space-y-3 sm:space-y-4" role="list">
            {slide.bullets.map((bullet, i) => (
              <li key={i} className="flex items-start">
                <span className={styles.bulletDot} aria-hidden="true">
                  —
                </span>
                <span className={styles.bullet}>{bullet}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Navigation footer */}
      <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-4 border-t border-gray-100">
        {/* Prev */}
        <button
          onClick={goPrev}
          disabled={current === 0}
          className={styles.nav}
          aria-label="Previous slide"
        >
          ← Prev
        </button>

        {/* Slide counter — AC2: "Slide N of M" */}
        <span className={styles.counter}>
          {current + 1} / {total}
        </span>

        {/* Next */}
        <button
          onClick={goNext}
          disabled={current === total - 1}
          className={styles.nav}
          aria-label="Next slide"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
