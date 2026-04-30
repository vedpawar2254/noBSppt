import "@testing-library/jest-dom/vitest";

// Set required env vars before any test
process.env.JWT_SECRET = "test-secret-minimum-32-characters-long-xyz";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
// NODE_ENV is set to "test" by Vitest automatically
