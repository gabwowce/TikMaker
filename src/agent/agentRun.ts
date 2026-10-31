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
  videoTemplateId: z.string().min(1).optional(),
});
// 2 Angle — what the model answers: the video template it picked for the
// idea, how well it fits (1–5) and why.
export const templateChoiceSchema = z.object({
  videoTemplateId: z.string().min(1),
  score: z.number().int().min(1).max(5),
  reason: z.string().min(1),
});
// Below this score nothing in the knowledge base really fits the idea (FR-05).
export const MIN_FIT_SCORE = 3;
// The template the run goes on with: the agent's pick, or one the user chose
// instead ("Change"), which has no score or reason of its own.
export const runTemplateSchema = templateChoiceSchema
  .partial({ score: true, reason: true })
  .extend({ pickedBy: z.enum(["agent", "user"]).default("agent") });

// Where the run is. awaiting_* means the agent waits for the user.
export const agentRunStatusSchema = z.enum([
  "created", //           1 Idea: Start pressed, nothing done yet
  "picking_template", //  2 Angle: the model picks a template
  "writing_hooks", //     2 Angle: the model writes hooks
  "awaiting_hook", //     2 Angle: WAIT – the user picks a hook
  "writing_script", //    3 Script: the model writes the script
  "awaiting_approval", // 3 Script: WAIT – the user approves or asks for changes
  "laying_out", //        4 Building: scenes and visuals are placed
  "checking", //          4 Building: design rules are checked and fixed
  "generating_voice", //  5 Result: the voiceover is made (if asked)
  "done", //              finished: the project has its scenes
  "error", //             stopped: run.error says why
  "cancelled", //         the user stopped it
]);

// While the run is in these, the user may swap the template ("Change"):
export const TEMPLATE_CHANGEABLE: AgentRunStatus[] = [
  "writing_hooks",
  "awaiting_hook",
];

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
  template: runTemplateSchema.optional(),
  steps: z.array(agentRunStepSchema),
  createdAt: z.number(),
  error: z.string().optional(),
});
// What agent.start receives: which project, and what the user asked for.
export const agentRunStartSchema = z.object({
  projectId: z.string().min(1),
  input: agentRunInputSchema,
});
// What agent.changeTemplate receives: which run, and the template to go on with.
export const changeTemplateInputSchema = z.object({
  runId: z.string().min(1),
  videoTemplateId: z.string().min(1),
});

export type AgentRunInput = z.infer<typeof agentRunInputSchema>;
export type AgentRunStatus = z.infer<typeof agentRunStatusSchema>;
export type AgentRunStep = z.infer<typeof agentRunStepSchema>;
export type AgentRun = z.infer<typeof agentRunSchema>;
export type TemplateChoice = z.infer<typeof templateChoiceSchema>;
export type RunTemplate = z.infer<typeof runTemplateSchema>;
