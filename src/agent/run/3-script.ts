import { z } from "zod";
import { scenePlanRoleSchema } from "../../schema/scene";

// 3 Script — the video as scenes, in words only: what each scene is for, what
// is said, what is written on screen and what is shown. Where things go on
// screen comes later (4 Building).

// ── From the model ───────────────────────────────────────────────────────

// One scene of the script (FR-08).
export const sceneFromAi = z.object({
  // What the scene is for (hook, item, benefit, cta, …). writeScript only
  // accepts the roles of the chosen template.
  role: scenePlanRoleSchema,
  // What the voice says.
  voiceover: z.string().trim().min(1),
  // The few words shown big on screen.
  onScreen: z.string().trim().min(1),
  // What the viewer sees, in words (a screen, an icon, a diagram…).
  visual: z.string().trim().min(1),
  // Best shown with the user's own recording (never when "motion only").
  needsRecording: z.boolean(),
});

// The whole script: the scenes in order, and the optional template scenes the
// model left out, each with why (FR-08).
export const scriptFromAi = z.object({
  scenes: z.array(sceneFromAi).min(2),
  skipped: z.array(
    z.object({
      role: scenePlanRoleSchema,
      reason: z.string().trim().min(1),
    }),
  ),
});

// ── From the user (FR-10) ────────────────────────────────────────────────

// "Approve": the script is right, build the video.
export const approveScriptFromUser = z.object({
  runId: z.string().min(1),
});
// A comment: the model writes the script again with it.
export const reviseScriptFromUser = z.object({
  runId: z.string().min(1),
  comment: z.string().trim().min(3).max(500),
});

// ── In the run's file ────────────────────────────────────────────────────

// What the agent found on the web before writing (step 3a): the facts, as
// the model wrote them, and the pages they came from.
export const researchInRun = z.object({
  facts: z.string(),
  sources: z.array(z.object({ url: z.string(), title: z.string().optional() })),
});

// One problem the code found in the script (FR-09): which scene, if any, and
// what is wrong.
export const scriptProblem = z.object({
  sceneIndex: z.number().int().min(0).optional(),
  message: z.string().min(1),
});

// The script the run goes on with: the model's scenes and the problems still
// left after the one automatic fix.
export const scriptInRun = scriptFromAi.extend({
  problems: z.array(scriptProblem),
  approved: z.boolean().optional(),
  comment: z.string().optional(),
});

export type SceneFromAi = z.infer<typeof sceneFromAi>;
export type ScriptFromAi = z.infer<typeof scriptFromAi>;
export type ScriptProblem = z.infer<typeof scriptProblem>;
export type ScriptInRun = z.infer<typeof scriptInRun>;
