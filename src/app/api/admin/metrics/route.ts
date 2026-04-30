import { NextResponse } from "next/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, decks, deckViews } from "@/lib/db/schema";
import { getAdminSession } from "@/lib/auth/admin-guard";

// GET /api/admin/metrics — platform-wide metrics, admin-only (AC1, AC2, FR28, FR29)
// Stories 5.2 and 5.3 extend the admin API under /api/admin/*
export async function GET() {
  const auth = await getAdminSession();
  if (auth.status !== "ok") {
    const msg = auth.status === 401 ? "Unauthorized." : "Forbidden.";
    return NextResponse.json({ error: msg }, { status: auth.status });
  }

  const [
    [{ totalDecks }],
    [{ totalUsers }],
    [{ totalPaid }],
    [{ conversions }],
    [{ totalViews }],
    topDecks,
  ] = await Promise.all([
    // FR28: total decks generated across all users
    db.select({ totalDecks: sql<number>`count(*)::int` }).from(decks),

    // Total registered users
    db.select({ totalUsers: sql<number>`count(*)::int` }).from(users),

    // FR29: total paid subscribers
    db
      .select({ totalPaid: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.subscriptionStatus, "paid")),

    // FR29: free-to-paid conversions (paid users who generated ≥1 deck)
    db
      .select({ conversions: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.subscriptionStatus, "paid"), gte(users.deckCount, 1))),

    // Story 6.4: total deck views platform-wide
    db.select({ totalViews: sql<number>`count(*)::int` }).from(deckViews),

    // Story 6.4: top 5 most-viewed decks
    db
      .select({
        deckId: deckViews.deckId,
        title: decks.title,
        views: sql<number>`count(*)::int`,
      })
      .from(deckViews)
      .leftJoin(decks, eq(deckViews.deckId, decks.id))
      .groupBy(deckViews.deckId, decks.title)
      .orderBy(desc(sql`count(*)`))
      .limit(5),
  ]);

  return NextResponse.json(
    { metrics: { totalDecks, totalUsers, totalPaid, conversions, totalViews, topDecks } },
    { status: 200 }
  );
}
