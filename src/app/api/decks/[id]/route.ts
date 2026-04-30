import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { decks } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";

// GET /api/decks/[id] — fetch single deck, owner-only (AC4, NFR9)
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = params;

  const [deck] = await db
    .select({
      id: decks.id,
      title: decks.title,
      slides: decks.slides,
      theme: decks.theme,
      status: decks.status,
      createdAt: decks.createdAt,
    })
    .from(decks)
    .where(and(eq(decks.id, id), eq(decks.userId, session.userId)))
    .limit(1);

  if (!deck) {
    // Not found or belongs to a different user — same 404 (no info leak)
    return NextResponse.json({ error: "Deck not found." }, { status: 404 });
  }

  return NextResponse.json({ deck }, { status: 200 });
}

// DELETE /api/decks/[id] — deletes deck after ownership verification (Story 1.3)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = params;

  const deleted = await db
    .delete(decks)
    .where(and(eq(decks.id, id), eq(decks.userId, session.userId)))
    .returning({ id: decks.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Deck not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
