import { z } from "zod";
import { ideaFromUser } from "./1-idea";
import { hookFromAi, hookInRun, templateInRun } from "./2-angle";
import { researchInRun, scriptInRun } from "./3-script";
import { layoutInRun } from "./4-building";
import { logEntry } from "./log";
import { runStatus } from "./status";
// One agent run, as saved in db/agent-runs/<id>.json (server/agent/runs.ts):
// the form, where the run is, what each step decided, and the log. Every
// change is written straight away, so a run survives closing the editor or
// restarting the server. Each step's parts live in its own file (1-idea.ts,
// 2-angle.ts, …); this one only puts them together.
export const agentRun = z.object({
  id: z.string(),
  projectId: z.string().min(1),
  createdAt: z.number(),
  status: runStatus,
  // Why the run stopped, when status is "error".
  error: z.string().optional(),

  // 1 Idea
  input: ideaFromUser,
  // 2 Angle
  template: templateInRun.optional(),
  hooks: z.array(hookFromAi).optional(),
  // Which template the hooks were written for: after "Change" they no longer fit.
  hooksFor: z.string().optional(),
  hook: hookInRun.optional(),
  // 3 Script
  research: researchInRun.optional(),
  script: scriptInRun.optional(),
  // 4 Building
  layout: layoutInRun.optional(),
  // Every call to the model, in order.
  steps: z.array(logEntry),
});

export type AgentRun = z.infer<typeof agentRun>;
