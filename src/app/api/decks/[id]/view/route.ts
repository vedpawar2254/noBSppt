import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { decks, deckViews } from "@/lib/db/schema";
import { getSessionFromRequest } from "@/lib/auth/session";

const VID_COOKIE = "nobsppt_vid";
const VID_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const DEDUP_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

/**
 * POST /api/decks/[id]/view
 * Story 6.4: Record a public deck view event.
 * - Reads/creates nobsppt_vid httpOnly cookie for anonymous visitor tracking.
 * - Skips recording if viewer is the deck owner.
 * - Deduplication: same (deck_id, visitor_id) within 30 min = skip insert.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: deckId } = params;

  // Read or create visitor ID
  let visitorId = req.cookies.get(VID_COOKIE)?.value ?? "";
  const isNewVisitor = !visitorId;
  if (!visitorId) {
    visitorId = randomUUID();
  }

  // Fetch deck to check existence + ownership
  const [deck] = await db
    .select({ userId: decks.userId })
    .from(decks)
    .where(eq(decks.id, deckId))
    .limit(1);

  if (!deck) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  // Build response early so we can attach cookie regardless of whether we record
  const res = NextResponse.json({ ok: true });
  if (isNewVisitor) {
    res.cookies.set(VID_COOKIE, visitorId, {
      httpOnly: true,
      maxAge: VID_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });
  }

  // Skip — owner viewing their own deck (no self-view inflation)
  const session = await getSessionFromRequest(req);
  if (session?.userId === deck.userId) {
    return res;
  }

  // Deduplication: check for same (deck_id, visitor_id) in last 30 min
  const windowStart = new Date(Date.now() - DEDUP_WINDOW_MS);
  const [existing] = await db
    .select({ id: deckViews.id })
    .from(deckViews)
    .where(
      and(
        eq(deckViews.deckId, deckId),
        eq(deckViews.visitorId, visitorId),
        gt(deckViews.viewedAt, windowStart)
      )
    )
    .limit(1);

  if (!existing) {
    await db.insert(deckViews).values({ deckId, visitorId });
  }

  return res;
}
