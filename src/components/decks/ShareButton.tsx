"use client";

import { useState } from "react";

interface ShareButtonProps {
  deckId: string;
  initialShareToken?: string | null;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for browsers without Clipboard API
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

export default function ShareButton({ deckId, initialShareToken }: ShareButtonProps) {
  const [shareToken, setShareToken] = useState<string | null>(initialShareToken ?? null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleShare() {
    setError(null);

    let token = shareToken;

    if (!token) {
      setLoading(true);
      try {
        const res = await fetch(`/api/decks/${deckId}/share`, { method: "POST" });
        if (!res.ok) {
          setError("Failed to generate link.");
          return;
        }
        const data = await res.json();
        token = data.shareToken as string;
        setShareToken(token);
      } catch {
        setError("Network error.");
        return;
      } finally {
        setLoading(false);
      }
    }

    const url = `${window.location.origin}/s/${token}`;
    await copyText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-500">{error}</span>}
      <button
        onClick={handleShare}
        disabled={loading}
        className="text-sm px-3 py-1.5 bg-black text-white rounded hover:bg-gray-800 transition-colors disabled:opacity-50"
        aria-label="Share deck"
      >
        {loading ? "Generating…" : copied ? "Link copied!" : "Share"}
      </button>
    </div>
  );
}
