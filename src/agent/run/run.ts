import { z } from "zod";
import { ideaFromUser } from "./1-idea";
import { hookFromAi, hookInRun, templateInRun } from "./2-angle";
import { researchInRun, scriptInRun } from "./3-script";
import { codeInRun } from "./4-code";
import { voiceInRun } from "./5-voice";
import { chatMessage } from "./7-chat";
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
  // When the run got its current status (job.save): how long the step being
  // worked on has taken so far, shown on the panel's working line.
  statusAt: z.number().optional(),
  // Why the run stopped, when status is "error" or "paused".
  error: z.string().optional(),
  // "paused" / "awaiting_answers": where the run was when it stopped.
  pausedFrom: runStatus.optional(),

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
  // 4 Building: every scene's picture written as code (docs/tikmaker-kryptis.md)
  code: codeInRun.optional(),
  // 5 Result: the voiceover, when the form asked for it
  voice: voiceInRun.optional(),
  // 7 The conversation: the user's messages and the agent's answers, oldest
  // first (docs/pokalbis-planas.md)
  messages: z.array(chatMessage).optional(),
  // Every call to the model, in order.
  steps: z.array(logEntry),
});

export type AgentRun = z.infer<typeof agentRun>;
