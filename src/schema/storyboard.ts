import { z } from "zod";
import { sceneTypeSchema } from "./scene";

/**
 * A storyboard is the SCRIPT layer, deliberately kept in its own file/shape
 * away from the render-ready project JSON (`schema/project.ts`).
 *
 * The two answer different questions and change at different rates: a beat says
 * WHAT this moment of the video has to do (say this line, show this thing, for
 * about this long), while a scene says how it is drawn (layout, layers, motion,
 * sfx). Mixing them means every wording change drags a pile of animation fields
 * with it, and every restack of layers looks like a script edit in the diff.
 *
 * The bridge is one-way and explicit: `storyboardToProject`
 * (`src/utils/storyboardToProject.ts`) turns beats into placeholder scenes. A
 * storyboard is never regenerated FROM a project.
 */

/** The dramatic job a beat does. This is the only thing that decides which
 * scene type the beat becomes, so it stays a closed set — a role with no
 * mapping would generate nothing. */
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
  /** Why this beat exists — the note to yourself that stops a video from
   * turning into a list of frames that each look fine and add up to nothing. */
  purpose: z.string().optional(),
  /** The line you'll say over this beat. Carried onto the generated scene as
   * `scene.vo`, which is what paces it (see `utils/pacing.ts`). */
  voiceover: z.string().optional(),
  /** What the viewer READS. Becomes the generated scene's headline — kept
   * separate from the voiceover because on-screen text is a compression of the
   * line, not a transcript of it. */
  onScreenText: z.string().optional(),
  /** Prose description of the graphic this beat needs ("Chrome integration
   * recording"). Deliberately NOT a visual config: at storyboard time you know
   * what has to be shown long before you know which component shows it. */
  visualPlaceholder: z.string().optional(),
  /** The planned length. Advisory — the generated scene is auto-paced from its
   * VO unless there is no VO to pace from (see `storyboardToProject`). */
  durationSeconds: z.number().positive().max(60).optional(),
  notes: z.string().optional(),
});

export type StoryboardBeat = z.infer<typeof storyboardBeatSchema>;

export const storyboardStatusSchema = z.enum(["draft", "ready", "produced"]);

export const storyboardSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: storyboardStatusSchema.default("draft"),
  /** The length you're aiming for, in seconds — compared against the beats'
   * total in the header so overrunning is visible while writing rather than
   * after rendering. */
  targetDuration: z.number().positive().max(600).optional(),
  beats: z.array(storyboardBeatSchema),
  /** When this storyboard was last saved, ms since epoch — same reconciliation
   * as `VideoProject.savedAt`: the repo's `storyboards/*.json` and the
   * browser's localStorage both hold a copy, and without a stamp there is no
   * way to tell a freshly pulled file from a stale cache. */
  savedAt: z.number().optional(),
});

export type Storyboard = z.infer<typeof storyboardSchema>;

export type BeatRoleDefinition = {
  role: BeatRole;
  label: string;
  /** The scene type this beat becomes. Placeholder-quality on purpose: the
   * first version of generation is a faithful skeleton, not a director. */
  sceneType: z.infer<typeof sceneTypeSchema>;
  /** Prefilled into `purpose` when the beat is added, so an empty storyboard
   * still reads as a structure rather than nine blank rows. */
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

/** Total planned runtime. A beat with no explicit duration falls back to its
 * VO's speaking time so the header total stays honest while a storyboard is
 * half-written — the same content-derives-length rule the scene layer uses. */
export function storyboardDurationSeconds(storyboard: Storyboard, voSeconds: (vo: string) => number): number {
  return storyboard.beats.reduce((total, beat) => {
    if (typeof beat.durationSeconds === "number") return total + beat.durationSeconds;
    return total + (beat.voiceover ? voSeconds(beat.voiceover) : 0);
  }, 0);
}
