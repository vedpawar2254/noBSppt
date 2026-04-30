"use client";

import Link from "next/link";

interface PaywallModalProps {
  onDismiss: () => void;
}

export default function PaywallModal({ onDismiss }: PaywallModalProps) {
  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8 flex flex-col gap-5">
        {/* Header */}
        <div>
          <h2 id="paywall-title" className="text-xl font-semibold text-gray-900">
            You&apos;ve used your 3 free decks
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Free accounts include 3 deck generations. Upgrade to keep creating.
          </p>
        </div>

        {/* Value proposition */}
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-green-600 font-bold">✓</span>
            <span>Unlimited deck generations — no monthly cap</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-green-600 font-bold">✓</span>
            <span>Same restraint engine — signal-dense, no filler</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-green-600 font-bold">✓</span>
            <span>Your input is saved — generate immediately after upgrading</span>
          </li>
        </ul>

        {/* CTAs */}
        <div className="flex flex-col gap-3 pt-1">
          <Link
            href="/upgrade"
            className="w-full py-2.5 px-4 bg-black text-white font-medium rounded-md text-sm text-center hover:bg-gray-800 transition-colors"
            aria-label="Upgrade to paid plan"
          >
            Upgrade now
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            className="w-full py-2 px-4 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            aria-label="Dismiss paywall and return to input"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
