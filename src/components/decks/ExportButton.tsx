"use client";

import { useState } from "react";

interface ExportButtonProps {
  deckId: string;
  /** Pass shareToken when used in public viewer — no session cookie in that context */
  shareToken?: string | null;
}

export default function ExportButton({ deckId, shareToken }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setError(null);

    const url = shareToken
      ? `/api/decks/${deckId}/export?token=${shareToken}`
      : `/api/decks/${deckId}/export`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        setError("Export failed. Please try again.");
        return;
      }

      // Trigger browser download
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = "deck.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-500">{error}</span>}
      <button
        onClick={handleExport}
        disabled={loading}
        className="text-sm px-3 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Export deck as PDF"
      >
        {loading ? "Exporting…" : "Export PDF"}
      </button>
    </div>
  );
}
