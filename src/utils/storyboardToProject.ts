import type { VideoProject } from "../schema/project";
import type { Scene, TransitionPreset } from "../schema/scene";
import type { Storyboard, StoryboardBeat } from "../schema/storyboard";
import { getBeatRole } from "../schema/storyboard";
import { parseProject } from "./normalizeProject";
const TRANSITION_CYCLE: TransitionPreset[] = [
  "slideLeft",
  "slideDown",
  "slideRight",
  "slideUp",
];
function sceneIdFor(beat: StoryboardBeat, index: number): string {
  return `scene-${String(index + 1).padStart(2, "0")}-${beat.role}`;
}
function notesFor(beat: StoryboardBeat): string | undefined {
  const parts = [beat.visualPlaceholder?.trim(), beat.notes?.trim()].filter(
    Boolean,
  );
  return parts.length ? parts.join("\n\n") : undefined;
}
function sceneFromBeat(beat: StoryboardBeat, index: number): Scene {
  const role = getBeatRole(beat.role);
  const isFirst = index === 0;
  const transition: TransitionPreset = isFirst
    ? "cut"
    : TRANSITION_CYCLE[index % TRANSITION_CYCLE.length];
  return {
    id: sceneIdFor(beat, index),
    storyboardBeatId: beat.id,
    type: role.sceneType,
    durationSeconds: beat.voiceover?.trim() ? undefined : beat.durationSeconds,
    vo: beat.voiceover?.trim() || undefined,
    notes: notesFor(beat),
    background: "solid-dark",
    content: {
      eyebrow: role.label.toUpperCase(),
      headline:
        beat.onScreenText?.trim() || beat.voiceover?.trim() || role.label,
    },
    motion: {
      entrance: isFirst ? "fade" : "none",
      transition,
      stagger: 6,
      sfx: "none",
    },
  };
}
export function storyboardToProject(storyboard: Storyboard): VideoProject {
  return parseProject({
    id: `${storyboard.id}-${Date.now().toString(36)}`,
    title: storyboard.title,
    fps: 30,
    width: 1080,
    height: 1920,
    storyboardId: storyboard.id,
    scenes: storyboard.beats.map(sceneFromBeat),
  });
}
