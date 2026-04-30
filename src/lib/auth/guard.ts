/**
 * Shared auth guard for Server Components and Server Actions.
 * ALL protected server components in Epic 2, 3, 4, 5 should call requireAuth().
 *
 * Usage:
 *   const session = await requireAuth(); // redirects to /login if no session
 *   // session.userId and session.email are available here
 */

import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "@/lib/auth/session";

export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
