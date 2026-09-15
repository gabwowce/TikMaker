import type { Scene } from "../schema/scene";
import type { VisualConfig } from "../schema/visual";
export const VO_WORDS_PER_SECOND = 3.2;
export const VO_TAIL_SECONDS = 0.5;
export const READ_WORDS_PER_SECOND = 2.0;
export const SKIM_WORDS_PER_SECOND = 4.0;
export const MIN_SCENE_SECONDS = 2.0;
export const MIN_TITLE_SECONDS = 1.8;
function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
export function voDurationSeconds(vo: string): number {
  const words = wordCount(vo);
  if (words === 0) return 0;
  return words / VO_WORDS_PER_SECOND + VO_TAIL_SECONDS;
}
function onScreenText(scene: Scene): string {
  const c = scene.content;
  const parts: string[] = [];
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
  const parts = (scene.content.visuals ?? []).map((v) =>
    scannableText(v.visual),
  );
  const words = wordCount(parts.join(" "));
  if (words === 0) return 0;
  return words / SKIM_WORDS_PER_SECOND;
}
export function resolveSceneDuration(scene: Scene): number {
  if (typeof scene.durationSeconds === "number") return scene.durationSeconds;
  const floor =
    scene.type === "hook-centered" && !scene.vo
      ? MIN_TITLE_SECONDS
      : MIN_SCENE_SECONDS;
  const spoken = scene.vo ? voDurationSeconds(scene.vo) : 0;
  const read = readDurationSeconds(scene);
  const skim = skimDurationSeconds(scene);
  return Math.max(floor, spoken, read, skim);
}
export function pacingWarning(scene: Scene): string | null {
  if (typeof scene.durationSeconds !== "number") return null;
  const spoken = scene.vo ? voDurationSeconds(scene.vo) : 0;
  const read = readDurationSeconds(scene);
  const skim = skimDurationSeconds(scene);
  const needed = Math.max(spoken, read, skim);
  if (needed <= scene.durationSeconds + 0.05) return null;
  const driver =
    needed === spoken
      ? "the voiceover"
      : needed === read
        ? "the on-screen text"
        : "the code/terminal content";
  return `${scene.durationSeconds.toFixed(1)}s is too short — ${driver} needs about ${needed.toFixed(1)}s.`;
}
