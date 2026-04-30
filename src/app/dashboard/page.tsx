import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/guard";
import LogoutButton from "@/components/auth/LogoutButton";
import DeckList from "@/components/decks/DeckList";
import { db } from "@/lib/db";
import { decks } from "@/lib/db/schema";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard — nobsppt",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const session = await requireAuth();

  // Fetch decks server-side — ordered by created_at DESC (AC1)
  const userDecks = await db
    .select({ id: decks.id, title: decks.title, createdAt: decks.createdAt })
    .from(decks)
    .where(eq(decks.userId, session.userId))
    .orderBy(desc(decks.createdAt));

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="w-full max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">{session.email}</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/create"
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded hover:bg-gray-800 transition-colors"
            >
              New deck
            </Link>
            <LogoutButton />
          </div>
        </div>

        {/* Deck history (AC1) / Empty state (AC2) */}
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
            Your decks
          </h2>
          <DeckList decks={userDecks} />
        </section>
      </div>
    </main>
  );
}
