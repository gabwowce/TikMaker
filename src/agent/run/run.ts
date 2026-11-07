import { z } from "zod";
import { ideaFromUser } from "./1-idea";
import { hookFromAi, hookInRun, templateInRun } from "./2-angle";
import { researchInRun, scriptInRun } from "./3-script";
import { blocksInRun } from "./4-blocks";
import { motionInRun } from "./4-motion";
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
  // Why the run stopped, when status is "error" or "paused".
  error: z.string().optional(),
  // "paused": where the run was when the usage limit stopped it.
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
  // 4 Building: the blocks on stage types, then how they move
  // (docs/motion-planas.md)
  blocks: blocksInRun.optional(),
  motion: motionInRun.optional(),
  // 5 Result: the voiceover, when the form asked for it
  voice: voiceInRun.optional(),
  // 7 The conversation: the user's messages and the agent's answers, oldest
  // first (docs/pokalbis-planas.md)
  messages: z.array(chatMessage).optional(),
  // Every call to the model, in order.
  steps: z.array(logEntry),
});

export type AgentRun = z.infer<typeof agentRun>;
