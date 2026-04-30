import type { Metadata } from "next";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/guard";
import CheckoutButton from "./CheckoutButton";

export const metadata: Metadata = {
  title: "Upgrade — nobsppt",
  robots: { index: false, follow: false },
};

export default async function UpgradePage() {
  await requireAuth();

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold">Unlock unlimited decks</h1>
          <p className="mt-2 text-sm text-gray-600">
            You&apos;ve used your 3 free decks. Upgrade to keep creating.
          </p>
        </div>

        <div className="border border-gray-200 rounded-xl p-6 space-y-5">
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-semibold">Pro</span>
            <span className="text-2xl font-bold">
              ₹199
              <span className="text-sm font-normal text-gray-500">/mo</span>
            </span>
          </div>

          <ul className="space-y-2.5 text-sm text-gray-700">
            <li className="flex items-center gap-2">
              <span className="text-green-600 font-bold">✓</span>
              Unlimited deck generations — no monthly cap
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-600 font-bold">✓</span>
              Same restraint engine — signal-dense, no filler
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-600 font-bold">✓</span>
              Full deck history and sharing
            </li>
          </ul>

          {/* AC1: opens Razorpay modal — card data never touches nobsppt (NFR7) */}
          <CheckoutButton />
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Payments processed by Razorpay. UPI, cards, netbanking accepted. Cancel anytime.
        </p>

        <div className="mt-6 text-center">
          <Link href="/create" className="text-sm text-gray-500 hover:text-gray-800 underline">
            Back to create
          </Link>
        </div>
      </div>
    </main>
  );
}
