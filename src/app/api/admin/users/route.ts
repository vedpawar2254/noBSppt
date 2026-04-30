import { NextRequest, NextResponse } from "next/server";
import { desc, ilike, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getAdminSession } from "@/lib/auth/admin-guard";

const PAGE_SIZE = 20;

// GET /api/admin/users?page=1&search=<email> — paginated user list, admin-only (FR30)
export async function GET(req: NextRequest) {
  const auth = await getAdminSession();
  if (auth.status !== "ok") {
    const msg = auth.status === 401 ? "Unauthorized." : "Forbidden.";
    return NextResponse.json({ error: msg }, { status: auth.status });
  }

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const search = searchParams.get("search")?.trim() || undefined;
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

  return NextResponse.json(
    {
      users: userList,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    },
    { status: 200 }
  );
}
