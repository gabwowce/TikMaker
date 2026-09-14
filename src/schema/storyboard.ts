import { z } from "zod";
import { sceneTypeSchema } from "./scene";
export const beatRoleSchema = z.enum([
  "hook",
  "problem",
  "solution",
  "reveal",
  "step",
  "demo",
  "proof",
  "payoff",
  "cta",
]);
export type BeatRole = z.infer<typeof beatRoleSchema>;
export const storyboardBeatSchema = z.object({
  id: z.string(),
  role: beatRoleSchema,
  purpose: z.string().optional(),
  voiceover: z.string().optional(),
  onScreenText: z.string().optional(),
  visualPlaceholder: z.string().optional(),
  durationSeconds: z.number().positive().max(60).optional(),
  notes: z.string().optional(),
});
export type StoryboardBeat = z.infer<typeof storyboardBeatSchema>;
export const storyboardStatusSchema = z.enum(["draft", "ready", "produced"]);
export const storyboardSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: storyboardStatusSchema.default("draft"),
  targetDuration: z.number().positive().max(600).optional(),
  beats: z.array(storyboardBeatSchema),
  savedAt: z.number().optional(),
});
export type Storyboard = z.infer<typeof storyboardSchema>;
export type BeatRoleDefinition = {
  role: BeatRole;
  label: string;
  sceneType: z.infer<typeof sceneTypeSchema>;
  defaultPurpose: string;
};
export const beatRoleRegistry: BeatRoleDefinition[] = [
  {
    role: "hook",
    label: "Hook",
    sceneType: "hook-centered",
    defaultPurpose: "Stop the scroll and set up the idea.",
  },
  {
    role: "problem",
    label: "Problem",
    sceneType: "hook-visual",
    defaultPurpose: "Show the pain the viewer already recognises.",
  },
  {
    role: "solution",
    label: "Solution",
    sceneType: "visual-explainer",
    defaultPurpose: "Name what fixes it.",
  },
  {
    role: "reveal",
    label: "Reveal",
    sceneType: "hook-visual",
    defaultPurpose: "Turn the idea over — the thing they didn't know.",
  },
  {
    role: "step",
    label: "Step",
    sceneType: "visual-explainer",
    defaultPurpose: "One concrete move, explained on its own frame.",
  },
  {
    role: "demo",
    label: "Demo",
    sceneType: "screen-demo",
    defaultPurpose: "Show it actually happening on screen.",
  },
  {
    role: "proof",
    label: "Proof",
    sceneType: "screen-demo",
    defaultPurpose: "Evidence it worked — the result, not the claim.",
  },
  {
    role: "payoff",
    label: "Payoff",
    sceneType: "takeaway",
    defaultPurpose: "Land the benefit in one line.",
  },
  {
    role: "cta",
    label: "CTA",
    sceneType: "takeaway",
    defaultPurpose: "Tell them the single next action.",
  },
];
export function getBeatRole(role: BeatRole): BeatRoleDefinition {
  const def = beatRoleRegistry.find((r) => r.role === role);
  if (!def) throw new Error(`Unknown beat role: ${role}`);
  return def;
}
export function createEmptyStoryboard(id: string, title: string): Storyboard {
  return { id, title, status: "draft", beats: [] };
}
export function storyboardDurationSeconds(
  storyboard: Storyboard,
  voSeconds: (vo: string) => number,
): number {
  return storyboard.beats.reduce((total, beat) => {
    if (typeof beat.durationSeconds === "number")
      return total + beat.durationSeconds;
    return total + (beat.voiceover ? voSeconds(beat.voiceover) : 0);
  }, 0);
}
