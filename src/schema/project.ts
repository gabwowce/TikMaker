import { z } from "zod";
import { sceneSchema } from "./scene";

export const videoProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  /** Projects cloned from the same editing template are grouped together in
   * the project picker. This is organization only; it never changes render. */
  collection: z.string().optional(),
  fps: z.literal(30),
  width: z.literal(1080),
  height: z.literal(1920),
  /** Project-level writing brief. Scene-level narrative data lives in
   * `scene.plan`, while VO/text stay in their render-owning scene fields. */
  storyPlan: z.object({
    targetDuration: z.number().positive().max(600).optional(),
    premise: z.string().optional(),
    audience: z.string().optional(),
  }).optional(),
  /** The script this edit came from. Keeping the reference lets the scene
   * editor show the writing brief without merging storyboard and render data. */
  storyboardId: z.string().optional(),
  scenes: z.array(sceneSchema),
  /** When this project was last saved, ms since epoch.
   *
   * The library exists in two places — `projects/*.json` on disk (what git
   * carries between machines) and the browser's localStorage (the working
   * copy) — and on startup they have to be reconciled. Without a stamp there is
   * no way to tell a freshly pulled file from a stale browser cache, so one of
   * them has to be blindly preferred and the other silently loses work. */
  savedAt: z.number().optional(),
  /** Project-level audio clips live on the global timeline and are not clipped
   * by scene boundaries. `sfxId` resolves through the shared SFX registry. */
  audioClips: z.array(z.object({
    id: z.string(),
    sfxId: z.string(),
    from: z.number().min(0),
    /** Source offset and visible timeline length, both in project frames. */
    startFrom: z.number().min(0).optional(),
    durationInFrames: z.number().min(1).optional(),
    lane: z.number().int().min(0).max(24).optional(),
    volume: z.number().min(0).max(2).optional(),
    /** Exact script used to generate a voice asset. If scene.vo later changes,
     * the editor can flag the attached recording as stale. */
    voiceText: z.string().optional(),
    /** Playback speed. 1 = as recorded. Applies to any audio clip, not just a
     * voiceover — a sound effect that needs to be snappier is the same knob.
     * The editor rescales `durationInFrames` alongside it so the clip on the
     * timeline stays as long as what you actually hear. */
    playbackRate: z.number().min(0.25).max(4).optional(),
  })).optional(),
});

export type VideoProject = z.infer<typeof videoProjectSchema>;

export function createEmptyProject(id: string, title: string): VideoProject {
  return {
    id,
    title,
    fps: 30,
    width: 1080,
    height: 1920,
    scenes: [],
    audioClips: [],
    savedAt: Date.now(),
  };
}
