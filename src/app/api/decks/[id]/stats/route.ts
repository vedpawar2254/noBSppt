import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { decks, deckViews } from "@/lib/db/schema";
import { getSessionFromRequest } from "@/lib/auth/session";

/**
 * GET /api/decks/[id]/stats
 * Story 6.4: Return view analytics for a deck.
 * Auth-required; returns 404 for not-found or wrong owner (no info leak).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: deckId } = params;

  // Ownership check — same 404 for missing or wrong owner
  const [deck] = await db
    .select({ id: decks.id })
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, session.userId)))
    .limit(1);

  if (!deck) {
    return NextResponse.json({ error: "Deck not found." }, { status: 404 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [[allTime], [recent]] = await Promise.all([
    db
      .select({
        totalViews: sql<number>`count(*)::int`,
        uniqueVisitors: sql<number>`count(distinct ${deckViews.visitorId})::int`,
      })
      .from(deckViews)
      .where(eq(deckViews.deckId, deckId)),

    db
      .select({ viewsLast7Days: sql<number>`count(*)::int` })
      .from(deckViews)
      .where(and(eq(deckViews.deckId, deckId), gte(deckViews.viewedAt, sevenDaysAgo))),
  ]);

  return NextResponse.json({
    stats: {
      totalViews: allTime.totalViews,
      uniqueVisitors: allTime.uniqueVisitors,
      viewsLast7Days: recent.viewsLast7Days,
    },
  });
}
