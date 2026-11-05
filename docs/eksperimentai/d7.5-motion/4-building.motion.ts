// Was at the end of src/agent/run/4-building.ts

// ── Motion and sound (D7.5) ──────────────────────────────────────────────

// The sounds the model names, in the words the video analysis used
// (knowledge/shared/analysis-to-tikmaker.json, sfxType), each with the
// TikMaker sound it plays.
export const SOUNDS = {
  whoosh: "soft-whoosh",
  swipe: "paper-slide",
  pop: "d-pop",
  click: "d-tick",
  typing: "type-word",
  ding: "d-done",
  notification: "msg-in",
  riser: "riser",
  impact: "d-enter",
} as const;

// How the scene's text and pictures arrive, and what keeps a picture alive –
// a short list of TikMaker presets that read well in a short video.
export const TEXT_IN = ["none", "fade", "pop", "slideUp", "scaleIn"] as const;
export const VISUAL_IN = [
  "none",
  "fade",
  "pop",
  "scaleIn",
  "slideUp",
  "zoomIn",
  "zoomSettleLeft",
  "zoomSettleRight",
  "dropIn",
] as const;
export const ALIVE = [
  "none",
  "float",
  "zoomIn",
  "zoomOut",
  "panLeft",
  "panRight",
] as const;
export const TRANSITIONS = [
  "cut",
  "slideLeft",
  "slideRight",
  "slideUp",
  "slideDown",
] as const;

// One scene's motion: how it is entered, how its text and pictures come in,
// which word stands out, and at most one sound, on the moment it marks.
export const sceneMotionFromAi = z.object({
  transition: z.enum(TRANSITIONS),
  textIn: z.enum(TEXT_IN),
  textSplit: z.enum(["word", "line"]),
  highlight: z.string().trim().min(1).nullable(),
  visualIn: z.enum(VISUAL_IN),
  visualAlive: z.enum(ALIVE),
  sound: z
    .object({
      type: z.enum(Object.keys(SOUNDS) as [keyof typeof SOUNDS]),
      on: z.enum(["cut", "text", "visual"]),
    })
    .nullable(),
});

// The whole video, planned at once: one entry per scene, in order.
export const motionFromAi = z.object({
  scenes: z.array(sceneMotionFromAi).min(1),
});

export type SceneMotionFromAi = z.infer<typeof sceneMotionFromAi>;
export type MotionFromAi = z.infer<typeof motionFromAi>;
