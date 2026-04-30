import { pgTable, uuid, varchar, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";

export const subscriptionStatusEnum = pgEnum("subscription_status", ["free", "paid"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").default("free").notNull(),
  deckCount: integer("deck_count").default(0).notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

/**
 * Stub decks table — Story 1.3.
 * Epic 2 (Story 2.2) MUST extend this table with:
 *   - slides       jsonb NOT NULL          — array of slide objects from restraint engine
 *   - inputText    text                    — raw user input preserved for retry (NFR12)
 *   - shareToken   varchar(255) UNIQUE     — set on first share; used for public /deck/[shareToken] route
 *   - status       enum('generating','done','failed')  DEFAULT 'done'
 * Epic 3 (Story 3.1) reads shareToken.
 * Epic 4 (Story 4.1) reads deckCount on users table (already present).
 */
export const decks = pgTable("decks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Deck = typeof decks.$inferSelect;
export type NewDeck = typeof decks.$inferInsert;
