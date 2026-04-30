import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, decks } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/admin-guard";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-400 w-44 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 break-all">{value}</span>
    </div>
  );
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  await requireAdmin();

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
        isPublic: sql<boolean>`(${decks.shareToken} is not null)`,
        slideCount: sql<number>`jsonb_array_length(${decks.slides})::int`,
        status: decks.status,
      })
      .from(decks)
      .where(eq(decks.userId, id))
      .orderBy(desc(decks.createdAt)),
  ]);

  if (!user) notFound();

  const maskedStripeId = user.stripeCustomerId
    ? `****${user.stripeCustomerId.slice(-4)}`
    : "—";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/admin" className="hover:text-gray-700">Admin</Link>
          <span>/</span>
          <Link href="/admin/users" className="hover:text-gray-700">Users</Link>
          <span>/</span>
          <span className="text-gray-700 truncate max-w-xs">{user.email}</span>
        </div>

        {/* Account details */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-bold text-gray-900">Account Details</h1>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                user.subscriptionStatus === "paid"
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {user.subscriptionStatus}
            </span>
          </div>

          <DetailRow label="User ID" value={<span className="font-mono text-xs">{user.id}</span>} />
          <DetailRow label="Email" value={user.email} />
          <DetailRow label="Registered" value={formatDate(user.createdAt)} />
          <DetailRow label="Role" value={user.role} />
          <DetailRow label="Decks Generated" value={user.deckCount} />
          <DetailRow
            label="Stripe Customer ID"
            value={<span className="font-mono text-xs">{maskedStripeId}</span>}
          />
        </div>

        {/* Deck activity */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">
              Deck Activity
              <span className="ml-2 text-sm font-normal text-gray-400">
                {deckActivity.length} deck{deckActivity.length !== 1 ? "s" : ""}
              </span>
            </h2>
          </div>

          {deckActivity.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">
              No decks generated yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Slides</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Public</th>
                </tr>
              </thead>
              <tbody>
                {deckActivity.map((deck) => (
                  <tr key={deck.id} className="border-b border-gray-50">
                    <td className="px-4 py-3">
                      <span className="text-gray-900 font-medium truncate block max-w-xs">
                        {deck.title}
                      </span>
                      <span className="font-mono text-xs text-gray-400">{deck.id}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {formatDate(deck.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                      {deck.slideCount}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500">{deck.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {deck.isPublic ? (
                        <span className="text-blue-600">Yes</span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
