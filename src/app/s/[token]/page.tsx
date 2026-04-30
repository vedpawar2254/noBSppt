import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { decks } from "@/lib/db/schema";
import DeckViewer from "@/components/decks/DeckViewer";
import ExportButton from "@/components/decks/ExportButton";

interface PageProps {
  params: { token: string };
}

// SSR — publicly crawlable. No auth. (AC2, AC3, AC4, FR13, FR14)
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const [deck] = await db
    .select({ title: decks.title, slides: decks.slides })
    .from(decks)
    .where(eq(decks.shareToken, params.token))
    .limit(1);

  if (!deck) {
    return { title: "Deck not found — nobsppt" };
  }

  const firstBullet = deck.slides[0]?.bullets[0] ?? "";
  const description = firstBullet || deck.title;
  const ogImageUrl = `/api/og?token=${params.token}`;

  return {
    title: `${deck.title} — nobsppt`,
    description,
    openGraph: {
      title: deck.title,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: deck.title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function PublicDeckPage({ params }: PageProps) {
  const { token } = params;

  const [deck] = await db
    .select({
      id: decks.id,
      title: decks.title,
      slides: decks.slides,
      theme: decks.theme,
    })
    .from(decks)
    .where(eq(decks.shareToken, token))
    .limit(1);

  if (!deck) {
    notFound();
  }

  // Public viewer — no auth chrome. Export uses shareToken for unauthenticated access (AC2).
  const headerActions = (
    <ExportButton deckId={deck.id} shareToken={token} />
  );

  return (
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
