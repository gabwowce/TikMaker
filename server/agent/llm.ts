import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  generateText,
  NoObjectGeneratedError,
  Output,
  type LanguageModel,
  type LanguageModelUsage,
} from "ai";
import { readFileSync } from "node:fs";
import { z } from "zod";
import {
  callClaudeCode,
  callClaudeCodeAgent,
  WrongShapeError,
  type AgentOptions,
} from "./claudeCode.js";
import { claudeModel } from "./models.js";

// The one place that talks to a language model. Every agent step goes through
// here, so the answer is always checked against a Zod schema, a reply of the
// wrong shape is asked for again, every call is logged the same way (FR-21),
// and the model is chosen in one spot: .env.local switches it without
// touching code.
//
//   callStructured   a question → an answer checked against a schema
//   callWithImages   the same, looking at PNG files (the review's frames)
//   callWithSearch   a question answered with a web search, and its sources
//   callAgent        Claude Code as a coding agent with tools (the pictures)
//
// AGENT_PROVIDER claude-code – Claude through the user's own Claude Code
//                subscription (claudeCode.ts); gemini (default) – the Gemini API
// AGENT_MODEL    which Gemini model (default: Flash-Lite, the fast, cheap one)
// AGENT_THINKING how much the model "thinks" before answering: minimal | low |
//                medium | high. Thinking tokens are billed but never shown, so
//                the default is minimal. Flash models reject minimal; give them
//                low or leave AGENT_THINKING empty.
type ThinkingLevel = "minimal" | "low" | "medium" | "high";

const viaClaudeCode = () => process.env.AGENT_PROVIDER === "claude-code";

// The key is read when a model is needed, not when this file loads: the
// server imports this module before server/index.ts has read .env.local.
export function agentModel(): LanguageModel {
  return gemini()(process.env.AGENT_MODEL ?? "gemini-flash-lite-latest");
}
const gemini = () =>
  createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

function geminiOptions() {
  const level = (process.env.AGENT_THINKING ?? "minimal") as ThinkingLevel | "";
  return level
    ? { google: { thinkingConfig: { thinkingLevel: level } } }
    : undefined;
}

// ── What every call returns and logs ───────────────────────────────────────

// What the model is told. `step` – which agent step asks (checkValue,
// writeScript…): it picks the model (models.ts) and names the call.
export type Prompt = { step?: string; system: string; user: string };

export type CallLog = {
  model: string;
  prompt: Prompt;
  attempts: number;
  usage: TokenCount;
  ms: number;
};
export type StructuredResult<T> = CallLog & { data: T };

// A call that gave up – it still says what it sent and what it cost.
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
  // Claude Code's rounds inside one call (none for the Gemini API)
  turns?: number;
};
const noTokens = (): TokenCount => ({
  inputTokens: 0,
  cachedInputTokens: 0,
  outputTokens: 0,
  thinkingTokens: 0,
});
function addTokens(total: TokenCount, more: TokenCount): void {
  total.inputTokens += more.inputTokens;
  total.cachedInputTokens += more.cachedInputTokens;
  total.outputTokens += more.outputTokens;
  total.thinkingTokens += more.thinkingTokens;
  if (more.turns) total.turns = (total.turns ?? 0) + more.turns;
}
// The AI SDK's count (the Gemini API) as ours.
const geminiTokens = (usage: LanguageModelUsage | undefined): TokenCount => ({
  inputTokens: usage?.inputTokens ?? 0,
  cachedInputTokens: usage?.inputTokenDetails.cacheReadTokens ?? 0,
  outputTokens: usage?.outputTokens ?? 0,
  thinkingTokens: usage?.outputTokenDetails.reasoningTokens ?? 0,
});

// ── The one retry loop ─────────────────────────────────────────────────────

// One attempt's answer: the checked data, what it cost, which model gave it.
type Attempt<T> = { data: T; usage: TokenCount; model: string };

// A reply that does not match the schema (WrongShapeError) is asked for
// again, up to `tries` attempts in all; anything else gives up at once
// (network errors are already retried inside the SDK / Claude Code).
async function withRetries<T>(
  prompt: Prompt,
  model: string,
  tries: number,
  attempt: () => Promise<Attempt<T>>,
): Promise<StructuredResult<T>> {
  const started = Date.now();
  const usage = noTokens();
  const log = (attempts: number): CallLog => ({
    model,
    prompt,
    attempts,
    usage,
    ms: Date.now() - started,
  });
  for (let n = 1; ; n++) {
    try {
      const answer = await attempt();
      addTokens(usage, answer.usage);
      model = answer.model;
      return { ...log(n), data: answer.data };
    } catch (error) {
      if (error instanceof WrongShapeError) {
        addTokens(usage, error.usage); // it answered – that was paid for
        if (n < tries) continue;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new StructuredCallError(message, log(n));
    }
  }
}

// ── The calls ──────────────────────────────────────────────────────────────

export async function callStructured<T>(
  schema: z.ZodType<T>,
  prompt: Prompt,
  given?: LanguageModel, // the tests' fake model – always wins
  images: string[] = [], // PNG files the model looks at with the text
): Promise<StructuredResult<T>> {
  if (!given && viaClaudeCode()) return claude(schema, prompt);
  const model = given ?? agentModel();
  const modelId = typeof model === "string" ? model : model.modelId;
  return withRetries(prompt, modelId, 3, async () => {
    try {
      const result = await generateText({
        model,
        instructions: prompt.system,
        ...(images.length
          ? {
              messages: [
                {
                  role: "user" as const,
                  content: [
                    { type: "text" as const, text: prompt.user },
                    ...images.map((file) => ({
                      type: "image" as const,
                      image: readFileSync(file),
                      mediaType: "image/png",
                    })),
                  ],
                },
              ],
            }
          : { prompt: prompt.user }),
        output: Output.object({ schema }),
        providerOptions: geminiOptions(),
      });
      return { data: result.output, usage: geminiTokens(result.usage), model: modelId };
    } catch (error) {
      // The model did answer, just not in the right shape: worth asking again.
      if (NoObjectGeneratedError.isInstance(error))
        throw new WrongShapeError(error.message, {
          ...geminiTokens(error.usage),
          turns: 0, // the Gemini API has no rounds
        });
      throw error;
    }
  });
}

// The same call through Claude Code: the same retries, the same log, so no
// step knows the difference. `tools` – Claude Code tools this call may use
// (WebSearch for research, Read for the review's frames).
function claude<T>(
  schema: z.ZodType<T>,
  prompt: Prompt,
  tools: string[] = [],
): Promise<StructuredResult<T>> {
  return withRetries(prompt, `claude-code:${claudeModel(prompt.step)}`, 3, () =>
    callClaudeCode(schema, prompt, tools),
  );
}

// A call that looks at pictures (the review's frames). Claude Code reads each
// file itself with its Read tool (the prompt lists the paths); the Gemini API
// gets the PNGs attached to the message.
export async function callWithImages<T>(
  schema: z.ZodType<T>,
  prompt: Prompt,
  images: string[],
  given?: LanguageModel,
): Promise<StructuredResult<T>> {
  if (!given && viaClaudeCode()) return claude(schema, prompt, ["Read"]);
  return callStructured(schema, prompt, given, images);
}

// A question answered with a web search: plain text back, and the pages it
// was taken from. The text only ever feeds a later prompt as facts, never the
// run as structure.
export type SearchAnswer = {
  text: string;
  sources: { url: string; title?: string }[];
};
const searchAnswer = z.object({
  text: z.string(),
  sources: z.array(z.object({ url: z.string(), title: z.string().optional() })),
});

export async function callWithSearch(
  prompt: Prompt,
  given?: LanguageModel,
): Promise<StructuredResult<SearchAnswer>> {
  // Claude Code searches with its own WebSearch tool and, unlike Gemini, can
  // keep to a schema in the same call – so the pages come back as a field.
  if (!given && viaClaudeCode())
    return claude(
      searchAnswer,
      {
        ...prompt,
        system: `${prompt.system}\n\nPut your answer in "text" and every page you used in "sources".`,
      },
      ["WebSearch", "WebFetch"],
    );
  // Gemini (Google Search grounding) does not search and keep to a JSON schema
  // in the same call, so its answer is plain text and the sources come apart.
  const model = given ?? agentModel();
  const modelId = typeof model === "string" ? model : model.modelId;
  return withRetries(prompt, modelId, 1, async () => {
    const result = await generateText({
      model,
      instructions: prompt.system,
      prompt: prompt.user,
      tools: { google_search: gemini().tools.googleSearch({}) },
      providerOptions: geminiOptions(),
    });
    const sources = result.sources.flatMap((source) =>
      source.sourceType === "url"
        ? [{ url: source.url, title: source.title }]
        : [],
    );
    return {
      data: { text: result.text.trim(), sources },
      usage: geminiTokens(result.usage),
      model: modelId,
    };
  });
}

// Claude Code as a coding agent (the pictures as code): it works in the
// project's folder with the tools and permission rules it is given, for as
// many rounds as it needs, and ends with a JSON answer checked against the
// schema. One more try only for an answer of the wrong shape – the files are
// written by then, so the second try only answers.
export function callAgent<T>(
  schema: z.ZodType<T>,
  prompt: Prompt,
  options: AgentOptions,
): Promise<StructuredResult<T>> {
  return withRetries(prompt, `claude-code:${claudeModel(prompt.step)}`, 2, () =>
    callClaudeCodeAgent(schema, prompt, options),
  );
}
