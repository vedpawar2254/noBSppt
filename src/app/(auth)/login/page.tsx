import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";

// Auth routes must not be SEO-indexed (PRD web app requirements)
export const metadata: Metadata = {
  title: "Sign in — nobsppt",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-xl font-bold tracking-tight">
            nobsppt
          </Link>
          <h1 className="mt-4 text-2xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-gray-500">Welcome back.</p>
        </div>
        {/* Suspense required: LoginForm uses useSearchParams() */}
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
