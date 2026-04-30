"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface LogoutButtonProps {
  className?: string;
}

export default function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      // AC4: redirect to home/landing page after logout
      router.push("/");
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={className ?? "text-sm text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50"}
    >
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}
