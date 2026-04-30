import Link from "next/link";
import { desc, ilike, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/admin-guard";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: { page?: string; search?: string };
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  await requireAdmin();

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const search = searchParams.search?.trim() || undefined;
  const offset = (page - 1) * PAGE_SIZE;
  const condition = search ? ilike(users.email, `%${search}%`) : undefined;

  const [[{ total }], userList] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(users)
      .where(condition),
    db
      .select({
        id: users.id,
        email: users.email,
        createdAt: users.createdAt,
        subscriptionStatus: users.subscriptionStatus,
        deckCount: users.deckCount,
        role: users.role,
      })
      .from(users)
      .where(condition)
      .orderBy(desc(users.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/admin/users${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/admin" className="hover:text-gray-700">Admin</Link>
          <span>/</span>
          <span className="text-gray-700">Users</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">
            Users
            <span className="ml-2 text-sm font-normal text-gray-400">
              {total.toLocaleString()} total
            </span>
          </h1>
        </div>

        {/* Search */}
        <form method="GET" action="/admin/users" className="mb-6 flex gap-3">
          <input
            type="text"
            name="search"
            defaultValue={search ?? ""}
            placeholder="Search by email…"
            className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-black text-white text-sm rounded hover:bg-gray-800 transition-colors"
          >
            Search
          </button>
          {search && (
            <Link
              href="/admin/users"
              className="px-4 py-2 border border-gray-200 text-sm rounded hover:bg-gray-50 transition-colors"
            >
              Clear
            </Link>
          )}
        </form>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Registered</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Decks</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
              </tr>
            </thead>
            <tbody>
              {userList.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    No users found.
                  </td>
                </tr>
              )}
              {userList.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {user.email}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        user.subscriptionStatus === "paid"
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {user.subscriptionStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                    {user.deckCount}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{user.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={pageUrl(page - 1)}
                  className="px-3 py-1.5 border border-gray-200 rounded text-sm hover:bg-gray-50"
                >
                  ← Prev
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={pageUrl(page + 1)}
                  className="px-3 py-1.5 border border-gray-200 rounded text-sm hover:bg-gray-50"
                >
                  Next →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
