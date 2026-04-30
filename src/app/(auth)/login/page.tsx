import type { Metadata } from "next";
import Link from "next/link";

// Auth routes must not be SEO-indexed (PRD web app requirements)
export const metadata: Metadata = {
  title: "Sign in — nobsppt",
  robots: { index: false, follow: false },
};

// Stub — implemented in Story 1.2
export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="text-xl font-bold tracking-tight">
          nobsppt
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-gray-500">Login coming in Story 1.2.</p>
        <Link href="/register" className="mt-4 inline-block text-sm text-black underline">
          Create an account instead
        </Link>
      </div>
    </main>
  );
}
