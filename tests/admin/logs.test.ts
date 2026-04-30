import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/admin-guard", () => ({
  getAdminSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { select: vi.fn() },
}));

import { GET as GetLogs } from "@/app/api/admin/logs/route";
import { GET as GetLogDetail } from "@/app/api/admin/logs/[id]/route";
import { getAdminSession } from "@/lib/auth/admin-guard";
import { db } from "@/lib/db";

const mockGetAdminSession = vi.mocked(getAdminSession);
const mockDb = vi.mocked(db);

const ADMIN_SESSION = { userId: "admin-uuid", email: "admin@example.com" };

// Use explicit type so nullable fields are allowed
type TestLog = {
  id: string;
  userId: string;
  deckId: string | null;
  inputText?: string;
  inputMode: string;
  status: string;
  errorMessage: string | null;
  aiProvider: string;
  modelUsed: string;
  latencyMs: number | null;
  createdAt: Date;
  userEmail: string;
};

const SAMPLE_LOG: TestLog = {
  id: "log-uuid-1",
  userId: "user-uuid",
  deckId: "deck-uuid",
  inputMode: "text",
  status: "success",
  errorMessage: null,
  aiProvider: "anthropic",
  modelUsed: "claude-haiku-4-5-20251001",
  latencyMs: 4200,
  createdAt: new Date("2026-04-30T12:00:00Z"),
  userEmail: "user@example.com",
};

const FAILURE_LOG: TestLog = {
  ...SAMPLE_LOG,
  id: "log-uuid-2",
  deckId: null,
  status: "failure",
  errorMessage: "AI API timeout after 30000ms",
  latencyMs: null,
};

function makeReq(path: string, params?: Record<string, string>) {
  const url = new URL(`http://localhost${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString(), { method: "GET" });
}

/** Mock the chained select query that returns a logs list + a count */
function mockLogsQuery(logs: TestLog[], total = logs.length) {
  // Promise.all calls db.select twice — once for data, once for count
  const dataChain = {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue(logs),
  };
  const countChain = {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([{ total }]),
  };
  mockDb.select = vi.fn()
    .mockReturnValueOnce(dataChain)
    .mockReturnValueOnce(countChain);
  return { dataChain, countChain };
}

/** Mock the chained select query for a single log (detail route) */
function mockDetailQuery(log: TestLog | null) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(log ? [log] : []),
  };
  mockDb.select = vi.fn().mockReturnValue(chain);
  return chain;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/logs
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/admin/logs", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 401 when not authenticated", async () => {
    mockGetAdminSession.mockResolvedValue({ session: null, status: 401 });
    const res = await GetLogs(makeReq("/api/admin/logs"));
    expect(res.status).toBe(401);
  });

  it("returns 403 when authenticated but not admin", async () => {
    mockGetAdminSession.mockResolvedValue({ session: null, status: 403 });
    const res = await GetLogs(makeReq("/api/admin/logs"));
    expect(res.status).toBe(403);
  });

  it("returns 200 with paginated log list for admin (AC1)", async () => {
    mockGetAdminSession.mockResolvedValue({ session: ADMIN_SESSION, status: "ok" });
    mockLogsQuery([SAMPLE_LOG, FAILURE_LOG], 2);

    const res = await GetLogs(makeReq("/api/admin/logs"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.logs).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.page).toBe(1);
    expect(body.totalPages).toBe(1);
  });

  it("each log entry includes timestamp, user email, status, and latency (AC1)", async () => {
    mockGetAdminSession.mockResolvedValue({ session: ADMIN_SESSION, status: "ok" });
    mockLogsQuery([SAMPLE_LOG]);

    const res = await GetLogs(makeReq("/api/admin/logs"));
    const { logs } = await res.json();
    const log = logs[0];

    expect(log.status).toBe("success");
    expect(log.userEmail).toBe("user@example.com");
    expect(log.latencyMs).toBe(4200);
    expect(log.createdAt).toBeDefined();
  });

  it("failure log entry includes error message (AC2)", async () => {
    mockGetAdminSession.mockResolvedValue({ session: ADMIN_SESSION, status: "ok" });
    mockLogsQuery([FAILURE_LOG]);

    const res = await GetLogs(makeReq("/api/admin/logs"));
    const { logs } = await res.json();

    expect(logs[0].status).toBe("failure");
    expect(logs[0].errorMessage).toBe("AI API timeout after 30000ms");
  });

  it("applies status filter — success only (AC1)", async () => {
    mockGetAdminSession.mockResolvedValue({ session: ADMIN_SESSION, status: "ok" });
    const { dataChain } = mockLogsQuery([SAMPLE_LOG], 1);

    await GetLogs(makeReq("/api/admin/logs", { status: "success" }));

    // where() is called — filter was applied
    expect(dataChain.where).toHaveBeenCalled();
  });

  it("applies status filter — failure only (AC1)", async () => {
    mockGetAdminSession.mockResolvedValue({ session: ADMIN_SESSION, status: "ok" });
    const { dataChain } = mockLogsQuery([FAILURE_LOG], 1);

    await GetLogs(makeReq("/api/admin/logs", { status: "failure" }));

    expect(dataChain.where).toHaveBeenCalled();
  });

  it("ignores unknown status filter values (AC1)", async () => {
    mockGetAdminSession.mockResolvedValue({ session: ADMIN_SESSION, status: "ok" });
    mockLogsQuery([SAMPLE_LOG, FAILURE_LOG], 2);

    // "pending" is not a valid status — should be ignored, return all
    const res = await GetLogs(makeReq("/api/admin/logs", { status: "pending" }));
    expect(res.status).toBe(200);
  });

  it("returns correct totalPages for pagination (AC1)", async () => {
    mockGetAdminSession.mockResolvedValue({ session: ADMIN_SESSION, status: "ok" });
    mockLogsQuery(Array(20).fill(SAMPLE_LOG), 45); // 45 total, 20 per page → 3 pages

    const res = await GetLogs(makeReq("/api/admin/logs"));
    const body = await res.json();

    expect(body.total).toBe(45);
    expect(body.totalPages).toBe(3);
  });

  it("returns empty logs array when no results match filter (AC1)", async () => {
    mockGetAdminSession.mockResolvedValue({ session: ADMIN_SESSION, status: "ok" });
    mockLogsQuery([], 0);

    const res = await GetLogs(makeReq("/api/admin/logs", { email: "nonexistent@example.com" }));
    const body = await res.json();

    expect(body.logs).toHaveLength(0);
    expect(body.total).toBe(0);
    expect(body.totalPages).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/logs/:id
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/admin/logs/:id", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  function makeDetailReq(id: string) {
    return makeReq(`/api/admin/logs/${id}`);
  }

  it("returns 401 when not authenticated", async () => {
    mockGetAdminSession.mockResolvedValue({ session: null, status: 401 });
    const res = await GetLogDetail(makeDetailReq("log-uuid-1"), { params: { id: "log-uuid-1" } });
    expect(res.status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    mockGetAdminSession.mockResolvedValue({ session: null, status: 403 });
    const res = await GetLogDetail(makeDetailReq("log-uuid-1"), { params: { id: "log-uuid-1" } });
    expect(res.status).toBe(403);
  });

  it("returns 404 for unknown log ID (AC1)", async () => {
    mockGetAdminSession.mockResolvedValue({ session: ADMIN_SESSION, status: "ok" });
    mockDetailQuery(null);

    const res = await GetLogDetail(makeDetailReq("unknown-id"), { params: { id: "unknown-id" } });
    expect(res.status).toBe(404);
  });

  it("returns full log entry for success case (AC3)", async () => {
    mockGetAdminSession.mockResolvedValue({ session: ADMIN_SESSION, status: "ok" });
    mockDetailQuery(SAMPLE_LOG);

    const res = await GetLogDetail(makeDetailReq("log-uuid-1"), { params: { id: "log-uuid-1" } });

    expect(res.status).toBe(200);
    const { log } = await res.json();
    expect(log.id).toBe("log-uuid-1");
    expect(log.status).toBe("success");
    expect(log.deckId).toBe("deck-uuid");
    expect(log.userEmail).toBe("user@example.com");
    expect(log.latencyMs).toBe(4200);
    expect(log.aiProvider).toBe("anthropic");
    expect(log.modelUsed).toBe("claude-haiku-4-5-20251001");
  });

  it("returns error message for failure log (AC2)", async () => {
    mockGetAdminSession.mockResolvedValue({ session: ADMIN_SESSION, status: "ok" });
    mockDetailQuery(FAILURE_LOG);

    const res = await GetLogDetail(makeDetailReq("log-uuid-2"), { params: { id: "log-uuid-2" } });

    expect(res.status).toBe(200);
    const { log } = await res.json();
    expect(log.status).toBe("failure");
    expect(log.errorMessage).toBe("AI API timeout after 30000ms");
    expect(log.deckId).toBeNull();
  });

  it("log includes inputText for output quality review (AC3)", async () => {
    mockGetAdminSession.mockResolvedValue({ session: ADMIN_SESSION, status: "ok" });
    const logWithInput = { ...SAMPLE_LOG, inputText: "My presentation notes about quarterly results" };
    mockDetailQuery(logWithInput);

    const res = await GetLogDetail(makeDetailReq("log-uuid-1"), { params: { id: "log-uuid-1" } });
    const { log } = await res.json();

    expect(log.inputText).toBe("My presentation notes about quarterly results");
  });
});
