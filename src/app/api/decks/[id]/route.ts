import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { decks } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";

// DELETE /api/decks/[id] — deletes deck after ownership verification (AC3, AC4)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = params;

  // Ownership check: only delete if the deck belongs to the requesting user
  const deleted = await db
    .delete(decks)
    .where(and(eq(decks.id, id), eq(decks.userId, session.userId)))
    .returning({ id: decks.id });

  if (deleted.length === 0) {
    // Either not found or belongs to a different user — same 404 for both (no info leak)
    return NextResponse.json({ error: "Deck not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
