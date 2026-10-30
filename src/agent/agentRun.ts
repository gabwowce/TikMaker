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
  // Someone appears on camera; off = a faceless video, so the agent never
  // proposes a talking head (docs/bd/sprendimai.md).
  withFace: z.boolean().default(false),
  generateVoice: z.boolean().default(false),
});
// 2 Angle — the video template the agent picked for the idea, how well it
// fits (1–5) and why. Below 3 nothing in the knowledge base really fits
// (FR-05). The user may swap it for another template.
export const templateChoiceSchema = z.object({
  videoTemplateId: z.string().min(1),
  score: z.number().int().min(1).max(5),
  reason: z.string().min(1),
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
  projectId: z.string().min(1),
  input: agentRunInputSchema,
  status: agentRunStatusSchema,
  template: templateChoiceSchema.optional(),
  steps: z.array(agentRunStepSchema),
  createdAt: z.number(),
  error: z.string().optional(),
});
// What agent.start receives: which project, and what the user asked for.
export const agentRunStartSchema = z.object({
  projectId: z.string().min(1),
  input: agentRunInputSchema,
});

export type AgentRunInput = z.infer<typeof agentRunInputSchema>;
export type AgentRunStatus = z.infer<typeof agentRunStatusSchema>;
export type AgentRunStep = z.infer<typeof agentRunStepSchema>;
export type AgentRun = z.infer<typeof agentRunSchema>;
export type TemplateChoice = z.infer<typeof templateChoiceSchema>;
