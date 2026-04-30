import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, decks } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/admin-guard";

// No cache — live data on every load (AC3)
export const dynamic = "force-dynamic";

interface MetricCardProps {
  label: string;
  value: number;
  description: string;
}

function MetricCard({ label, value, description }: MetricCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-5 bg-white">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1 tabular-nums">{value.toLocaleString()}</p>
      <p className="text-xs text-gray-400 mt-2">{description}</p>
    </div>
  );
}

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [
    [{ totalDecks }],
    [{ totalUsers }],
    [{ totalPaid }],
    [{ conversions }],
  ] = await Promise.all([
    db.select({ totalDecks: sql<number>`count(*)::int` }).from(decks),
    db.select({ totalUsers: sql<number>`count(*)::int` }).from(users),
    db
      .select({ totalPaid: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.subscriptionStatus, "paid")),
    db
      .select({ conversions: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.subscriptionStatus, "paid"), gte(users.deckCount, 1))),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">
            Live metrics — updated on each page load
          </p>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <MetricCard
            label="Total Decks"
            value={totalDecks}
            description="All decks generated across all users (FR28)"
          />
          <MetricCard
            label="Total Users"
            value={totalUsers}
            description="All registered accounts"
          />
          <MetricCard
            label="Paid Subscribers"
            value={totalPaid}
            description="Users with subscription_status = paid (FR29)"
          />
          <MetricCard
            label="Conversions"
            value={conversions}
            description="Paid users who generated ≥1 deck (FR29)"
          />
        </div>

        {/* Admin utilities */}
        <div className="mt-10 border border-gray-200 rounded-lg p-5 bg-white">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Promote a user to admin</h2>
          <code className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded block font-mono">
            UPDATE users SET role = &apos;admin&apos; WHERE email = &apos;you@example.com&apos;;
          </code>
          <p className="text-xs text-gray-400 mt-2">
            Run directly in your PostgreSQL database. User must re-login after promotion.
          </p>
        </div>
      </div>
    </div>
  );
}
