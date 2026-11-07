import { zodSchema } from "ai";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { z } from "zod";

// A model call through Claude Code on the user's own subscription
// (docs/motion-planas.md, "Sprendimai 2026-11-05"). The server runs
// `claude -p` without a window: no tools, in an empty folder (so it does not
// read the project and CLAUDE.md), with our system prompt and a JSON schema.
// Every call is a new session with no memory: the prompt carries all context.
//
// CLAUDE_CODE_PATH   where claude.exe is (default: where the installer puts it)
// AGENT_CLAUDE_MODEL which model: sonnet | opus | haiku (default: sonnet)

// What one call returns: the checked answer and what it cost.
export type ClaudeCodeAnswer<T> = {
  data: T;
  model: string;
  usage: {
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    thinkingTokens: number;
    // How many rounds the session took: with a JSON schema Claude Code may
    // need more than one to give a valid answer, and every round sends the
    // whole prompt again – which is what makes a call cost several times its
    // prompt.
    turns: number;
  };
};

// Variables that would send `claude -p` past the subscription (an API key,
// another address, Bedrock / Vertex / Foundry) – the child process gets none.
const NOT_SUBSCRIPTION = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_BASE_URL",
  "CLAUDE_CODE_USE_BEDROCK",
  "CLAUDE_CODE_USE_VERTEX",
  "CLAUDE_CODE_USE_FOUNDRY",
];

const claudePath = () =>
  process.env.CLAUDE_CODE_PATH ??
  path.join(os.homedir(), ".local", "bin", "claude.exe");
export const claudeModel = () => process.env.AGENT_CLAUDE_MODEL ?? "sonnet";

// Claude Code's answer (stdout) → checked data. Kept apart from running it,
// so it can be tested without a real call.
export function readAnswer<T>(
  stdout: string,
  schema: z.ZodType<T>,
): ClaudeCodeAnswer<T> {
  let result: {
    is_error?: boolean;
    num_turns?: number;
    result?: string;
    structured_output?: unknown;
    modelUsage?: Record<string, unknown>;
    usage?: {
      input_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
      output_tokens?: number;
      output_tokens_details?: { thinking_tokens?: number };
    };
  };
  try {
    result = JSON.parse(stdout);
  } catch {
    throw new Error(
      `Claude Code did not answer with JSON: ${stdout.slice(0, 200)}`,
    );
  }
  if (result.is_error)
    throw new Error(`Claude Code: ${result.result ?? "unknown error"}`);
  const usage = result.usage ?? {};
  const answer = {
    model:
      Object.keys(result.modelUsage ?? {})[0] ?? `claude-code:${claudeModel()}`,
    usage: {
      inputTokens:
        (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0),
      cachedInputTokens: usage.cache_read_input_tokens ?? 0,
      outputTokens: usage.output_tokens ?? 0,
      thinkingTokens: usage.output_tokens_details?.thinking_tokens ?? 0,
      turns: result.num_turns ?? 1,
    },
  };
  if (result.structured_output === undefined)
    throw new WrongShapeError(
      "Claude Code gave no structured output",
      answer.usage,
    );
  const parsed = schema.safeParse(result.structured_output);
  if (!parsed.success)
    throw new WrongShapeError(
      `Claude Code's answer does not match the schema: ${parsed.error.message}`,
      answer.usage,
    );
  return { ...answer, data: parsed.data };
}

// The model answered, but not in the right shape – worth asking again.
export class WrongShapeError extends Error {
  usage: ClaudeCodeAnswer<unknown>["usage"];
  constructor(message: string, usage: ClaudeCodeAnswer<unknown>["usage"]) {
    super(message);
    this.usage = usage;
  }
}

// One `claude -p` run; the prompt goes in through stdin (long text and quotes
// on a Windows command line break). `tools` – the Claude Code tools this call
// may use (e.g. WebSearch for research); none by default.
// The empty folder every call runs in. Files a call must read (the review's
// frames) are put inside it: Claude Code reads freely only in its own folder.
export function agentFolder(): string {
  const cwd = path.join(os.tmpdir(), "tikmaker-agent");
  mkdirSync(cwd, { recursive: true });
  return cwd;
}

export function runClaudeCode(
  prompt: { system: string; user: string },
  jsonSchema: unknown,
  tools: string[] = [],
  // a model for this call only (e.g. "sonnet" for the cheap message router);
  // unset – AGENT_CLAUDE_MODEL
  model?: string,
): Promise<string> {
  const cwd = agentFolder();
  const env = { ...process.env };
  for (const name of NOT_SUBSCRIPTION) delete env[name];
  const args = [
    "-p",
    "--output-format",
    "json",
    "--json-schema",
    JSON.stringify(jsonSchema),
    // Which tools exist, and the same ones without asking (with no window
    // there is nobody to press "allow").
    "--tools",
    tools.join(","),
    ...(tools.length ? ["--allowedTools", tools.join(",")] : []),
    "--model",
    model ?? claudeModel(),
    "--system-prompt",
    prompt.system,
    "--no-session-persistence",
  ];
  return new Promise((resolve, reject) => {
    const child = spawn(claudePath(), args, { cwd, env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", (error) =>
      reject(
        new Error(
          `Claude Code could not start (${claudePath()}): ${error.message}`,
        ),
      ),
    );
    // An error inside the run (e.g. not logged in) comes on stdout, so it is
    // returned even with a non-zero exit code; readAnswer recognises it.
    child.on("close", (code) =>
      stdout.trim()
        ? resolve(stdout)
        : reject(new Error(`Claude Code stopped (${code}): ${stderr.trim()}`)),
    );
    child.stdin.end(prompt.user);
  });
}

// A prompt → an answer checked against the Zod schema.
export async function callClaudeCode<T>(
  schema: z.ZodType<T>,
  prompt: { system: string; user: string },
  tools: string[] = [],
  model?: string,
): Promise<ClaudeCodeAnswer<T>> {
  const stdout = await runClaudeCode(
    prompt,
    zodSchema(schema).jsonSchema,
    tools,
    model,
  );
  return readAnswer(stdout, schema);
}
