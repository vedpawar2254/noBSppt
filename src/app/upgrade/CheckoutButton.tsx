"use client";

import { useState } from "react";

export default function CheckoutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (res.ok && data.url) {
        // AC1: redirect to Stripe-hosted checkout — no card data through nobsppt (NFR7)
        window.location.href = data.url;
        return;
      }

      if (res.status === 409) {
        setError("Your account is already upgraded.");
      } else {
        setError(data.error ?? "Failed to start checkout. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className="w-full py-2.5 px-4 bg-black text-white font-medium rounded-md text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Redirecting to checkout…" : "Subscribe — $9/mo"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600 text-center">
          {error}
        </p>
      )}
    </div>
  );
}
