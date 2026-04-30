"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isFormFilled = email.trim().length > 0 && password.length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // AC1: redirect to dashboard (or the page user was trying to reach)
        const from = searchParams.get("from") ?? "/dashboard";
        router.push(from);
        return;
      }

      if (res.status === 429) {
        setError("Too many login attempts. Please try again later.");
      } else if (res.status === 401) {
        // AC2: generic error — no hint about which field was wrong
        setError(data.error ?? "Invalid email or password.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-label="Login form">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
          placeholder="you@example.com"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
          placeholder="Your password"
          required
        />
      </div>

      {/* AC2: clear error message shown on failure */}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!isFormFilled || loading}
        className="w-full py-2 px-4 bg-black text-white font-medium rounded-md text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-sm text-center text-gray-600">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-black font-medium hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}
