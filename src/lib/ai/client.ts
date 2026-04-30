import Anthropic from "@anthropic-ai/sdk";

// Singleton — one client per process
const globalForAI = globalThis as unknown as { anthropic: Anthropic | undefined };

export const anthropic: Anthropic =
  globalForAI.anthropic ??
  new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

if (process.env.NODE_ENV !== "production") {
  globalForAI.anthropic = anthropic;
}
