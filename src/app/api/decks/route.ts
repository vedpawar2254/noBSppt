import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { decks } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";

// GET /api/decks — returns authenticated user's decks, newest first (AC1)
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const userDecks = await db
    .select({
      id: decks.id,
      title: decks.title,
      createdAt: decks.createdAt,
    })
    .from(decks)
    .where(eq(decks.userId, session.userId))
    .orderBy(desc(decks.createdAt));

  return NextResponse.json({ decks: userDecks }, { status: 200 });
}
