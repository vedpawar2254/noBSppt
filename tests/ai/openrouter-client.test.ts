import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";

// Stub env vars before module is loaded — vitest processes these before hoisted imports
// when using vi.stubEnv in beforeAll with vi.resetModules
const TEST_API_KEY = "sk-or-test-key";
const TEST_MODEL = "anthropic/claude-haiku-4-5-20251001";
const TEST_APP_URL = "https://nobsppt.test";

// We import dynamically inside tests after setting env via vi.stubEnv
// to work around module-level constant evaluation of OPENROUTER_MODEL

describe("OpenRouter AI client (Story 6.1)", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let anthropicClient: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let openrouterModel: any;

  beforeAll(async () => {
    vi.stubEnv("OPENROUTER_API_KEY", TEST_API_KEY);
    vi.stubEnv("OPENROUTER_MODEL", TEST_MODEL);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", TEST_APP_URL);

    // Reset modules so OPENROUTER_MODEL constant is re-evaluated with new env
    vi.resetModules();
    const mod = await import("@/lib/ai/client");
    anthropicClient = mod.anthropic;
    openrouterModel = mod.OPENROUTER_MODEL;
  });

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const MOCK_SLIDES_JSON = JSON.stringify([
    { title: "Slide One", bullets: ["Point A", "Point B"] },
  ]);

  function makeSuccessResponse(content: string) {
    return {
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content } }] }),
      text: () => Promise.resolve(content),
    };
  }

  function makeErrorResponse(status: number, body: string) {
    return { ok: false, status, text: () => Promise.resolve(body) };
  }

  it("calls OpenRouter API with correct URL and required headers (AC1)", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(makeSuccessResponse(MOCK_SLIDES_JSON) as unknown as Response);

    await anthropicClient.messages.create({
      model: "ignored",
      max_tokens: 2048,
      system: "System prompt.",
      messages: [{ role: "user", content: "Input" }],
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;

    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(headers["Authorization"]).toBe(`Bearer ${TEST_API_KEY}`);
    expect(headers["HTTP-Referer"]).toBe(TEST_APP_URL);
    expect(headers["X-Title"]).toBe("nobsppt");
  });

  it("places system message first in OpenAI chat format (AC1)", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(makeSuccessResponse(MOCK_SLIDES_JSON) as unknown as Response);

    await anthropicClient.messages.create({
      model: "any",
      max_tokens: 512,
      system: "System instructions.",
      messages: [{ role: "user", content: "User input" }],
    });

    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.messages[0]).toEqual({ role: "system", content: "System instructions." });
    expect(body.messages[1]).toEqual({ role: "user", content: "User input" });
  });

  it("uses OPENROUTER_MODEL env var, ignores params.model (AC2)", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(makeSuccessResponse(MOCK_SLIDES_JSON) as unknown as Response);

    await anthropicClient.messages.create({
      model: "should-be-ignored",
      max_tokens: 512,
      messages: [{ role: "user", content: "x" }],
    });

    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.model).toBe(openrouterModel);
    expect(body.model).toBe(TEST_MODEL);
    expect(body.model).not.toBe("should-be-ignored");
  });

  it("returns Anthropic-SDK-compatible { content: [{type:'text', text}] } shape (AC1)", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(makeSuccessResponse(MOCK_SLIDES_JSON) as unknown as Response);

    const result = await anthropicClient.messages.create({
      model: "any",
      max_tokens: 512,
      messages: [{ role: "user", content: "x" }],
    });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toBe(MOCK_SLIDES_JSON);
  });

  it("throws on non-ok response with status code in message (AC3)", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(makeErrorResponse(502, "Bad Gateway") as unknown as Response);

    await expect(
      anthropicClient.messages.create({
        model: "any",
        max_tokens: 512,
        messages: [{ role: "user", content: "x" }],
      })
    ).rejects.toThrow("OpenRouter API error 502");
  });
});
