"use client";

import { useState } from "react";

// Razorpay Checkout.js attaches to window — typed minimally for what we use
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: any) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout"));
    document.body.appendChild(script);
  });
}

export default function CheckoutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Create Razorpay subscription server-side
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (res.status === 409) {
        setError("Your account is already upgraded.");
        setLoading(false);
        return;
      }

      if (!res.ok || !data.subscriptionId || !data.keyId) {
        setError(data.error ?? "Failed to start checkout. Please try again.");
        setLoading(false);
        return;
      }

      // Step 2: Load Razorpay checkout.js dynamically (AC1)
      await loadRazorpayScript();

      // Step 3: Open Razorpay modal — card data never touches nobsppt (AC1, NFR7)
      const rzp = new window.Razorpay({
        key: data.keyId as string,
        subscription_id: data.subscriptionId as string,
        name: "nobsppt",
        description: "Pro — unlimited decks",
        theme: { color: "#000000" },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_subscription_id: string;
          razorpay_signature: string;
        }) => {
          // Step 4: Verify HMAC-SHA256 signature server-side — source of truth (AC2)
          const verifyRes = await fetch("/api/subscription/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });

          if (verifyRes.ok) {
            window.location.href = "/create?upgraded=true";
          } else {
            setError("Payment verification failed. Contact support if amount was charged.");
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            // AC3: user abandoned checkout — stay on free tier (AC3)
            setLoading(false);
          },
        },
      });

      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
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
        {loading ? "Opening checkout…" : "Subscribe — ₹199/mo"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600 text-center">
          {error}
        </p>
      )}
    </div>
  );
}
