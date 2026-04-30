"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export interface DeckSummary {
  id: string;
  title: string;
  createdAt: Date | string;
}

interface DeckListProps {
  decks: DeckSummary[];
}

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface DeckCardProps {
  deck: DeckSummary;
  onDeleted: (id: string) => void;
}

function DeckCard({ deck, onDeleted }: DeckCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/decks/${deck.id}`, { method: "DELETE" });
      if (res.ok) {
        onDeleted(deck.id);
      } else {
        setError("Failed to delete. Please try again.");
        setConfirming(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setConfirming(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        {/* AC4: clicking title opens the deck viewer (Story 2.3) */}
        <Link
          href={`/deck/${deck.id}`}
          className="font-medium text-gray-900 hover:text-black truncate block hover:underline"
        >
          {deck.title}
        </Link>
        <p className="text-xs text-gray-400 mt-1">{formatDate(deck.createdAt)}</p>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!confirming ? (
          /* AC3: delete button — shows confirmation before acting */
          <button
            onClick={() => setConfirming(true)}
            className="text-xs text-gray-400 hover:text-red-600 transition-colors"
            aria-label={`Delete deck: ${deck.title}`}
          >
            Delete
          </button>
        ) : (
          /* AC3: inline confirmation prompt */
          <span className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">Delete this deck?</span>
            <button
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className="text-gray-500 hover:text-gray-700 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

// AC2: empty state component
function EmptyState() {
  return (
    <div className="text-center py-16">
      <p className="text-gray-400 text-sm mb-4">No decks yet.</p>
      <Link
        href="/create"
        className="inline-block px-5 py-2 bg-black text-white text-sm font-medium rounded hover:bg-gray-800 transition-colors"
      >
        Create your first deck
      </Link>
    </div>
  );
}

export default function DeckList({ decks: initialDecks }: DeckListProps) {
  const router = useRouter();
  const [decks, setDecks] = useState(initialDecks);

  function handleDeleted(id: string) {
    setDecks((prev) => prev.filter((d) => d.id !== id));
    // Refresh server component to stay in sync (e.g. deck_count on user)
    router.refresh();
  }

  if (decks.length === 0) return <EmptyState />;

  return (
    <div className="space-y-3" aria-label="Deck list">
      {decks.map((deck) => (
        <DeckCard key={deck.id} deck={deck} onDeleted={handleDeleted} />
      ))}
    </div>
  );
}
