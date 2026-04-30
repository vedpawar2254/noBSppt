import "@testing-library/jest-dom/vitest";

// Set required env vars before any test
process.env.JWT_SECRET = "test-secret-minimum-32-characters-long-xyz";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
// NODE_ENV is set to "test" by Vitest automatically

// Story 6.5: Use 4 bcrypt rounds in tests to avoid ~300ms per hash delay.
// Production uses 12 (set via BCRYPT_ROUNDS env var; see src/lib/auth/password.ts).
process.env.BCRYPT_ROUNDS = "4";

// Prevent Razorpay client from throwing at module load time (key_id mandatory).
// Tests that exercise Razorpay mock the client — these are dummy values only.
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID ?? "dummy-for-tests";
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "dummy-for-tests";
process.env.RAZORPAY_PLAN_ID = process.env.RAZORPAY_PLAN_ID ?? "dummy-plan-for-tests";
