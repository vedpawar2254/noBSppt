import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { generationLogs, users } from "@/lib/db/schema";
import { getAdminSession } from "@/lib/auth/admin-guard";

interface Params {
  params: { id: string };
}

/**
 * GET /api/admin/logs/:id
 * Returns the full log entry including input_text (truncated at write time to 500 chars)
 * and the associated user email. Links to /deck/:id if deckId is present.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await getAdminSession();
  if (auth.status !== "ok") {
    const msg = auth.status === 401 ? "Unauthorized." : "Forbidden.";
    return NextResponse.json({ error: msg }, { status: auth.status });
  }

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

  if (!log) {
    return NextResponse.json({ error: "Log not found." }, { status: 404 });
  }

  return NextResponse.json({ log }, { status: 200 });
}
