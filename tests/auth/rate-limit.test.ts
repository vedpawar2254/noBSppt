import { describe, it, expect, beforeEach } from "vitest";

// Import fresh module for each describe block by using dynamic imports
// Since the store is module-level, we test via the exported functions directly.
import {
  checkRateLimit,
  recordFailedAttempt,
  resetAttempts,
  getClientIp,
} from "@/lib/auth/rate-limit";

// Use unique IPs per test to avoid cross-contamination from the module-level store
let ipCounter = 1000;
function freshIp() {
  return `172.16.${Math.floor(ipCounter / 255)}.${ipCounter++ % 255}`;
}

describe("checkRateLimit", () => {
  it("allows requests with no prior attempts", () => {
    const result = checkRateLimit(freshIp());
    expect(result.allowed).toBe(true);
  });

  it("allows up to 4 failed attempts", () => {
    const ip = freshIp();
    for (let i = 0; i < 4; i++) recordFailedAttempt(ip);
    expect(checkRateLimit(ip).allowed).toBe(true);
  });

  it("blocks after 5 failed attempts", () => {
    const ip = freshIp();
    for (let i = 0; i < 5; i++) recordFailedAttempt(ip);
    const result = checkRateLimit(ip);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("retryAfterSeconds is capped within 15 minutes", () => {
    const ip = freshIp();
    for (let i = 0; i < 5; i++) recordFailedAttempt(ip);
    const result = checkRateLimit(ip);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(15 * 60);
  });
});

describe("resetAttempts", () => {
  it("allows requests again after reset", () => {
    const ip = freshIp();
    for (let i = 0; i < 5; i++) recordFailedAttempt(ip);
    expect(checkRateLimit(ip).allowed).toBe(false);

    resetAttempts(ip);
    expect(checkRateLimit(ip).allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("extracts first IP from x-forwarded-for", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const req = new Request("http://localhost", {
      headers: { "x-real-ip": "9.9.9.9" },
    });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });

  it("returns 'unknown' when no IP headers present", () => {
    const req = new Request("http://localhost");
    expect(getClientIp(req)).toBe("unknown");
  });
});
