import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  generateText,
  NoObjectGeneratedError,
  Output,
  type LanguageModel,
  type LanguageModelUsage,
} from "ai";
import type { z } from "zod";

// The one place that talks to a language model. Every agent step goes through
// callStructured, so the answer is always checked against a Zod schema and the
// model is chosen in one spot: .env.local switches it without touching code.
//
// AGENT_MODEL    which Gemini model (default: Flash-Lite, the fast, cheap one)
// AGENT_THINKING how much the model "thinks" before answering: minimal | low |
//                medium | high. Thinking tokens are billed but never shown, so
//                the default is minimal. Flash models reject minimal; give them
//                low or leave AGENT_THINKING empty.
type ThinkingLevel = "minimal" | "low" | "medium" | "high";

// The key is read when a model is needed, not when this file loads: the
// server imports this module before server/index.ts has read .env.local.
export function agentModel(): LanguageModel {
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
  return google(process.env.AGENT_MODEL ?? "gemini-flash-lite-latest");
}

function thinkingLevel(): ThinkingLevel | undefined {
  const level = process.env.AGENT_THINKING ?? "minimal";
  return level ? (level as ThinkingLevel) : undefined;
}

export type StructuredResult<T> = {
  data: T;
  usage: TokenCount;
  ms: number;
  attempts: number;
};

// Tokens of every attempt together, the rejected ones too: each was paid for
// (FR-21). cached = input the provider had already seen (cheaper); thinking =
// output the model used to reason (billed, never shown).
export type TokenCount = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
};
function addUsage(total: TokenCount, usage: LanguageModelUsage | undefined) {
  total.inputTokens += usage?.inputTokens ?? 0;
  total.cachedInputTokens += usage?.inputTokenDetails.cacheReadTokens ?? 0;
  total.outputTokens += usage?.outputTokens ?? 0;
  total.thinkingTokens += usage?.outputTokenDetails.reasoningTokens ?? 0;
}
// A reply that does not match the schema is asked for again, up to 3 times in
// all. Network errors are already retried inside generateText (maxRetries), so
// they are not retried here a second time.
const MAX_ATTEMPTS = 3;

export async function callStructured<T>(
  schema: z.ZodType<T>,
  prompt: { system: string; user: string },
  model: LanguageModel = agentModel(),
): Promise<StructuredResult<T>> {
  const level = thinkingLevel();
  const started = Date.now();
  const usage: TokenCount = {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    thinkingTokens: 0,
  };
  for (let attempt = 1; ; attempt++) {
    try {
      const result = await generateText({
        model,
        instructions: prompt.system,
        prompt: prompt.user,
        output: Output.object({ schema }),
        providerOptions: level
          ? { google: { thinkingConfig: { thinkingLevel: level } } }
          : undefined,
      });
      addUsage(usage, result.usage);
      return {
        data: result.output,
        usage,
        ms: Date.now() - started,
        attempts: attempt,
      };
    } catch (error) {
      if (!NoObjectGeneratedError.isInstance(error)) throw error;
      // The model did answer, just not in the right shape: count it.
      addUsage(usage, error.usage);
      if (attempt === MAX_ATTEMPTS) throw error;
    }
  }
}
