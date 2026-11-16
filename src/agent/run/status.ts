import { z } from "zod";

// Where a run is, step by step (the steps: server/agent/steps/, 1–7).
// awaiting_* = the agent waits for the user. Statuses change only in
// server/agent/agent.ts. The values are saved in the runs' files
// (db/agent-runs), so an old name stays even where the step was renamed.
export const runStatus = z.enum([
  "created", //           1 Idea: Start pressed, nothing done yet
  "picking_template", //  2 Angle: the value check, then the template
  "writing_hooks", //     2 Angle: the model writes hooks
  "awaiting_hook", //     2 Angle: WAIT – the user picks a hook
  "writing_script", //    3 Script: the model writes the script, code checks it
  "awaiting_approval", // 3 Script: WAIT – the user approves or asks for changes
  "generating_voice", //  4 Voice: the voiceover is made (if asked)
  "laying_out", //        5 Pictures: Claude Code writes every scene as code
  "reviewing", //         6 Self-review: the agent looks at its frames, fixes them
  "done", //              finished: the project has its scenes
  "answering", //         7 Chat: the agent works on the user's message (after the build)
  "awaiting_answers", //  WAIT – the agent asked the creator something it does not
  //                      know (a step's questions); pausedFrom – the step asking
  "paused", //            stopped at the model's usage limit: run.error says
  //                      when it resets; "Continue" goes on from pausedFrom
  "error", //             stopped: run.error says why
  "cancelled", //         the user stopped it
]);

export type RunStatus = z.infer<typeof runStatus>;

// Statuses where nobody is working on the run: the agent waits for the user,
// or the run has ended. Every other status has a worker busy on it.
export const RESTING_STATUSES: RunStatus[] = [
  "awaiting_hook",
  "awaiting_approval",
  "awaiting_answers",
  "done",
  "paused",
  "error",
  "cancelled",
];
