import { z } from "zod";

// Where a run is, step by step. awaiting_* = the agent waits for the user;
// the others say what the agent is working on (the panel shows it). Which
// step comes next from each status: server/agent/agent.ts, next. Set
// there, plus "awaiting_answers" when a step asks (server/agent/messages.ts)
// and the way back from it (server/agent/steps/ask.ts).
export const runStatus = z.enum([
  "created", //           1 Idea: Start pressed, nothing done yet
  "picking_template", //  2 Angle: the model picks a template
  "writing_hooks", //     2 Angle: the model writes hooks
  "awaiting_hook", //     2 Angle: WAIT – the user picks a hook
  "writing_script", //    3 Script: the model writes the script
  "awaiting_approval", // 3 Script: WAIT – the user approves or asks for changes
  "laying_out", //        4 Building: scenes and visuals are placed
  "generating_voice", //  5 Result: the voiceover is made (if asked)
  "reviewing", //         5 Result: the agent looks at its frames and fixes them
  "done", //              finished: the project has its scenes
  "answering", //         7 The agent works on the user's message (after the build)
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
