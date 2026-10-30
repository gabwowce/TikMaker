import { z } from "zod";

// One agent run: what the user asked for, where the run is now, and a log of
// every step it took. Saved as db/agent-runs/<id>.json (server/agent/runs.ts),
// so a run survives closing the editor or restarting the server.

// What the user fills in before pressing Start (FR-03).
export const agentRunInputSchema = z.object({
  idea: z.string().trim().min(20).max(500),
  workspaceId: z.string().min(1),
  targetSeconds: z.number().int().min(15).max(90).default(40),
  motionOnly: z.boolean().default(false),
  generateVoice: z.boolean().default(false),
});

// Where the run is. awaiting_* means the agent waits for the user.
export const agentRunStatusSchema = z.enum([
  "created",
  "picking_template",
  "writing_hooks",
  "awaiting_hook",
  "writing_script",
  "awaiting_approval",
  "laying_out",
  "checking",
  "generating_voice",
  "done",
  "error",
  "cancelled",
]);

// One entry in the run's log: what happened, how long it took and what it
// cost in tokens (FR-21).
export const agentRunStepSchema = z.object({
  name: z.string(),
  startedAt: z.number(),
  ms: z.number().optional(),
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
  output: z.unknown().optional(),
  error: z.string().optional(),
});

export const agentRunSchema = z.object({
  id: z.string(),
  input: agentRunInputSchema,
  status: agentRunStatusSchema,
  steps: z.array(agentRunStepSchema),
  createdAt: z.number(),
  error: z.string().optional(),
});

export type AgentRunInput = z.infer<typeof agentRunInputSchema>;
export type AgentRunStatus = z.infer<typeof agentRunStatusSchema>;
export type AgentRunStep = z.infer<typeof agentRunStepSchema>;
export type AgentRun = z.infer<typeof agentRunSchema>;
