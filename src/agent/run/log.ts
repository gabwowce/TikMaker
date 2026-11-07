import { z } from "zod";

// One entry in the run's log (steps[]): one call to the model – what was
// sent, what came back, how long it took and what it cost (FR-21). Written by
// job.ai in server/agent/job.ts.
export const logEntry = z.object({
  name: z.string(),
  startedAt: z.number(),
  ms: z.number().optional(),
  // Which model answered and how many tries it took (a reply in the wrong
  // shape is asked for again).
  model: z.string().optional(),
  attempts: z.number().optional(),
  // What was sent: the step's input, exactly as the model got it.
  prompt: z.object({ system: z.string(), user: z.string() }).optional(),
  inputTokens: z.number().optional(),
  cachedInputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
  thinkingTokens: z.number().optional(),
  // Claude Code: rounds the call took (each sends the whole prompt again)
  turns: z.number().optional(),
  output: z.unknown().optional(),
  error: z.string().optional(),
});

export type LogEntry = z.infer<typeof logEntry>;
