import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { FREE_DECK_LIMIT, getFreeDecksRemaining } from "@/lib/decks/validation";
import DeckInputForm from "@/components/decks/DeckInputForm";

export const metadata: Metadata = {
  title: "Create Deck — nobsppt",
  robots: { index: false, follow: false },
};

export default async function CreatePage() {
  const session = await requireAuth();

  const [user] = await db
    .select({ deckCount: users.deckCount, subscriptionStatus: users.subscriptionStatus })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  const isPaid = user?.subscriptionStatus === "paid";
  const deckCount = user?.deckCount ?? 0;
  const freeDecksRemaining = isPaid ? null : getFreeDecksRemaining(deckCount);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold">Create a Deck</h1>
          {freeDecksRemaining !== null && (
            <span className="text-sm text-gray-500">
              {freeDecksRemaining} of {FREE_DECK_LIMIT} free decks remaining
            </span>
          )}
        </div>
        <DeckInputForm />
      </div>
    </main>
  );
}
