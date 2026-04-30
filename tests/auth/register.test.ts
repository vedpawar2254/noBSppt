import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock DB module before importing the route handler
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

// Mock session module to avoid next/headers in test env
vi.mock("@/lib/auth/session", () => ({
  createSessionToken: vi.fn().mockResolvedValue("mock-jwt-token"),
  setSessionCookie: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "@/app/api/auth/register/route";
import { db } from "@/lib/db";

const mockDb = vi.mocked(db);

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Helper to set up the DB mock chain for "no existing user" scenario
function mockNoExistingUser() {
  const selectMock = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  };
  mockDb.select = vi.fn().mockReturnValue(selectMock);
  return selectMock;
}

// Helper to set up the DB mock chain for "existing user" scenario
function mockExistingUser() {
  const selectMock = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ id: "existing-id" }]),
  };
  mockDb.select = vi.fn().mockReturnValue(selectMock);
  return selectMock;
}

// Helper to set up insert mock
function mockInsert(userId = "new-uuid-123", email = "user@example.com") {
  const insertMock = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: userId, email }]),
  };
  mockDb.insert = vi.fn().mockReturnValue(insertMock);
  return insertMock;
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AC1 — happy path
  it("creates account and returns 201 for valid input", async () => {
    mockNoExistingUser();
    mockInsert();

    const res = await POST(makeRequest({ email: "user@example.com", password: "securepass" }));

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.userId).toBe("new-uuid-123");
  });

  // AC2 — bcrypt (tested directly in password.test.ts; here we verify no plaintext stored)
  it("does not store the raw password (AC2)", async () => {
    mockNoExistingUser();
    const insertMock = mockInsert();

    await POST(makeRequest({ email: "user@example.com", password: "plaintextpassword" }));

    const valuesCall = insertMock.values.mock.calls[0][0];
    expect(valuesCall.passwordHash).toBeDefined();
    expect(valuesCall.passwordHash).not.toBe("plaintextpassword");
    // bcrypt hash starts with $2
    expect(valuesCall.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  // AC3 — duplicate email
  it("returns 409 with clear error for duplicate email (AC3)", async () => {
    mockExistingUser();

    const res = await POST(makeRequest({ email: "taken@example.com", password: "securepass" }));

    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.errors.email).toMatch(/already exists/i);
  });

  // AC4 — invalid email format
  it("returns 422 for invalid email format (AC4)", async () => {
    const res = await POST(makeRequest({ email: "notanemail", password: "securepass" }));

    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.errors.email).toBeDefined();
  });

  // AC4 — password too short
  it("returns 422 for password below minimum length (AC4)", async () => {
    const res = await POST(makeRequest({ email: "user@example.com", password: "short" }));

    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.errors.password).toBeDefined();
  });

  // AC4 — both fields invalid
  it("returns 422 with both errors when email and password are invalid (AC4)", async () => {
    const res = await POST(makeRequest({ email: "", password: "" }));

    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.errors.email).toBeDefined();
    expect(data.errors.password).toBeDefined();
  });

  it("returns 400 for malformed request body", async () => {
    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("normalizes email to lowercase before storage", async () => {
    mockNoExistingUser();
    const insertMock = mockInsert("some-id", "user@example.com");

    await POST(makeRequest({ email: "User@EXAMPLE.COM", password: "securepass" }));

    const valuesCall = insertMock.values.mock.calls[0][0];
    expect(valuesCall.email).toBe("user@example.com");
  });
});
