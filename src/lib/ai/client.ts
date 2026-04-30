/**
 * OpenRouter AI client — OpenAI-compatible API, multi-model.
 *
 * Replaces @anthropic-ai/sdk (Story 6.1). Exposes the same `anthropic.messages.create()`
 * interface as the Anthropic SDK so engine.ts requires zero changes.
 *
 * Model: configured via OPENROUTER_MODEL env var (AC2 — model change = env var only).
 * Required headers: HTTP-Referer, X-Title (OpenRouter policy).
 */

// Exported so generate/route.ts can log the actual model used (Story 5.3, AC4)
export const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ?? "anthropic/claude-haiku-4-5-20251001";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://nobsppt.com";

interface MessagesCreateParams {
  model: string; // ignored — OPENROUTER_MODEL env var takes precedence
  max_tokens: number;
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

// Returns Anthropic-SDK-compatible response shape — engine.ts stays unchanged
async function messagesCreate(params: MessagesCreateParams) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY env variable is not set");

  // OpenRouter expects system message as first entry (OpenAI chat format)
  const messages = [
    ...(params.system ? [{ role: "system" as const, content: params.system }] : []),
    ...params.messages,
  ];

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": APP_URL,   // Required by OpenRouter
      "X-Title": "nobsppt",     // Required by OpenRouter
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      max_tokens: params.max_tokens,
      messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "(no body)");
    throw new Error(`OpenRouter API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const text = data.choices?.[0]?.message?.content ?? "";

  // Translate to Anthropic-SDK response shape so engine.ts needs no changes
  return {
    content: [{ type: "text" as const, text }],
    model: OPENROUTER_MODEL,
  };
}

// Same export name as before — engine.ts imports `{ anthropic }` and calls
// `anthropic.messages.create()`. This adapter satisfies that interface exactly.
export const anthropic = {
  messages: {
    create: messagesCreate,
  },
};
