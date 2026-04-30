import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Dashboard — nobsppt",
  robots: { index: false, follow: false },
};

// Auth-protected stub — deck history and content added in Story 1.3
export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-semibold mb-2">Welcome back</h1>
      <p className="text-gray-600 text-sm mb-6">{session.email}</p>
      <p className="text-sm text-gray-400">
        Deck generation and history coming in Epic 2 and Story 1.3.
      </p>
    </main>
  );
}
