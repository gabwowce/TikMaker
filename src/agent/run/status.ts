import { z } from "zod";

// Where a run is, step by step. awaiting_* = the agent waits for the user.
// Statuses change only in server/agent/agent.ts.
export const runStatus = z.enum([
  "created", //           1 Idea: Start pressed, nothing done yet
  "picking_template", //  2 Angle: the model picks a template
  "writing_hooks", //     2 Angle: the model writes hooks
  "awaiting_hook", //     2 Angle: WAIT – the user picks a hook
  "writing_script", //    3 Script: the model writes the script
  "awaiting_approval", // 3 Script: WAIT – the user approves or asks for changes
  "laying_out", //        4 Building: scenes and visuals are placed
  "checking", //          4 Building: design rules are checked and fixed
  "generating_voice", //  5 Result: the voiceover is made (if asked)
  "reviewing", //         5 Result: the agent looks at its frames and fixes them
  "done", //              finished: the project has its scenes
  "answering", //         7 The agent works on the user's message (after the build)
  "paused", //            stopped at the model's usage limit: run.error says
  //                      when it resets; "Continue" goes on from pausedFrom
  "error", //             stopped: run.error says why
  "cancelled", //         the user stopped it
]);

export type RunStatus = z.infer<typeof runStatus>;
