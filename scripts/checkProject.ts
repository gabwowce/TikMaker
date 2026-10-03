import { readFileSync } from "node:fs";
import type { VisualConfig } from "../src/schema/visual";
import { computeSceneTimings } from "../src/utils/duration";
import { parseProject } from "../src/utils/normalizeProject";
import {
  fitPositionedVisual,
  visualOverflowWarning,
} from "../src/video/layout/layoutPresets";

// Usage: npm run video:check -- db/projects/<file>.json
//
// What would otherwise only show up by watching the render: per-scene length
// (from the VO), total against the target, layers crossing the safe margins,
// and which recording placeholders are still waiting for a real clip.
// A placeholder is a `screen` whose content is a checkpoint labelled "REC …".

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run video:check -- db/projects/<file>.json");
  process.exit(1);
}
const project = parseProject(JSON.parse(readFileSync(file, "utf8")));

function placeholderLabel(visual: VisualConfig): string | null {
  if (visual.type === "screen" && visual.content.type === "checkpoint")
    return visual.content.label.startsWith("REC") ? visual.content.label : null;
  return null;
}

let end = 0;
const pending: string[] = [];
for (const { scene, from, durationInFrames } of computeSceneTimings(project)) {
  end = from + durationInFrames;
  const words = scene.vo?.trim().split(/\s+/).length ?? 0;
  console.log(
    `${scene.id.padEnd(18)} ${(durationInFrames / 30).toFixed(1).padStart(4)}s  ${words} words`,
  );
  for (const layer of scene.content.visuals ?? []) {
    const label = placeholderLabel(layer.visual);
    if (label) pending.push(`${scene.id}: ${label}`);
    // Spinning corner logos are meant to bleed off the frame.
    if (layer.kenBurns === "rotateCW" || layer.kenBurns === "rotateCCW") continue;
    const warning = visualOverflowWarning(
      layer.visual,
      layer,
      fitPositionedVisual(layer.visual, layer.scale),
    );
    if (warning) console.log(`   ⚠ ${layer.id}: ${warning}`);
  }
}

const total = end / 30;
console.log(`\nTotal ~${total.toFixed(1)}s`);
const voiced = (project.audioClips ?? []).filter((c) => c.words?.length).length;
console.log(`Voiceover with captions: ${voiced} clip(s)`);
if (pending.length) {
  console.log(`\nWaiting for recordings (${pending.length}):`);
  for (const p of pending) console.log(`   · ${p}`);
}
