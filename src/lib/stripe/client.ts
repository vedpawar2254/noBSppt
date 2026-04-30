import Stripe from "stripe";

// Singleton — prevents multiple Stripe clients during Next.js hot reload in dev
const globalForStripe = globalThis as unknown as { stripeClient: Stripe | undefined };

export const stripe =
  globalForStripe.stripeClient ??
  new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-04-22.dahlia",
  });

if (process.env.NODE_ENV !== "production") {
  globalForStripe.stripeClient = stripe;
}
