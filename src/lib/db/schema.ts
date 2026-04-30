import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";

export const subscriptionStatusEnum = pgEnum("subscription_status", ["free", "paid"]);

// Story 5.1 — admin access control
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").default("free").notNull(),
  deckCount: integer("deck_count").default(0).notNull(),
  // Stripe — populated on first successful checkout (Story 4.2)
  // Story 4.3 reads stripeCustomerId for subscription management / cancellation
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  // Story 4.3: when cancel_at_period_end is set, store end date so UI can display "access until [date]"
  subscriptionCancelAt: timestamp("subscription_cancel_at"),
  // Story 5.1 — role-based access; promote via: UPDATE users SET role='admin' WHERE email='you@example.com'
  role: userRoleEnum("role").default("user").notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ---------------------------------------------------------------------------
// Deck status enum — Story 2.2
// ---------------------------------------------------------------------------
export const deckStatusEnum = pgEnum("deck_status", ["generating", "done", "failed"]);

// ---------------------------------------------------------------------------
// Slide object — the atomic unit stored in the slides JSONB column.
// Stories 2.3, 3.1, 3.2 read this structure from the DB.
//
// { title: string; bullets: string[] }
//   title   — short declarative noun phrase (3–6 words)
//   bullets — 1–3 items, each ≤10 words, one distinct point each
// ---------------------------------------------------------------------------
export interface SlideObject {
  title: string;
  bullets: string[];
}

export const decks = pgTable("decks", {
  // Core identity
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Content — added Story 2.2
  title: varchar("title", { length: 500 }).notNull(),
  slides: jsonb("slides").$type<SlideObject[]>().notNull().default([]),
  inputText: text("input_text"), // raw user input preserved for retry (NFR12)
  theme: varchar("theme", { length: 50 }).notNull().default("default"),
  status: deckStatusEnum("status").notNull().default("done"),

  // Sharing — populated when user first shares (Story 3.1)
  shareToken: varchar("share_token", { length: 255 }).unique(),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Deck = typeof decks.$inferSelect;
export type NewDeck = typeof decks.$inferInsert;
