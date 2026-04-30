import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { generationLogs, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/admin-guard";

export const metadata: Metadata = {
  title: "Generation Logs — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: {
    status?: string;
    start?: string;
    end?: string;
    email?: string;
    page?: string;
  };
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        status === "success"
          ? "bg-green-50 text-green-700"
          : "bg-red-50 text-red-700"
      }`}
    >
      {status}
    </span>
  );
}

export default async function AdminLogsPage({ searchParams }: PageProps) {
  await requireAdmin();

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  // Build conditions
  const conditions: SQL[] = [];
  if (searchParams.status === "success" || searchParams.status === "failure") {
    conditions.push(eq(generationLogs.status, searchParams.status));
  }
  if (searchParams.start) {
    const d = new Date(searchParams.start);
    if (!isNaN(d.getTime())) conditions.push(gte(generationLogs.createdAt, d));
  }
  if (searchParams.end) {
    const d = new Date(searchParams.end);
    if (!isNaN(d.getTime())) conditions.push(lte(generationLogs.createdAt, d));
  }
  if (searchParams.email) {
    conditions.push(ilike(users.email, `%${searchParams.email}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [logs, [{ total }]] = await Promise.all([
    db
      .select({
        id: generationLogs.id,
        status: generationLogs.status,
        inputMode: generationLogs.inputMode,
        modelUsed: generationLogs.modelUsed,
        latencyMs: generationLogs.latencyMs,
        createdAt: generationLogs.createdAt,
        userEmail: users.email,
        deckId: generationLogs.deckId,
      })
      .from(generationLogs)
      .leftJoin(users, eq(generationLogs.userId, users.id))
      .where(where)
      .orderBy(desc(generationLogs.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),

    db
      .select({ total: sql<number>`count(*)::int` })
      .from(generationLogs)
      .leftJoin(users, eq(generationLogs.userId, users.id))
      .where(where),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Helper: build filter URL preserving other params
  function filterUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = {
      status: searchParams.status,
      start: searchParams.start,
      end: searchParams.end,
      email: searchParams.email,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    return `/admin/logs?${params.toString()}`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-700">
                ← Admin
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Generation Logs</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {total.toLocaleString()} total entries
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-end">
          <form method="GET" action="/admin/logs" className="flex flex-wrap gap-3 items-end w-full">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                name="status"
                defaultValue={searchParams.status ?? ""}
                className="text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-black"
              >
                <option value="">All</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
              <input
                type="date"
                name="start"
                defaultValue={searchParams.start ?? ""}
                className="text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
              <input
                type="date"
                name="end"
                defaultValue={searchParams.end ?? ""}
                className="text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">User email</label>
              <input
                type="text"
                name="email"
                defaultValue={searchParams.email ?? ""}
                placeholder="partial match"
                className="text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-black w-44"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-black text-white text-sm rounded hover:bg-gray-800 transition-colors"
            >
              Filter
            </button>
            <Link
              href="/admin/logs"
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              Clear
            </Link>
          </form>
        </div>

        {/* Log table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {logs.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              No logs match the current filters.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Time</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">User</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Mode</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Latency</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Model</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 tabular-nums whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-700 truncate max-w-[180px]">
                      {log.userEmail ?? (
                        <span className="text-gray-400 italic">deleted user</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">{log.inputMode ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 tabular-nums">
                      {log.latencyMs != null ? `${log.latencyMs}ms` : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {log.modelUsed ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/logs/${log.id}`}
                        className="text-xs text-gray-400 hover:text-gray-900"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
                  href={filterUrl({ page: String(page - 1) })}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                >
                  ← Prev
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={filterUrl({ page: String(page + 1) })}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 transition-colors"
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
