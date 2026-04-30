import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { select: vi.fn() },
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

import { getAdminSession } from "@/lib/auth/admin-guard";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

const mockDb = vi.mocked(db);
const mockGetSession = vi.mocked(getSession);

function mockUserRole(role: "user" | "admin" | null) {
  if (role === null) {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    mockDb.select = vi.fn().mockReturnValue(chain);
  } else {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ role }]),
    };
    mockDb.select = vi.fn().mockReturnValue(chain);
  }
}

describe("getAdminSession", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns status 401 when no session", async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await getAdminSession();
    expect(result.status).toBe(401);
    expect(result.session).toBeNull();
  });

  it("returns status 403 when user has role 'user'", async () => {
    mockGetSession.mockResolvedValue({ userId: "user-uuid", email: "user@example.com" });
    mockUserRole("user");
    const result = await getAdminSession();
    expect(result.status).toBe(403);
    expect(result.session).toBeNull();
  });

  it("returns status 403 when user not found in DB", async () => {
    mockGetSession.mockResolvedValue({ userId: "ghost-uuid", email: "ghost@example.com" });
    mockUserRole(null);
    const result = await getAdminSession();
    expect(result.status).toBe(403);
  });

  it("returns status 'ok' with session when user has role 'admin'", async () => {
    const SESSION = { userId: "admin-uuid", email: "admin@example.com" };
    mockGetSession.mockResolvedValue(SESSION);
    mockUserRole("admin");
    const result = await getAdminSession();
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.session.userId).toBe("admin-uuid");
    }
  });
});
