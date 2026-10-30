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
  usage: LanguageModelUsage;
  ms: number;
  attempts: number;
};

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
      return {
        data: result.output,
        usage: result.usage,
        ms: Date.now() - started,
        attempts: attempt,
      };
    } catch (error) {
      if (!NoObjectGeneratedError.isInstance(error) || attempt === MAX_ATTEMPTS)
        throw error;
    }
  }
}
