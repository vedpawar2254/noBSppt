// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DeckViewer from "@/components/decks/DeckViewer";
import type { SlideObject } from "@/lib/db/schema";

const SLIDES: SlideObject[] = [
  { title: "Slide One", bullets: ["Point A", "Point B"] },
  { title: "Slide Two", bullets: ["Point C"] },
  { title: "Slide Three", bullets: [] },
];

function renderViewer(
  slides = SLIDES,
  deckTitle = "Test Deck",
  headerActions?: React.ReactNode
) {
  return render(
    <DeckViewer slides={slides} deckTitle={deckTitle} headerActions={headerActions} />
  );
}

describe("DeckViewer", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("renders first slide title and bullets on mount", () => {
    renderViewer();
    expect(screen.getByText("Slide One")).toBeInTheDocument();
    expect(screen.getByText("Point A")).toBeInTheDocument();
    expect(screen.getByText("Point B")).toBeInTheDocument();
  });

  it("renders deck title in header", () => {
    renderViewer();
    expect(screen.getByText("Test Deck")).toBeInTheDocument();
  });

  it("shows slide counter as '1 / 3'", () => {
    renderViewer();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("Prev button disabled on first slide", () => {
    renderViewer();
    expect(screen.getByLabelText("Previous slide")).toBeDisabled();
  });

  it("Next button enabled on first slide", () => {
    renderViewer();
    expect(screen.getByLabelText("Next slide")).not.toBeDisabled();
  });

  it("clicking Next advances to slide 2", () => {
    renderViewer();
    fireEvent.click(screen.getByLabelText("Next slide"));
    expect(screen.getByText("Slide Two")).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("clicking Prev goes back from slide 2 to slide 1", () => {
    renderViewer();
    fireEvent.click(screen.getByLabelText("Next slide"));
    fireEvent.click(screen.getByLabelText("Previous slide"));
    expect(screen.getByText("Slide One")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("Next button disabled on last slide", () => {
    renderViewer();
    fireEvent.click(screen.getByLabelText("Next slide"));
    fireEvent.click(screen.getByLabelText("Next slide"));
    expect(screen.getByLabelText("Next slide")).toBeDisabled();
  });

  it("ArrowRight key advances slide (AC2)", () => {
    renderViewer();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("Slide Two")).toBeInTheDocument();
  });

  it("ArrowLeft key goes back (AC2)", () => {
    renderViewer();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText("Slide One")).toBeInTheDocument();
  });

  it("ArrowDown advances slide", () => {
    renderViewer();
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(screen.getByText("Slide Two")).toBeInTheDocument();
  });

  it("ArrowUp goes back", () => {
    renderViewer();
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "ArrowUp" });
    expect(screen.getByText("Slide One")).toBeInTheDocument();
  });

  it("renders headerActions when provided", () => {
    renderViewer(SLIDES, "Test Deck", <a href="/dashboard">← Dashboard</a>);
    expect(screen.getByText("← Dashboard")).toBeInTheDocument();
  });

  it("renders empty state when slides array is empty", () => {
    renderViewer([]);
    expect(screen.getByText("No slides to display.")).toBeInTheDocument();
  });

  it("slide with no bullets renders title without list", () => {
    renderViewer();
    // navigate to slide 3 (no bullets)
    fireEvent.click(screen.getByLabelText("Next slide"));
    fireEvent.click(screen.getByLabelText("Next slide"));
    expect(screen.getByText("Slide Three")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
