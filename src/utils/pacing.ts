import type { Scene } from "../schema/scene";
import type { VisualConfig } from "../schema/visual";

/**
 * Scene length is a READING/LISTENING problem, not a design choice — a frame
 * has to stay up long enough for the voiceover to finish saying it and for the
 * viewer to finish reading what's on screen. Guessing durations by eye is what
 * produces the classic "cuts before anyone can read it" failure, so every
 * duration in this app is derived from content unless a scene explicitly
 * overrides it.
 */

/** Short-form VO pace — energetic but still intelligible. Faster than an
 * audiobook (~2.5 w/s) because creator voiceover is punchy, slower than an
 * unpaced read because the viewer is parsing the screen at the same time. */
export const VO_WORDS_PER_SECOND = 3.2;

/** Silence after the last VO word so the cut doesn't clip the tail and the
 * idea has a beat to land. */
export const VO_TAIL_SECONDS = 0.5;

/** On-screen text is read slower than VO is spoken, because the viewer is
 * also parsing layout/visuals. Applies to scenes with no VO. */
export const READ_WORDS_PER_SECOND = 2.0;

/**
 * Code, CLI output and diffs are SCANNED, not read word by word — the viewer
 * takes in the shape of it (a wall of edits, a menu of checkpoints) and only
 * fixates on the highlighted line. Counting it at full reading speed would
 * stretch every terminal scene to twice the length it needs; ignoring it
 * entirely lets a dense window cut before anything registers.
 */
export const SKIM_WORDS_PER_SECOND = 4.0;

/** Even a single word needs this long to register at all. */
export const MIN_SCENE_SECONDS = 2.0;

/** A title/chapter card is intentionally quick, but never subliminal. */
export const MIN_TITLE_SECONDS = 1.8;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Seconds of voiceover for a script line, including its trailing beat. */
export function voDurationSeconds(vo: string): number {
  const words = wordCount(vo);
  if (words === 0) return 0;
  return words / VO_WORDS_PER_SECOND + VO_TAIL_SECONDS;
}

/** Every piece of text the scene puts on screen, for read-time estimation. */
function onScreenText(scene: Scene): string {
  const c = scene.content;
  const parts: string[] = [];
  if (c.eyebrow) parts.push(c.eyebrow);
  if (c.headline) parts.push(c.headline);
  for (const line of c.richHeadline ?? []) parts.push(line.text);
  for (const block of c.blocks ?? []) parts.push(block.text);
  for (const item of c.items ?? []) {
    parts.push(item.label);
    if (item.value) parts.push(item.value);
  }
  for (const side of [c.left, c.right]) {
    if (!side) continue;
    if (side.label) parts.push(side.label);
    if (side.headline) parts.push(side.headline);
    if (side.body) parts.push(side.body);
  }
  if (scene.visual?.type === "checklist") {
    for (const item of scene.visual.items) parts.push(item.label);
  }
  for (const entry of c.visuals ?? []) {
    if (entry.visual.type === "checklist") {
      for (const item of entry.visual.items) parts.push(item.label);
    }
  }
  return parts.join(" ");
}

export function readDurationSeconds(scene: Scene): number {
  const words = wordCount(onScreenText(scene));
  if (words === 0) return 0;
  return words / READ_WORDS_PER_SECOND;
}

/** Words inside code-like visuals (terminal, diff, CLI mock), wherever they sit
 * — the scene's own visual, a `transform`'s two states, or a positioned entry. */
function scannableText(visual: VisualConfig | undefined): string {
  if (!visual) return "";
  switch (visual.type) {
    case "terminal":
    case "code-diff":
      return visual.lines.map((l) => l.text).join(" ");
    case "claude-cli":
      return [
        ...(visual.transcript ?? []).map((l) => l.text),
        visual.input ?? "",
        visual.mode ?? "",
        visual.overlay?.title ?? "",
        ...(visual.overlay?.items ?? []).map((i) => i.text),
      ].join(" ");
    case "transform":
      return `${scannableText(visual.from)} ${scannableText(visual.to)}`;
    default:
      return "";
  }
}

export function skimDurationSeconds(scene: Scene): number {
  const parts = [scannableText(scene.visual), ...(scene.content.visuals ?? []).map((v) => scannableText(v.visual))];
  const words = wordCount(parts.join(" "));
  if (words === 0) return 0;
  return words / SKIM_WORDS_PER_SECOND;
}

/**
 * The duration a scene actually plays for. An explicit `durationSeconds` still
 * wins (so a deliberate flash-frame stays possible), but when it's omitted the
 * length comes from whichever takes longer: saying the VO, or reading the
 * screen — never shorter than the floor.
 */
export function resolveSceneDuration(scene: Scene): number {
  if (typeof scene.durationSeconds === "number") return scene.durationSeconds;

  const floor = scene.type === "hook-centered" && !scene.vo ? MIN_TITLE_SECONDS : MIN_SCENE_SECONDS;
  const spoken = scene.vo ? voDurationSeconds(scene.vo) : 0;
  const read = readDurationSeconds(scene);
  const skim = skimDurationSeconds(scene);

  return Math.max(floor, spoken, read, skim);
}

/** Scenes whose explicit `durationSeconds` is shorter than the content needs —
 * surfaced in the editor so a too-fast cut is visible before rendering. */
export function pacingWarning(scene: Scene): string | null {
  if (typeof scene.durationSeconds !== "number") return null;

  const spoken = scene.vo ? voDurationSeconds(scene.vo) : 0;
  const read = readDurationSeconds(scene);
  const skim = skimDurationSeconds(scene);
  const needed = Math.max(spoken, read, skim);
  if (needed <= scene.durationSeconds + 0.05) return null;

  const driver =
    needed === spoken ? "the voiceover" : needed === read ? "the on-screen text" : "the code/terminal content";
  return `${scene.durationSeconds.toFixed(1)}s is too short — ${driver} needs about ${needed.toFixed(1)}s.`;
}
