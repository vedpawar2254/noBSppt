import type { Metadata } from "next";
import Link from "next/link";
import RegisterForm from "@/components/auth/RegisterForm";

// Auth routes must not be SEO-indexed (PRD web app requirements)
export const metadata: Metadata = {
  title: "Create account — nobsppt",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-xl font-bold tracking-tight">
            nobsppt
          </Link>
          <h1 className="mt-4 text-2xl font-semibold">Create your account</h1>
          <p className="mt-1 text-sm text-gray-500">Start generating signal-dense decks.</p>
        </div>
        <RegisterForm />
      </div>
    </main>
  );
}
