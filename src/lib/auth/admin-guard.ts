import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/guard";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { SessionPayload } from "@/lib/auth/session";

/**
 * requireAdmin — server component guard.
 *
 * Reuse contract (Stories 5.2 and 5.3):
 *   import { requireAdmin } from "@/lib/auth/admin-guard";
 *   const session = await requireAdmin(); // redirects to /login or /dashboard if not admin
 *
 * Redirect behaviour:
 *   - No session  → redirect to /login  (via requireAuth)
 *   - Not admin   → redirect to /dashboard
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireAuth();

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user || user.role !== "admin") {
    redirect("/dashboard");
  }

  return session;
}

/**
 * getAdminSession — API route guard.
 *
 * Reuse contract (Stories 5.2 and 5.3):
 *   const admin = await getAdminSession();
 *   if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: admin === null ? 401 : 403 });
 *
 * Returns:
 *   - { session, status: "ok" }      → authenticated admin
 *   - { session: null, status: 401 } → not authenticated
 *   - { session: null, status: 403 } → authenticated but not admin
 */
export async function getAdminSession(): Promise<
  | { session: SessionPayload; status: "ok" }
  | { session: null; status: 401 | 403 }
> {
  const session = await getSession();
  if (!session) return { session: null, status: 401 };

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user || user.role !== "admin") return { session: null, status: 403 };

  return { session, status: "ok" };
}
