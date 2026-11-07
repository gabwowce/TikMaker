// Writes src/experiments/codeVideo/brief.md – what Claude Code gets to write
// the experiment's scenes from: every scene's length, what is said and when
// each word is spoken (frames from the scene's start), and what the script
// wanted it to show. Run: npx tsx scripts/codeVideoBrief.ts
import fs from "node:fs";
import { parseProject } from "../src/utils/normalizeProject";
import { computeSceneTimings, projectDurationInFrames } from "../src/utils/duration";
import { resolveAudioClips } from "../src/utils/voiceClips";

const project = parseProject(
  JSON.parse(fs.readFileSync("db/projects/project-1793969945652.json", "utf-8")),
);
const run = JSON.parse(fs.readFileSync("db/agent-runs/run-mw4zf3t3.json", "utf-8"));
const fps = project.fps;
const clips = resolveAudioClips(project.audioClips ?? [], projectDurationInFrames(project));
const lines = computeSceneTimings(project).map(({ from, durationInFrames }, i) => {
  const words = clips
    .filter((c) => c.from >= from && c.from < from + durationInFrames)
    .flatMap((c) => (c.clip.words ?? []).map((w) => `${w.text}@${Math.round(c.from - from + w.start * fps)}`));
  const s = run.script.scenes[i];
  return `## Scene ${i + 1} (${s.role}) – ${durationInFrames} frames (${(durationInFrames / fps).toFixed(1)} s)
Voiceover: ${s.voiceover}
Words (word@frame): ${words.join(" ")}
The script's idea for the picture: ${s.visual}
${s.needsRecording ? "Originally a screen recording – draw a convincing mock of that screen instead (no real recording exists).\n" : ""}`;
});
fs.writeFileSync(
  "src/experiments/codeVideo/brief.md",
  `# Brief: "${run.input.idea.split(":")[0]}" (test 11)

Channel: tips about Claude Code and AI coding for developers. 1080x1920, ${fps} fps.

${lines.join("\n")}`,
);
console.log("brief written");
