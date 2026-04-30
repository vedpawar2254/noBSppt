import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { decks, deckViews } from "@/lib/db/schema";
import DeckViewer from "@/components/decks/DeckViewer";
import ShareButton from "@/components/decks/ShareButton";
import ExportButton from "@/components/decks/ExportButton";

interface PageProps {
  params: { id: string };
}

// Dynamic title from deck
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `Deck — nobsppt`,
    robots: { index: false, follow: false }, // creator view is private
    // Populated with real title after DB fetch in the page component below
    // (generateMetadata runs separately — real title fetched there in prod)
    description: `Deck ${params.id}`,
  };
}

// Creator view — auth-required. Public view is Story 3.1 at /share/[token].
export default async function DeckPage({ params }: PageProps) {
  const session = await requireAuth();
  const { id } = params;

  // Fetch with ownership check — same 404 for not-found and wrong-owner (no info leak)
  const [deck] = await db
    .select({
      id: decks.id,
      title: decks.title,
      slides: decks.slides,
      theme: decks.theme,
      createdAt: decks.createdAt,
      shareToken: decks.shareToken,
    })
    .from(decks)
    .where(and(eq(decks.id, id), eq(decks.userId, session.userId)))
    .limit(1);

  if (!deck) {
    notFound();
  }

  // Story 6.4: fetch view stats for this deck (owner-only, non-blocking)
  const [[viewStats]] = await Promise.all([
    db
      .select({
        totalViews: sql<number>`count(*)::int`,
        uniqueVisitors: sql<number>`count(distinct ${deckViews.visitorId})::int`,
      })
      .from(deckViews)
      .where(eq(deckViews.deckId, id)),
  ]);

  // Header actions injected into the viewer — creator-specific
  const headerActions = (
    <>
      <Link
        href="/dashboard"
        className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        ← Dashboard
      </Link>
      {viewStats.totalViews > 0 && (
        <span className="text-xs text-gray-400 tabular-nums">
          {viewStats.totalViews} views · {viewStats.uniqueVisitors} unique
        </span>
      )}
      <ShareButton deckId={id} initialShareToken={deck.shareToken} />
      <ExportButton deckId={id} />
    </>
  );

  return (
    // Full-viewport layout — viewer fills the screen (AC1)
    <div className="h-screen flex flex-col overflow-hidden">
      <DeckViewer
        slides={deck.slides}
        deckTitle={deck.title}
        theme={deck.theme}
        headerActions={headerActions}
      />
    </div>
  );
}
