"use client";

import { useState } from "react";
import {
  type InputMode,
  type GenerationPayload,
  validateDeckInput,
} from "@/lib/decks/validation";

export default function DeckInputForm() {
  const [mode, setMode] = useState<InputMode>("text");
  const [textContent, setTextContent] = useState("");
  const [outlineContent, setOutlineContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeContent = mode === "text" ? textContent : outlineContent;

  function handleModeSwitch(newMode: InputMode) {
    setError(null);
    setMode(newMode);
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
      // TODO: Story 2.2 — replace stub with POST /api/decks/generate
      console.log("Generation payload:", payload);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
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
            rows={12}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black resize-y"
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
            rows={12}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black resize-y font-mono"
            placeholder={"Introduction\n- Background\n- Problem statement\nMain points\n- Point 1\n- Point 2\nConclusion"}
          />
          <p className="mt-1 text-xs text-gray-500">
            Use dashes or indentation to indicate hierarchy.
          </p>
        </div>
      )}

      {/* Validation error */}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Generate */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="w-full py-2 px-4 bg-black text-white font-medium rounded-md text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Generating..." : "Generate Deck"}
      </button>
    </div>
  );
}
