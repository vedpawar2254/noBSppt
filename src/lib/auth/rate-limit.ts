/**
 * In-memory sliding window rate limiter for auth endpoints.
 *
 * NOTE: Module-level Map is per-process. On single-instance deployments
 * (Railway, single Fly.io machine) this works correctly. For multi-instance
 * or serverless (Vercel), replace with Upstash Redis rate limiter:
 *   https://github.com/upstash/ratelimit
 * The interface below is stable — swap the implementation without changing callers.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5; // per window per IP

interface BucketEntry {
  timestamps: number[]; // epoch ms of each failed attempt
}

const store = new Map<string, BucketEntry>();

// Periodically prune expired entries to avoid memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of Array.from(store.entries())) {
    entry.timestamps = entry.timestamps.filter((t: number) => now - t < WINDOW_MS);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}, WINDOW_MS);

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the oldest attempt falls outside the window */
  retryAfterSeconds?: number;
}

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const entry = store.get(ip) ?? { timestamps: [] };

  // Prune attempts outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);

  if (entry.timestamps.length >= MAX_ATTEMPTS) {
    const oldest = entry.timestamps[0];
    const retryAfterSeconds = Math.ceil((oldest + WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}

export function recordFailedAttempt(ip: string): void {
  const entry = store.get(ip) ?? { timestamps: [] };
  entry.timestamps.push(Date.now());
  store.set(ip, entry);
}

export function resetAttempts(ip: string): void {
  store.delete(ip);
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
