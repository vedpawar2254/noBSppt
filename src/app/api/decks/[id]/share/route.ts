import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { decks } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";

// POST /api/decks/[id]/share — generate/return share token, owner-only (AC1, FR12)
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = params;

  const [deck] = await db
    .select({ id: decks.id, shareToken: decks.shareToken })
    .from(decks)
    .where(and(eq(decks.id, id), eq(decks.userId, session.userId)))
    .limit(1);

  if (!deck) {
    return NextResponse.json({ error: "Deck not found." }, { status: 404 });
  }

  // Idempotent — return existing token if already shared
  const token = deck.shareToken ?? randomUUID();

  if (!deck.shareToken) {
    await db.update(decks).set({ shareToken: token }).where(eq(decks.id, id));
  }

  return NextResponse.json({ shareToken: token }, { status: 200 });
}
