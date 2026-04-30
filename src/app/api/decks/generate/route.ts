import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { decks, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { generateDeck, CONSTRAINTS } from "@/lib/decks/engine";
import { validateDeckInput, FREE_DECK_LIMIT, type GenerationPayload } from "@/lib/decks/validation";

export const maxDuration = 60; // seconds — Next.js route timeout (allows for AI latency)

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Parse + validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { mode, content } = body as Partial<GenerationPayload>;

  if (!mode || (mode !== "text" && mode !== "outline")) {
    return NextResponse.json({ error: "mode must be 'text' or 'outline'." }, { status: 422 });
  }

  const validation = validateDeckInput(content ?? "");
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  // Paywall check — free users capped at FREE_DECK_LIMIT (Epic 4 will handle the UX)
  const [user] = await db
    .select({ deckCount: users.deckCount, subscriptionStatus: users.subscriptionStatus })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const isFree = user.subscriptionStatus === "free";
  if (isFree && user.deckCount >= FREE_DECK_LIMIT) {
    return NextResponse.json(
      { error: "Free deck limit reached. Upgrade to continue.", code: "PAYWALL" },
      { status: 402 }
    );
  }

  // Call the restraint engine
  let result: Awaited<ReturnType<typeof generateDeck>>;
  try {
    result = await generateDeck(mode, content!);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate] AI error:", message);
    // NFR11: clear error, no silent failure. NFR12: client preserves input (handled client-side).
    return NextResponse.json(
      { error: "Deck generation failed. Please try again.", detail: message },
      { status: 502 }
    );
  }

  // Log latency for monitoring (AC4 / NFR1)
  console.log(
    `[generate] latency=${result.latencyMs}ms slides=${result.slides.length} user=${session.userId}`
  );

  // Persist deck + increment deck_count atomically (if save fails, count does NOT increment)
  let deckId: string;
  try {
    await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(decks)
        .values({
          userId: session.userId,
          title: result.title,
          slides: result.slides,
          inputText: content,
          theme: CONSTRAINTS.THEME,
          status: "done",
        })
        .returning({ id: decks.id });

      deckId = inserted.id;

      // Atomic increment — NFR: if deck save fails, count is not touched
      await tx
        .update(users)
        .set({ deckCount: sql`${users.deckCount} + 1` })
        .where(eq(users.id, session.userId));
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate] DB error:", message);
    return NextResponse.json({ error: "Failed to save deck. Please try again." }, { status: 500 });
  }

  return NextResponse.json(
    {
      deckId: deckId!,
      title: result.title,
      slides: result.slides,
      theme: CONSTRAINTS.THEME,
      latencyMs: result.latencyMs,
    },
    { status: 201 }
  );
}
