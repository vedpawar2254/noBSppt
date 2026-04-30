import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth/guard";
import LogoutButton from "@/components/auth/LogoutButton";

export const metadata: Metadata = {
  title: "Dashboard — nobsppt",
  robots: { index: false, follow: false },
};

// Auth-protected stub — deck history and content added in Story 1.3
export default async function DashboardPage() {
  const session = await requireAuth();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <LogoutButton />
        </div>
        <p className="text-gray-600 text-sm mb-6">{session.email}</p>
        <p className="text-sm text-gray-400">
          Deck generation and history coming in Epic 2 and Story 1.3.
        </p>
      </div>
    </main>
  );
}
