import { NextRequest, NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { decks } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { generateDeckPdf } from "@/lib/pdf/generator";

export const runtime = "nodejs";

/**
 * GET /api/decks/[id]/export?token=<shareToken>
 *
 * Access rules:
 *   - Owner (authenticated, deck.userId === session.userId) → allow
 *   - Public (deck.shareToken matches query param token) → allow
 *   - Otherwise → 401
 *
 * AC1 (creator), AC2 (public no-auth), AC3 (<10s), AC4 (theme-consistent)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const start = Date.now();
  const { id } = params;
  const token = req.nextUrl.searchParams.get("token");

  const session = await getSession();

  // Fetch deck — allow if owned by session user OR shareToken matches
  let deck: {
    id: string;
    title: string;
    slides: import("@/lib/db/schema").SlideObject[];
    theme: string;
  } | undefined;

  if (session) {
    const [row] = await db
      .select({ id: decks.id, title: decks.title, slides: decks.slides, theme: decks.theme })
      .from(decks)
      .where(and(eq(decks.id, id), eq(decks.userId, session.userId)))
      .limit(1);
    deck = row;
  }

  // If not found via ownership, try public token
  if (!deck && token) {
    const [row] = await db
      .select({ id: decks.id, title: decks.title, slides: decks.slides, theme: decks.theme })
      .from(decks)
      .where(and(eq(decks.id, id), eq(decks.shareToken, token)))
      .limit(1);
    deck = row;
  }

  if (!deck) {
    if (!session && !token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    return NextResponse.json({ error: "Deck not found." }, { status: 404 });
  }

  const pdfBuffer = await generateDeckPdf(deck.title, deck.slides);
  const latencyMs = Date.now() - start;

  // NFR4 — log latency for Story 5.3 monitoring
  console.log(`[pdf-export] deckId=${id} slides=${deck.slides.length} latency=${latencyMs}ms`);

  const filename = `${deck.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
