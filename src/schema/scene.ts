import { z } from "zod";
import { visualConfigSchema } from "./visual";

export const backgroundIdSchema = z.enum([
  "solid-dark",
  "soft-grid",
  "orange-glow",
  "perspective-data-grid",
  "floating-glass-layers",
  "dot-grid",
  "spotlight",
]);

/** What paints the background, independent of the optional grid overlay below.
 * `image` references a file under `public/` — same rule as everywhere else
 * (`assetUrl`), so it survives a render, not just the editor preview. */
export const backgroundFillSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("solid"), color: z.string() }),
  z.object({
    kind: z.literal("gradient"),
    colors: z.array(z.string()).min(2).max(3),
    angle: z.number().min(0).max(360).optional(),
    shape: z.enum(["linear", "radial"]).optional(),
  }),
  z.object({ kind: z.literal("image"), src: z.string() }),
]);

/** Same grid textures the `soft-grid`/`dot-grid` presets use, offered as an
 * overlay on top of ANY fill instead of being baked into one fixed preset. */
export const backgroundGridSchema = z.enum(["none", "lines", "dots"]);

export const customBackgroundSchema = z.object({
  type: z.literal("custom"),
  fill: backgroundFillSchema,
  grid: backgroundGridSchema.optional(),
});

/** A scene's background is either a named preset (the original fixed id) or a
 * hand-built one — solid/gradient/image fill with an optional grid overlay.
 * Every project on disk has a plain id today, which still parses as the first
 * branch, so nothing needs migrating. */
export const sceneBackgroundSchema = z.union([backgroundIdSchema, customBackgroundSchema]);

export const entrancePresetSchema = z.enum([
  /** No independent animation — the element just appears, fully formed, and
   * moves only with whatever carries it (typically the scene's own
   * `motion.transition` slide). Use this instead of "fade" when you want the
   * whole-scene slide to be the ONLY visible motion, with nothing fading or
   * animating on top of it. */
  "none",
  "fade",
  "slideUp",
  "slideDown",
  "slideLeft",
  "slideRight",
  "scaleIn",
  "pop",
  /** Flies in from off-screen on that side while zooming up past its final
   * size, then settles down into place — a multi-phase "arrive and land"
   * move for a visual/headline that should feel like it's landing in the
   * scene rather than just fading up. See `motion/entrances.ts`. */
  "zoomSettleRight",
  "zoomSettleLeft",
  "zoomSettleTop",
  "zoomSettleBottom",
]);
export const exitPresetSchema = z.enum([
  /** No independent animation — the element just stays as-is and leaves only
   * because whatever carries it (the scene's own `motion.transition` slide,
   * or a linked visual's glide) carries it off. See "none" on the entrance
   * preset for the same reasoning. */
  "none",
  "fade",
  "slideUp",
  "slideDown",
  "slideLeft",
  "slideRight",
  "scaleOut",
  /** Punches up in scale with a slight rotate while fading — reads as the
   * element breaking apart/blasting away, the counterpart to
   * `zoomSettleRight`/`zoomSettleLeft`. See `motion/exits.ts`. */
  "burstOut",
]);
export const kenBurnsPresetSchema = z.enum([
  "zoomIn",
  "zoomOut",
  "panLeft",
  "panRight",
  "panUp",
  "panDown",
  /** Cyclic drift/tilt/breathe around the resting spot rather than a one-way
   * ramp — the "parked in the corner but alive" motion. See `motion/kenBurns.ts`. */
  "float",
  /** Continuous rotation around the visual's own center — clockwise /
   * counter-clockwise — for as long as it's on screen. See `motion/kenBurns.ts`. */
  "rotateCW",
  "rotateCCW",
]);
/** Named compositions. The concrete geometry for each lives in
 * `src/video/layout/layoutPresets.ts`; the ids are declared here so the schema
 * doesn't have to import from the video layer (which imports the schema). */
export const layoutIdSchema = z.enum([
  "visual-hero",
  "visual-top",
  "visual-bottom",
  "icon-corner-tr",
  "icon-corner-tl",
  "icon-corner-br",
  "icon-corner-bl",
  "text-only",
]);
export const transitionPresetSchema = z.enum([
  "cut",
  /** @deprecated alias for `slideLeft` — kept so existing projects still work. */
  "push",
  /** Directional cut: the incoming scene slides in from that side while the
   * outgoing scene slides all the way out the opposite side — pure translate,
   * no opacity fade, so it reads as ONE motion instead of slide+fade layered
   * together. Name matches the entrance preset of the same name: `slideLeft`
   * enters from the right moving left, `slideRight` enters from the left
   * moving right, `slideUp` enters from below moving up, `slideDown` enters
   * from above moving down. See `motion/transitions.ts`. */
  "slideLeft",
  "slideRight",
  "slideUp",
  "slideDown",
]);
export const richTextSizeSchema = z.enum(["hero", "headline", "title", "bodyLarge", "body", "label"]);
export const richTextFontSchema = z.enum(["tanker", "clash"]);
export const richTextSplitBySchema = z.enum(["word", "letter", "line"]);

export const sceneTypeSchema = z.enum([
  "hook-centered",
  "hook-visual",
  "visual-explainer",
  "screen-demo",
  "takeaway",
  "comparison",
  "steps",
]);

const sideContentSchema = z.object({
  label: z.string().optional(),
  headline: z.string().optional(),
  body: z.string().optional(),
  visual: visualConfigSchema.optional(),
  /** This column's visual gets the same independent in/out controls as every
   * other visual in the system — without them a comparison's two graphics could
   * only ever move with their column, which is exactly the "I can't animate
   * this one" gap. All optional; unset = the column's own timing, no exit. */
  visualEntrance: entrancePresetSchema.optional(),
  visualExit: exitPresetSchema.optional(),
  visualExitDuration: z.number().min(1).max(60).optional(),
  visualEntranceDistance: z.number().min(0).max(2400).optional(),
  visualExitDistance: z.number().min(0).max(2400).optional(),
  visualScale: z.number().positive().optional(),
  visualKenBurns: kenBurnsPresetSchema.optional(),
  /** Speed multiplier for `visualKenBurns` when it's a cyclic preset — see
   * `positionedVisualSchema.kenBurnsSpeed`. */
  visualKenBurnsSpeed: z.number().min(0.1).max(5).optional(),
  visualSfx: z.string().optional(),
  visualExitSfx: z.string().optional(),
});

const stepItemSchema = z.object({
  label: z.string(),
  value: z.string().optional(),
});

const richHeadlineLineSchema = z.object({
  text: z.string(),
  size: richTextSizeSchema,
  font: richTextFontSchema.optional(),
  pill: z.boolean().optional(),
  /** Freeform position (percent of the full 1080x1920 canvas — same
   * convention as `Block.x`/`y` and a layer's `x`/`y`), for a line that should
   * sit somewhere OTHER than stacked in the centered headline column. Both
   * unset (the default) keeps this line in the normal stacked flow with its
   * neighbors; setting both pulls it out of that flow entirely and positions
   * it independently, same as a Block. */
  x: z.number().min(0).max(100).optional(),
  y: z.number().min(0).max(100).optional(),
  animation: entrancePresetSchema.optional(),
  /** How far (px) a slide/zoomSettle entrance travels — same field, same
   * default, same "Far"/"Off-frame" presets as every other entrance in the
   * system (`entranceDistance` on a layer, `motion.entranceDistance` on the
   * scene). Unset = the subtle built-in default. */
  entranceDistance: z.number().min(0).max(2400).optional(),
  /** This line's own exit, independent of the others. Unset = falls back to
   * the scene's `motion.exit` (same preset every other unstyled element in
   * the scene already leaves with); set = this line uses ITS OWN preset
   * instead — see `exitDistance` below for its travel distance. */
  exit: exitPresetSchema.optional(),
  /** Travel distance for THIS line's own `exit` — only meaningful when `exit`
   * is set. Unset falls back to `motion.exitDistance` (the shared value),
   * same "unset = subtle default, >=400 drops the fade" rule as everywhere
   * else distance appears. */
  exitDistance: z.number().min(0).max(2400).optional(),
  splitBy: richTextSplitBySchema.optional(),
  /** Sound effect id (see `sfxRegistry`) for this line's entrance — same
   * auto/explicit/"none" resolution as `Block.sfx` (see
   * `sfxDefaults.ts#resolveTextEntranceSfx`). Word/letter splits fire it once
   * per unit; a line split fires it once for the whole line. */
  sfx: z.string().optional(),
});

const positionedVisualSchema = z.object({
  id: z.string(),
  visual: visualConfigSchema,
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  scale: z.number().positive().optional(),
  entrance: entrancePresetSchema.optional(),
  exit: exitPresetSchema.optional(),
  exitDuration: z.number().min(1).max(60).optional(),
  /** How far (px) a slide/zoomSettle entrance or exit travels. Unset = the
   * subtle built-in default; >= 400 also drops the opacity fade so the visual
   * genuinely leaves the frame instead of dissolving after a few pixels. */
  entranceDistance: z.number().min(0).max(2400).optional(),
  exitDistance: z.number().min(0).max(2400).optional(),
  delay: z.number().min(0).optional(),
  /** Sound effect id (see `sfxRegistry`) to play when this visual enters.
   * Unlike `motion.sfx`, there's no automatic default here — freeform
   * positioned visuals stay silent unless a sound is explicitly picked, so a
   * scene with several of them doesn't turn into a wall of overlapping SFX. */
  sfx: z.string().optional(),
  /** Sound effect id for this visual's EXIT — same explicit-only rule as
   * `sfx` above; only meaningful when `exit` is set. */
  exitSfx: z.string().optional(),
  /** Carries THIS layer across the cut into the adjacent scene(s) whose own
   * layer array contains an entry with the same `groupId` — the same mechanism
   * as the scene-level `visualLink`, so a freeform layer is just as capable of
   * staying continuous as the primary visual. See `src/utils/visualLinks.ts`. */
  link: z.object({ groupId: z.string() }).optional(),
  /** Continuous slow zoom/pan for the FULL time this visual is on screen —
   * independent of (and layered on top of) `entrance`/`exit`, which only
   * animate the first/last ~18 frames. This is what gives a mockup/image the
   * "alive", non-static look instead of just popping in and sitting still. */
  kenBurns: kenBurnsPresetSchema.optional(),
  /** Speed multiplier for the CYCLIC presets (`float`, `rotateCW`/`rotateCCW`)
   * — 1 = default pace, 2 = twice as fast. No effect on `zoomIn`/`zoomOut`/
   * `panLeft`/etc, which are one-way ramps sized to the visual's own duration
   * rather than a rate. See `motion/kenBurns.ts`. */
  kenBurnsSpeed: z.number().min(0.1).max(5).optional(),
});

export const blockTypeSchema = z.enum(["text", "badge"]);

const blockSchema = z.object({
  id: z.string(),
  type: blockTypeSchema,
  text: z.string(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  size: z.number().positive().optional(),
  color: z.string().optional(),
  font: richTextFontSchema.optional(),
  letterSpacing: z.number().optional(),
  animation: entrancePresetSchema.optional(),
  splitBy: richTextSplitBySchema.optional(),
  delay: z.number().min(0).optional(),
  /** Sound effect id (see `sfxRegistry`) to play when this block enters — explicit
   * opt-in only, same reasoning as `positionedVisualSchema.sfx`. */
  sfx: z.string().optional(),
});

const baseSceneFields = {
  id: z.string(),
  /** Optional — when omitted the length is derived from `vo` + on-screen text
   * by `resolveSceneDuration` (`src/utils/pacing.ts`), so a scene can't cut
   * before the voiceover finishes or the text can be read. Set it explicitly
   * only for a deliberate flash frame or a hard timing constraint. */
  durationSeconds: z.number().positive().optional(),
  /** The voiceover line for this scene. Drives the scene's length (see
   * `durationSeconds`) and is what the script/teleprompter reads from — the
   * app does not synthesize or play audio for it. */
  vo: z.string().optional(),
  background: sceneBackgroundSchema,
  content: z.object({
    eyebrow: z.string().optional(),
    headline: z.string().optional(),
    highlights: z.array(z.string()).optional(),
    left: sideContentSchema.optional(),
    right: sideContentSchema.optional(),
    items: z.array(stepItemSchema).optional(),
    richHeadline: z.array(richHeadlineLineSchema).max(6).optional(),
    blocks: z.array(blockSchema).max(8).optional(),
    /** Every visual in the scene, ordered bottom-to-top — the array index IS
     * the z-index. Includes what used to be the scene's separate primary
     * `visual`, folded in at load time (see `utils/normalizeProject.ts`). */
    visuals: z.array(positionedVisualSchema).max(10).optional(),
  }),
  /** Named composition (see `src/video/layout/layoutPresets.ts`) — decides
   * where the primary visual sits, auto-scales it to fit that spot so it can't
   * run off frame, and tells the scene which band its text occupies so the two
   * never overlap. Prefer this over hand-tuned `visualPosition`/`visualScale`;
   * those still override it when set. */
  layout: layoutIdSchema.optional(),
  visual: visualConfigSchema.optional(),
  visualPosition: z
    .object({
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
    })
    .optional(),
  /** Independent of `motion.entrance`/`motion.exit` (the rest of the scene) —
   * lets a visual have its own in/out animation. Falls back to `motion.entrance`
   * when unset; `visualExit` defaults to no exit (stays until the scene cuts). */
  visualEntrance: entrancePresetSchema.optional(),
  visualExit: exitPresetSchema.optional(),
  visualExitDuration: z.number().min(1).max(60).optional(),
  /** Travel distance (px) for the main visual's own slide/zoomSettle in/out.
   * See `entranceDistance` on a positioned visual for the fade rule. */
  visualEntranceDistance: z.number().min(0).max(2400).optional(),
  visualExitDistance: z.number().min(0).max(2400).optional(),
  /** Resting scale multiplier for the scene's main visual (1 = natural size).
   * Combined with `visualLink` below to make one visual asset read as BIG in
   * one scene and small elsewhere, gliding between the two sizes/positions
   * across the cut instead of popping. Also just a plain "make this bigger/
   * smaller" knob when used without `visualLink`. */
  visualScale: z.number().positive().optional(),
  /** Chains this scene's main visual to the adjacent scene(s) sharing the same
   * `groupId` (previous and/or next in the project's scene array) so the SAME
   * visual asset glides between each scene's `visualPosition`/`visualScale`
   * across the cut instead of exiting and a new one entering. Both linked
   * scenes must set the SAME `visual` asset and an explicit `visualPosition` —
   * see `src/utils/visualLinks.ts` for the pose math and
   * `src/video/typography/AnimatedVisual.tsx` for how it overrides the normal
   * entrance/exit preset just for the linked visual. Scenes without this field
   * are completely unaffected — it's opt-in per scene pair. */
  visualLink: z.object({ groupId: z.string() }).optional(),
  /** Continuous slow zoom/pan applied to the scene's main visual for its
   * entire time on screen, independent of `visualEntrance`/`visualExit`
   * (which only cover the first/last ~18 frames). Unset = static once its
   * entrance settles. */
  visualKenBurns: kenBurnsPresetSchema.optional(),
  /** Sound effect id (see `sfxRegistry`) for the scene's main visual, paired with
   * `visualEntrance`/`visualExit` above. Unset = auto-pick from the entrance/exit
   * preset (see `src/video/motion/sfxDefaults.ts`); `"none"` silences it. */
  visualSfx: z.string().optional(),
  visualExitSfx: z.string().optional(),
  motion: z
    .object({
      entrance: entrancePresetSchema.optional(),
      exit: exitPresetSchema.optional(),
      exitDuration: z.number().min(1).max(60).optional(),
      /** Travel distance (px) for the scene content group's own slide
       * entrance/exit — same fade rule as the per-visual fields above. */
      entranceDistance: z.number().min(0).max(2400).optional(),
      exitDistance: z.number().min(0).max(2400).optional(),
      transition: transitionPresetSchema.optional(),
      stagger: z.number().min(0).optional(),
      /** Sound effect id for the whole scene's entrance/exit cue (see
       * `src/video/motion/sfxDefaults.ts`). Unset = auto-pick a default from
       * `entrance`/`exit` (or `transition` for a push-cut whoosh); `"none"` silences it.
       * Fires once per scene regardless of how many badge/eyebrow/headline elements
       * animate in, so it doesn't stack into overlapping noise. */
      sfx: z.string().optional(),
      exitSfx: z.string().optional(),
    })
    .optional(),
};

export const sceneSchema = z.object({
  ...baseSceneFields,
  type: sceneTypeSchema,
});

export type Scene = z.infer<typeof sceneSchema>;
export type BackgroundId = z.infer<typeof backgroundIdSchema>;
export type BackgroundFill = z.infer<typeof backgroundFillSchema>;
export type BackgroundGrid = z.infer<typeof backgroundGridSchema>;
export type CustomBackground = z.infer<typeof customBackgroundSchema>;
export type SceneBackground = z.infer<typeof sceneBackgroundSchema>;
export type EntrancePreset = z.infer<typeof entrancePresetSchema>;
export type ExitPreset = z.infer<typeof exitPresetSchema>;
export type KenBurnsPreset = z.infer<typeof kenBurnsPresetSchema>;
export type TransitionPreset = z.infer<typeof transitionPresetSchema>;
export type SceneType = z.infer<typeof sceneTypeSchema>;
export type LayoutId = z.infer<typeof layoutIdSchema>;
export type SideContent = z.infer<typeof sideContentSchema>;
export type StepItem = z.infer<typeof stepItemSchema>;
export type RichHeadlineLine = z.infer<typeof richHeadlineLineSchema>;
export type RichTextSize = z.infer<typeof richTextSizeSchema>;
export type RichTextFont = z.infer<typeof richTextFontSchema>;
export type RichTextSplitBy = z.infer<typeof richTextSplitBySchema>;
export type Block = z.infer<typeof blockSchema>;
export type BlockType = z.infer<typeof blockTypeSchema>;
export type VisualPosition = { x: number; y: number };
export type PositionedVisualEntry = z.infer<typeof positionedVisualSchema>;
