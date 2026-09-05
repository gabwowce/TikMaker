import type { VideoProject } from "../schema/project";
import type { Scene, TransitionPreset } from "../schema/scene";
import type { Storyboard, StoryboardBeat } from "../schema/storyboard";
import { getBeatRole } from "../schema/storyboard";
import { parseProject } from "./normalizeProject";

/** Directional variety by scene INDEX, exactly as the script-generation rules
 * in CLAUDE.md describe — so a generated skeleton already cuts like a finished
 * video instead of repeating one slide. */
const TRANSITION_CYCLE: TransitionPreset[] = ["slideLeft", "slideDown", "slideRight", "slideUp"];

function sceneIdFor(beat: StoryboardBeat, index: number): string {
  return `scene-${String(index + 1).padStart(2, "0")}-${beat.role}`;
}

/** The author-facing note carried onto the scene: what this frame has to show,
 * plus whatever else the beat said, kept as prose because at generation time
 * nothing has picked a visual component yet. */
function notesFor(beat: StoryboardBeat): string | undefined {
  const parts = [beat.visualPlaceholder?.trim(), beat.notes?.trim()].filter(Boolean);
  return parts.length ? parts.join("\n\n") : undefined;
}

function sceneFromBeat(beat: StoryboardBeat, index: number): Scene {
  const role = getBeatRole(beat.role);
  const isFirst = index === 0;
  const transition: TransitionPreset = isFirst ? "cut" : TRANSITION_CYCLE[index % TRANSITION_CYCLE.length];

  return {
    id: sceneIdFor(beat, index),
    storyboardBeatId: beat.id,
    type: role.sceneType,
    // Left unset whenever there's a VO to pace from: `resolveSceneDuration`
    // gives the scene whichever is longer — speaking the line or reading the
    // screen — and a number typed into a storyboard weeks earlier is a plan,
    // not a measurement. A beat with a duration and NO voiceover has nothing to
    // derive from, so that number is the only signal there is.
    durationSeconds: beat.voiceover?.trim() ? undefined : beat.durationSeconds,
    vo: beat.voiceover?.trim() || undefined,
    notes: notesFor(beat),
    background: "solid-dark",
    content: {
      eyebrow: role.label.toUpperCase(),
      headline: beat.onScreenText?.trim() || beat.voiceover?.trim() || role.label,
    },
    motion: {
      // A slide transition carries the whole frame, so an independent entrance
      // fade underneath it reads as the content vanishing mid-move — see the
      // motion rules in CLAUDE.md. The opening cut is the one scene that has
      // nothing carrying it, so it fades in on its own.
      entrance: isFirst ? "fade" : "none",
      transition,
      stagger: 6,
      // Silence by default: a cue on every scene reads as amateurish, and the
      // 3–5 beats that earn one are a choice for the edit, not for generation.
      sfx: "none",
    },
  };
}

/**
 * Beats → a render-ready placeholder project. Deliberately literal: one beat
 * becomes one scene of its role's type, carrying the copy and the pacing signal
 * across and nothing else. Choosing layouts, visuals and layers is the editing
 * pass that follows, and a generator guessing at them would produce work to
 * undo rather than a starting point.
 *
 * Runs through `parseProject` so what comes back has been through the same
 * normalization as any imported file — never `videoProjectSchema.parse` alone.
 */
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
