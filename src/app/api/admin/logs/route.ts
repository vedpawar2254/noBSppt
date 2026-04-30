import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { generationLogs, users } from "@/lib/db/schema";
import { getAdminSession } from "@/lib/auth/admin-guard";

const PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * GET /api/admin/logs
 * Query params:
 *   status  — "success" | "failure"
 *   start   — ISO datetime string (inclusive lower bound on createdAt)
 *   end     — ISO datetime string (inclusive upper bound on createdAt)
 *   email   — partial match against user email (case-insensitive)
 *   page    — 1-indexed (default 1)
 *   limit   — rows per page (default 20, max 100)
 */
export async function GET(req: NextRequest) {
  const auth = await getAdminSession();
  if (auth.status !== "ok") {
    const msg = auth.status === 401 ? "Unauthorized." : "Forbidden.";
    return NextResponse.json({ error: msg }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const email = searchParams.get("email");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(searchParams.get("limit") ?? String(PAGE_SIZE), 10)));
  const offset = (page - 1) * limit;

  // Build WHERE conditions
  const conditions: SQL[] = [];

  if (statusFilter === "success" || statusFilter === "failure") {
    conditions.push(eq(generationLogs.status, statusFilter));
  }
  if (start) {
    const startDate = new Date(start);
    if (!isNaN(startDate.getTime())) {
      conditions.push(gte(generationLogs.createdAt, startDate));
    }
  }
  if (end) {
    const endDate = new Date(end);
    if (!isNaN(endDate.getTime())) {
      conditions.push(lte(generationLogs.createdAt, endDate));
    }
  }
  if (email) {
    // ilike on joined users.email — safe: Drizzle parameterises the value
    conditions.push(ilike(users.email, `%${email}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Fetch page + count in parallel
  const [logs, [{ total }]] = await Promise.all([
    db
      .select({
        id: generationLogs.id,
        userId: generationLogs.userId,
        deckId: generationLogs.deckId,
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
      .where(where)
      .orderBy(desc(generationLogs.createdAt))
      .limit(limit)
      .offset(offset),

    db
      .select({ total: sql<number>`count(*)::int` })
      .from(generationLogs)
      .leftJoin(users, eq(generationLogs.userId, users.id))
      .where(where),
  ]);

  return NextResponse.json(
    {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
    { status: 200 }
  );
}
