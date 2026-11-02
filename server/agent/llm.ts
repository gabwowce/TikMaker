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

export type CallLog = {
  model: string;
  prompt: { system: string; user: string };
  attempts: number;
  usage: TokenCount;
  ms: number;
};
export type StructuredResult<T> = CallLog & { data: T };

export class StructuredCallError extends Error {
  log: CallLog;
  constructor(message: string, log: CallLog) {
    super(message);
    this.log = log;
  }
}

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
  const modelId = typeof model === "string" ? model : model.modelId;
  const usage: TokenCount = {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    thinkingTokens: 0,
  };
  const log = (attempts: number): CallLog => ({
    model: modelId,
    prompt,
    attempts,
    usage,
    ms: Date.now() - started,
  });
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
      return { ...log(attempt), data: result.output };
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        // The model did answer, just not in the right shape: count it.
        addUsage(usage, error.usage);
        if (attempt < MAX_ATTEMPTS) continue;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new StructuredCallError(message, log(attempt));
    }
  }
}

// A question answered with Google Search (Gemini's search grounding): plain
// text back, and the pages it was taken from. Not checked against a schema –
// Gemini does not search and keep to a JSON schema in the same call – so the
// text only ever feeds a later prompt as facts, never the run as structure.
export type SearchAnswer = {
  text: string;
  sources: { url: string; title?: string }[];
};

export async function callWithSearch(
  prompt: { system: string; user: string },
  model: LanguageModel = agentModel(),
): Promise<StructuredResult<SearchAnswer>> {
  const started = Date.now();
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
  const usage: TokenCount = {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    thinkingTokens: 0,
  };
  const level = thinkingLevel();
  const log = (): CallLog => ({
    model: typeof model === "string" ? model : model.modelId,
    prompt,
    attempts: 1,
    usage,
    ms: Date.now() - started,
  });
  try {
    const result = await generateText({
      model,
      instructions: prompt.system,
      prompt: prompt.user,
      tools: { google_search: google.tools.googleSearch({}) },
      providerOptions: level
        ? { google: { thinkingConfig: { thinkingLevel: level } } }
        : undefined,
    });
    addUsage(usage, result.usage);
    const sources = result.sources.flatMap((source) =>
      source.sourceType === "url"
        ? [{ url: source.url, title: source.title }]
        : [],
    );
    return { ...log(), data: { text: result.text.trim(), sources } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new StructuredCallError(message, log());
  }
}
