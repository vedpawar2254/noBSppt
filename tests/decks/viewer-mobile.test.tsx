// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DeckViewer from "@/components/decks/DeckViewer";
import type { SlideObject } from "@/lib/db/schema";

const SLIDES: SlideObject[] = [
  { title: "Introduction", bullets: ["First point here"] },
  { title: "Main Content", bullets: ["Second point here"] },
  { title: "Conclusion", bullets: ["Final point here"] },
];

function renderViewer() {
  const result = render(<DeckViewer slides={SLIDES} deckTitle="Mobile Test Deck" />);
  // containerRef is attached to the root div (first child of render container)
  const viewer = result.container.firstElementChild as HTMLElement;
  return { ...result, viewer };
}

/** Simulate a horizontal swipe on the viewer element */
function swipe(el: HTMLElement, startX: number, endX: number) {
  fireEvent.touchStart(el, { touches: [{ clientX: startX, clientY: 200 }] });
  fireEvent.touchEnd(el, { changedTouches: [{ clientX: endX, clientY: 200 }] });
}

describe("DeckViewer — mobile responsive (Story 3.3)", () => {
  afterEach(() => {});

  // AC3: swipe left → next slide
  it("swipe left advances to next slide (AC3)", () => {
    const { viewer } = renderViewer();
    expect(screen.getByText("Introduction")).toBeInTheDocument();

    swipe(viewer, 300, 100); // diff = 200 > SWIPE_THRESHOLD (50) → next

    expect(screen.getByText("Main Content")).toBeInTheDocument();
  });

  // AC3: swipe right → previous slide
  it("swipe right goes to previous slide (AC3)", () => {
    const { viewer } = renderViewer();
    // advance first
    swipe(viewer, 300, 100);
    expect(screen.getByText("Main Content")).toBeInTheDocument();

    swipe(viewer, 100, 300); // diff = -200 < -SWIPE_THRESHOLD (50) → prev
    expect(screen.getByText("Introduction")).toBeInTheDocument();
  });

  // AC3: short swipe below threshold → no change
  it("short swipe below threshold does not change slide (AC3)", () => {
    const { viewer } = renderViewer();
    swipe(viewer, 200, 175); // diff = 25 < SWIPE_THRESHOLD (50) → no change
    expect(screen.getByText("Introduction")).toBeInTheDocument();
  });

  // AC3: swipe left on last slide does not go past end
  it("swipe left on last slide does not exceed bounds (AC3)", () => {
    const { viewer } = renderViewer();
    swipe(viewer, 300, 100); // → slide 2
    swipe(viewer, 300, 100); // → slide 3
    swipe(viewer, 300, 100); // → still slide 3 (clamped)
    expect(screen.getByText("Conclusion")).toBeInTheDocument();
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
  });

  // AC3: swipe right on first slide does not go below 0
  it("swipe right on first slide does not underflow (AC3)", () => {
    const { viewer } = renderViewer();
    swipe(viewer, 100, 300); // → still slide 1
    expect(screen.getByText("Introduction")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  // AC1: no horizontal overflow class on root container
  it("root container has overflow-x-hidden to prevent horizontal scroll (AC1)", () => {
    const { viewer } = renderViewer();
    expect(viewer.className).toContain("overflow-x-hidden");
  });

  // AC1: slide title has break-words to prevent long-title overflow on 375px
  it("slide title element has break-words class (AC1)", () => {
    renderViewer();
    // The h2 element renders the slide title
    const title = screen.getByRole("heading", { level: 2 });
    expect(title.className).toContain("break-words");
  });

  // AC3: nav buttons meet 44×44px touch target requirement
  it("navigation buttons have min-w and min-h for 44px touch targets (AC3)", () => {
    renderViewer();
    const prevBtn = screen.getByLabelText("Previous slide");
    const nextBtn = screen.getByLabelText("Next slide");
    expect(prevBtn.className).toContain("min-w-[44px]");
    expect(prevBtn.className).toContain("min-h-[44px]");
    expect(nextBtn.className).toContain("min-w-[44px]");
    expect(nextBtn.className).toContain("min-h-[44px]");
  });
});
