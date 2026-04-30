import Razorpay from "razorpay";

// Singleton — hot-reload safe (same pattern as Stripe/DB singletons)
const globalForRazorpay = globalThis as unknown as { razorpay: Razorpay | undefined };

export const razorpay: Razorpay =
  globalForRazorpay.razorpay ??
  new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID ?? "",
    key_secret: process.env.RAZORPAY_KEY_SECRET ?? "",
  });

if (process.env.NODE_ENV !== "production") {
  globalForRazorpay.razorpay = razorpay;
}
