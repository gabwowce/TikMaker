import { zodSchema } from "ai";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { z } from "zod";
import type { Prompt } from "./llm.js";
import { claudeModel } from "./models.js";

// A model call through Claude Code on the user's own subscription
// (docs/motion-planas.md, "Sprendimai 2026-11-05"). The server runs
// `claude -p` without a window: no tools, in an empty folder (so it does not
// read the project and CLAUDE.md), with our system prompt and a JSON schema.
// Every call is a new session with no memory: the prompt carries all context.
//
// CLAUDE_CODE_PATH   where the claude binary is (default: ~/.local/bin/claude, or claude.exe on Windows – where the installer puts it)
// AGENT_CLAUDE_MODEL which model: sonnet | opus | haiku (default: sonnet);
//                    a step can have its own (models.ts)

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

// AGENT_CLAUDE_KEEP_ENV=1 keeps those variables (a machine where Claude Code
// itself is set up through them, e.g. a cloud sandbox).
function childEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  if (process.env.AGENT_CLAUDE_KEEP_ENV !== "1")
    for (const name of NOT_SUBSCRIPTION) delete env[name];
  return env;
}

const claudePath = () =>
  process.env.CLAUDE_CODE_PATH ??
  path.join(
    os.homedir(),
    ".local",
    "bin",
    process.platform === "win32" ? "claude.exe" : "claude",
  );

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
      Object.keys(result.modelUsage ?? {})[0] ?? "claude-code",
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
  prompt: Prompt,
  jsonSchema: unknown,
  tools: string[] = [],
): Promise<string> {
  const cwd = agentFolder();
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
    claudeModel(prompt.step),
    "--system-prompt",
    prompt.system,
    "--no-session-persistence",
  ];
  return spawnClaude(args, cwd, prompt.user);
}

// Claude Code as a coding agent (the pictures as code, codeScenes.ts):
// in the project's own folder, with its usual system prompt plus ours, its
// skills (.claude/skills) and the tools it may use – `allow` are permission
// rules (e.g. "Edit(src/generated/p1/**)", "Bash(npx tsc:*)"); anything else
// is refused, as nobody is there to press "allow". Ends with a JSON answer
// checked against the schema.
export type AgentOptions = {
  cwd: string; // the folder it works in
  tools: string[]; // the tools that exist for it
  allow: string[]; // permission rules: what it may do without asking
  timeoutMs?: number; // stopped after this long
};
export async function callClaudeCodeAgent<T>(
  schema: z.ZodType<T>,
  prompt: Prompt,
  options: AgentOptions,
): Promise<ClaudeCodeAnswer<T>> {
  const args = [
    "-p",
    "--output-format",
    "json",
    "--json-schema",
    JSON.stringify(zodSchema(schema).jsonSchema),
    "--tools",
    options.tools.join(","),
    "--allowedTools",
    ...options.allow,
    "--model",
    claudeModel(prompt.step),
    "--append-system-prompt",
    prompt.system,
    "--no-session-persistence",
  ];
  const stdout = await spawnClaude(
    args,
    options.cwd,
    prompt.user,
    options.timeoutMs,
  );
  return readAnswer(stdout, schema);
}

function spawnClaude(
  args: string[],
  cwd: string,
  input: string,
  timeoutMs?: number,
): Promise<string> {
  const env = childEnv();
  return new Promise((resolve, reject) => {
    const child = spawn(claudePath(), args, { cwd, env });
    const timer = timeoutMs
      ? setTimeout(() => {
          child.kill();
          reject(new Error(`Claude Code took longer than ${Math.round(timeoutMs / 60000)} min`));
        }, timeoutMs)
      : undefined;
    child.on("close", () => clearTimeout(timer));
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
    child.stdin.end(input);
  });
}

// A prompt → an answer checked against the Zod schema.
export async function callClaudeCode<T>(
  schema: z.ZodType<T>,
  prompt: Prompt,
  tools: string[] = [],
): Promise<ClaudeCodeAnswer<T>> {
  const stdout = await runClaudeCode(
    prompt,
    zodSchema(schema).jsonSchema,
    tools,
  );
  return readAnswer(stdout, schema);
}
