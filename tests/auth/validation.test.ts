import { describe, it, expect } from "vitest";
import {
  isValidEmail,
  isValidPassword,
  validateRegistrationInput,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth/validation";

describe("isValidEmail", () => {
  it("accepts valid emails", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("user+tag@sub.domain.io")).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(isValidEmail("notanemail")).toBe(false);
    expect(isValidEmail("@domain.com")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("isValidPassword", () => {
  it(`accepts passwords >= ${PASSWORD_MIN_LENGTH} chars`, () => {
    expect(isValidPassword("a".repeat(PASSWORD_MIN_LENGTH))).toBe(true);
    expect(isValidPassword("strongpassword123!")).toBe(true);
  });

  it(`rejects passwords < ${PASSWORD_MIN_LENGTH} chars`, () => {
    expect(isValidPassword("short")).toBe(false);
    expect(isValidPassword("")).toBe(false);
    expect(isValidPassword("a".repeat(PASSWORD_MIN_LENGTH - 1))).toBe(false);
  });
});

describe("validateRegistrationInput", () => {
  it("returns valid=true for correct inputs", () => {
    const result = validateRegistrationInput({
      email: "user@example.com",
      password: "securepass",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("returns email error for invalid email (AC4)", () => {
    const result = validateRegistrationInput({ email: "bademail", password: "securepass" });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
    expect(result.errors.password).toBeUndefined();
  });

  it("returns password error for short password (AC4)", () => {
    const result = validateRegistrationInput({ email: "user@example.com", password: "short" });
    expect(result.valid).toBe(false);
    expect(result.errors.password).toBeDefined();
    expect(result.errors.email).toBeUndefined();
  });

  it("returns both errors for empty inputs (AC4)", () => {
    const result = validateRegistrationInput({ email: "", password: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
    expect(result.errors.password).toBeDefined();
  });
});
