import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, decks } from "@/lib/db/schema";
import { getAdminSession } from "@/lib/auth/admin-guard";

// GET /api/admin/users/:id — user details + deck activity, admin-only (AC2, AC3, FR30)
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAdminSession();
  if (auth.status !== "ok") {
    const msg = auth.status === 401 ? "Unauthorized." : "Forbidden.";
    return NextResponse.json({ error: msg }, { status: auth.status });
  }

  const { id } = params;

  const [[user], deckActivity] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        createdAt: users.createdAt,
        subscriptionStatus: users.subscriptionStatus,
        deckCount: users.deckCount,
        stripeCustomerId: users.stripeCustomerId,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1),

    db
      .select({
        id: decks.id,
        title: decks.title,
        createdAt: decks.createdAt,
        // shareToken presence = deck is public; don't expose the token itself
        isPublic: sql<boolean>`(${decks.shareToken} is not null)`,
        slideCount: sql<number>`jsonb_array_length(${decks.slides})::int`,
        status: decks.status,
      })
      .from(decks)
      .where(eq(decks.userId, id))
      .orderBy(desc(decks.createdAt)),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  // Mask stripeCustomerId — show only last 4 chars for Stripe dashboard reference
  const maskedStripeId = user.stripeCustomerId
    ? `****${user.stripeCustomerId.slice(-4)}`
    : null;

  return NextResponse.json(
    {
      user: { ...user, stripeCustomerId: maskedStripeId },
      decks: deckActivity,
    },
    { status: 200 }
  );
}
