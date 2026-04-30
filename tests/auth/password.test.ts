import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing (AC2 — bcrypt, no plaintext)", () => {
  it("produces a hash different from plaintext", async () => {
    const plaintext = "supersecret123";
    const hash = await hashPassword(plaintext);
    expect(hash).not.toBe(plaintext);
  });

  it("produces a bcrypt hash (starts with $2)", async () => {
    const hash = await hashPassword("testpassword");
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it("verifies correct password against hash", async () => {
    const plaintext = "correcthorse";
    const hash = await hashPassword(plaintext);
    expect(await verifyPassword(plaintext, hash)).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("rightpassword");
    expect(await verifyPassword("wrongpassword", hash)).toBe(false);
  });

  it("produces different hashes for same input (bcrypt salting)", async () => {
    const hash1 = await hashPassword("same");
    const hash2 = await hashPassword("same");
    expect(hash1).not.toBe(hash2);
  });
});
