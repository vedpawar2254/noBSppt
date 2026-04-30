"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  type InputMode,
  type GenerationPayload,
  validateDeckInput,
} from "@/lib/decks/validation";
import PaywallModal from "@/components/decks/PaywallModal";

export default function DeckInputForm() {
  const router = useRouter();
  const [mode, setMode] = useState<InputMode>("text");
  const [textContent, setTextContent] = useState("");
  const [outlineContent, setOutlineContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const activeContent = mode === "text" ? textContent : outlineContent;

  function handleModeSwitch(newMode: InputMode) {
    setError(null);
    setMode(newMode);
    // Content in both modes is preserved in separate state (AC2 from Story 2.1)
  }

  async function handleGenerate() {
    const validation = validateDeckInput(activeContent);
    if (!validation.valid) {
      setError(validation.error ?? "Please enter some content before generating.");
      return;
    }

    setError(null);
    setLoading(true);

    const payload: GenerationPayload = {
      mode,
      content: activeContent,
    };

    try {
      const res = await fetch("/api/decks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        // Redirect to the deck viewer (Story 2.3 creates this route)
        router.push(`/deck/${data.deckId}`);
        return;
      }

      if (res.status === 402) {
        // Story 4.1: show paywall modal — input remains in state (AC2 input preservation)
        setShowPaywall(true);
      } else {
        // NFR11: clear error. NFR12: input preserved in state — user can retry immediately.
        setError(data.error ?? "Generation failed. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      // Loading state cleared regardless — input remains intact for retry (NFR12)
      setLoading(false);
    }
  }

  return (
    <>
      {/* Story 4.1: paywall modal — shown when free limit reached (AC2, AC3) */}
      {showPaywall && <PaywallModal onDismiss={() => setShowPaywall(false)} />}
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-1 border border-gray-200 rounded-md p-1 w-fit" role="group" aria-label="Input mode">
        <button
          type="button"
          onClick={() => handleModeSwitch("text")}
          aria-pressed={mode === "text"}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            mode === "text" ? "bg-black text-white" : "text-gray-600 hover:text-black"
          }`}
        >
          Free Text
        </button>
        <button
          type="button"
          onClick={() => handleModeSwitch("outline")}
          aria-pressed={mode === "outline"}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            mode === "outline" ? "bg-black text-white" : "text-gray-600 hover:text-black"
          }`}
        >
          Outline
        </button>
      </div>

      {/* Text mode input */}
      {mode === "text" && (
        <div>
          <label htmlFor="text-input" className="block text-sm font-medium text-gray-700 mb-1">
            Paste or type your content
          </label>
          <textarea
            id="text-input"
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            disabled={loading}
            rows={12}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black resize-y disabled:opacity-60 disabled:cursor-not-allowed"
            placeholder="Paste your notes, article, or any text here..."
          />
        </div>
      )}

      {/* Outline mode input */}
      {mode === "outline" && (
        <div>
          <label htmlFor="outline-input" className="block text-sm font-medium text-gray-700 mb-1">
            Enter your outline (one item per line)
          </label>
          <textarea
            id="outline-input"
            value={outlineContent}
            onChange={(e) => setOutlineContent(e.target.value)}
            disabled={loading}
            rows={12}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black resize-y font-mono disabled:opacity-60 disabled:cursor-not-allowed"
            placeholder={"Introduction\n- Background\n- Problem statement\nMain points\n- Point 1\n- Point 2\nConclusion"}
          />
          <p className="mt-1 text-xs text-gray-500">
            Use dashes or indentation to indicate hierarchy.
          </p>
        </div>
      )}

      {/* AC5 — NFR11: clear error displayed; NFR12: input intact for retry */}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {/* AC1 — loading state disables input during generation */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="w-full py-2 px-4 bg-black text-white font-medium rounded-md text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Generating…" : "Generate Deck"}
      </button>

      {/* AC1 — generation progress hint */}
      {loading && (
        <p className="text-xs text-center text-gray-400">
          Distilling your content — usually under 15 seconds.
        </p>
      )}
    </div>
    </>
  );
}
