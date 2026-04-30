import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { generationLogs, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/admin-guard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Log Entry — Admin",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: { id: string };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-100 py-3 grid grid-cols-[180px_1fr] gap-4">
      <span className="text-sm text-gray-500 font-medium">{label}</span>
      <span className="text-sm text-gray-900">{children}</span>
    </div>
  );
}

export default async function AdminLogDetailPage({ params }: PageProps) {
  await requireAdmin();

  const [log] = await db
    .select({
      id: generationLogs.id,
      userId: generationLogs.userId,
      deckId: generationLogs.deckId,
      inputText: generationLogs.inputText,
      inputMode: generationLogs.inputMode,
      status: generationLogs.status,
      errorMessage: generationLogs.errorMessage,
      aiProvider: generationLogs.aiProvider,
      modelUsed: generationLogs.modelUsed,
      latencyMs: generationLogs.latencyMs,
      createdAt: generationLogs.createdAt,
      userEmail: users.email,
    })
    .from(generationLogs)
    .leftJoin(users, eq(generationLogs.userId, users.id))
    .where(eq(generationLogs.id, params.id))
    .limit(1);

  if (!log) notFound();

  const isSuccess = log.status === "success";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/admin/logs" className="text-sm text-gray-400 hover:text-gray-700">
              ← Generation Logs
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Log Entry</h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isSuccess ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}
            >
              {log.status}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1 font-mono">{log.id}</p>
        </div>

        {/* Detail card */}
        <div className="bg-white border border-gray-200 rounded-lg px-5 divide-y divide-gray-100">
          <Field label="Timestamp">
            {new Date(log.createdAt).toLocaleString()}
          </Field>

          <Field label="User">
            {log.userEmail ? (
              log.userId ? (
                <Link
                  href={`/admin/users/${log.userId}`}
                  className="text-blue-600 hover:underline"
                >
                  {log.userEmail}
                </Link>
              ) : (
                log.userEmail
              )
            ) : (
              <span className="text-gray-400 italic">deleted user</span>
            )}
          </Field>

          <Field label="Input mode">{log.inputMode ?? "—"}</Field>

          <Field label="AI Provider">{log.aiProvider}</Field>

          <Field label="Model">{log.modelUsed ?? "—"}</Field>

          <Field label="Latency">
            {log.latencyMs != null ? `${log.latencyMs}ms` : "—"}
          </Field>

          {/* AC2: error details for diagnosis */}
          {!isSuccess && (
            <Field label="Error">
              <code className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded block whitespace-pre-wrap break-all">
                {log.errorMessage ?? "No error message recorded."}
              </code>
            </Field>
          )}

          {/* AC3: link to deck if generation succeeded */}
          {isSuccess && log.deckId && (
            <Field label="Generated Deck">
              <Link
                href={`/deck/${log.deckId}`}
                className="text-blue-600 hover:underline text-sm font-mono"
              >
                {log.deckId} →
              </Link>
            </Field>
          )}

          {/* AC3: input submitted */}
          <div className="py-3">
            <p className="text-sm text-gray-500 font-medium mb-2">Input (first 500 chars)</p>
            <pre className="text-xs text-gray-700 bg-gray-50 rounded p-3 whitespace-pre-wrap break-all font-mono border border-gray-100">
              {log.inputText ?? "—"}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
