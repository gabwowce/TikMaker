import { useProjectStore } from "../state/projectStore";
import type { Block, PositionedVisualEntry, RichHeadlineLine, StepItem } from "../../schema/scene";
import { computeSceneTimings } from "../../utils/duration";

/**
 * Copy / paste / duplicate for whatever the timeline has selected.
 *
 * Lives next to `deleteTimelineObject` and for the same reason: the keyboard,
 * the context menu and the panel buttons must all agree on what "copy this
 * object" means, and the selection id is the only input any of them has.
 *
 * What gets copied is EVERYTHING except identity — effects, durations,
 * keyframes, position, sound. That is the point of the feature: you build one
 * element the way you want it, then stamp out more.
 */

type ClipboardEntry =
  | { kind: "visual"; value: PositionedVisualEntry }
  | { kind: "block"; value: Block }
  | { kind: "line"; value: RichHeadlineLine }
  | { kind: "step"; value: StepItem }
  | { kind: "audio"; value: NonNullable<ReturnType<typeof useProjectStore.getState>["project"]["audioClips"]>[number] };

/** Module-level rather than in the store: a clipboard is editor session state,
 * not part of the project, and putting it in the project store would push it
 * onto the undo stack. */
let clipboard: ClipboardEntry | null = null;

export function clipboardHas(): boolean {
  return clipboard !== null;
}

export function clipboardLabel(): string | null {
  if (!clipboard) return null;
  switch (clipboard.kind) {
    case "visual":
      return clipboard.value.visual.type;
    case "block":
      return clipboard.value.text;
    case "line":
      return clipboard.value.text;
    case "step":
      return clipboard.value.label;
    case "audio":
      return clipboard.value.sfxId;
  }
}

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * A copy that can coexist with the original.
 *
 * Ids have to be re-minted (they address the object in the timeline, the panel
 * and the hoisted-link resolution), and `link` has to go: a carry only means
 * anything as a run of ADJACENT scenes sharing one groupId, so half of one
 * pasted somewhere else points at a group that isn't there. Same reasoning as
 * `instantiateSavedScene`.
 */
function freshVisual(entry: PositionedVisualEntry): PositionedVisualEntry {
  const { link: _link, ...rest } = entry;
  return {
    ...rest,
    id: newId("visual"),
    keyframes: entry.keyframes?.map((keyframe) => ({ ...keyframe, id: newId("kf") })),
  };
}

export function copyTimelineObject(selectionId: string): boolean {
  const { project, selectedSceneId } = useProjectStore.getState();
  if (selectionId.startsWith("audio-clip-")) {
    const clip = (project.audioClips ?? []).find((entry) => entry.id === selectionId.slice(11));
    if (!clip) return false;
    clipboard = { kind: "audio", value: clip };
    return true;
  }
  const scene = project.scenes.find((entry) => entry.id === selectedSceneId);
  if (!scene) return false;
  const sceneEnd = computeSceneTimings(project).find((entry) => entry.scene.id === selectedSceneId)?.durationInFrames ?? project.fps;

  if (selectionId.startsWith("visual-")) {
    const entry = scene.content.visuals?.find((visual) => visual.id === selectionId.slice(7));
    if (!entry) return false;
    clipboard = { kind: "visual", value: { ...entry, exitAt: entry.exitAt ?? sceneEnd } };
    return true;
  }

  if (selectionId.startsWith("block-")) {
    const block = scene.content.blocks?.find((entry) => entry.id === selectionId.slice(6));
    if (!block) return false;
    clipboard = { kind: "block", value: { ...block, exitAt: block.exitAt ?? sceneEnd } };
    return true;
  }

  const lineIndex = /^line-(\d+)$/.exec(selectionId)?.[1];
  if (lineIndex !== undefined) {
    const line = scene.content.richHeadline?.[Number(lineIndex)];
    if (!line) return false;
    clipboard = { kind: "line", value: { ...line, exitAt: line.exitAt ?? scene.motion?.exitAt ?? sceneEnd } };
    return true;
  }

  const stepIndex = /^step-(\d+)$/.exec(selectionId)?.[1];
  if (stepIndex !== undefined) {
    const item = scene.content.items?.[Number(stepIndex)];
    if (!item) return false;
    clipboard = { kind: "step", value: { ...item, exitAt: item.exitAt ?? scene.motion?.exitAt ?? sceneEnd } };
    return true;
  }

  return false;
}

/**
 * Drops the clipboard into the selected scene and returns the new object's
 * selection id, so the caller can select what it just made.
 *
 * `atFrame` (scene-relative, normally the playhead) becomes the copy's start,
 * with its original length preserved — pasting at the playhead is what every
 * editor does, and it beats landing on top of the original where you cannot
 * tell anything happened.
 */
export function pasteTimelineObject(atFrame?: number): string | null {
  if (!clipboard) return null;
  const state = useProjectStore.getState();
  const { project, selectedSceneId } = state;
  const scene = project.scenes.find((entry) => entry.id === selectedSceneId);
  if (!scene || !selectedSceneId) return null;
  if (clipboard.kind === "audio") {
    const sceneFrom = computeSceneTimings(project).find((entry) => entry.scene.id === selectedSceneId)?.from ?? 0;
    state.beginHistoryTransaction();
    state.addAudioClip(clipboard.value.sfxId, sceneFrom + (atFrame ?? 0));
    const clips = useProjectStore.getState().project.audioClips ?? [];
    const inserted = clips[clips.length - 1];
    if (inserted) state.updateAudioClip(inserted.id, {
      startFrom: clipboard.value.startFrom,
      durationInFrames: clipboard.value.durationInFrames,
      volume: clipboard.value.volume,
    });
    state.endHistoryTransaction();
    return inserted ? `audio-clip-${inserted.id}` : null;
  }

  /** Keeps the copy the same length as the original, moved to `atFrame`. */
  function retime<T extends { delay?: number; exitAt?: number }>(value: T): T {
    if (atFrame === undefined) return value;
    const start = value.delay ?? 0;
    const shift = atFrame - start;
    return {
      ...value,
      delay: atFrame,
      exitAt: value.exitAt === undefined ? undefined : value.exitAt + shift,
    };
  }

  if (clipboard.kind === "visual") {
    const copy = retime(freshVisual(clipboard.value));
    state.updateSceneVisuals(selectedSceneId, [...(scene.content.visuals ?? []), copy]);
    return `visual-${copy.id}`;
  }

  if (clipboard.kind === "block") {
    const copy = retime({ ...clipboard.value, id: newId("block") });
    state.updateSceneBlocks(selectedSceneId, [...(scene.content.blocks ?? []), copy]);
    return `block-${copy.id}`;
  }

  if (clipboard.kind === "line") {
    const lines = scene.content.richHeadline ?? [];
    // Rich Headline is capped at 6 lines by the schema; silently dropping the
    // paste would look like the shortcut not working.
    if (lines.length >= 6) return null;
    const copy = retime({ ...clipboard.value });
    state.updateSceneRichHeadline(selectedSceneId, [...lines, copy]);
    return `line-${lines.length}`;
  }

  const items = scene.content.items ?? [];
  const copy = retime({ ...clipboard.value });
  state.updateSceneItems(selectedSceneId, [...items, copy]);
  return `step-${items.length}`;
}

/** Copy and paste in one gesture, which is what "duplicate" is. */
export function duplicateTimelineObject(selectionId: string, atFrame?: number): string | null {
  if (!copyTimelineObject(selectionId)) return null;
  return pasteTimelineObject(atFrame);
}

/**
 * Swaps ONLY the artwork on a visual layer, keeping the entry it sits in —
 * position, scale, effects, keyframes, timing and sound all survive, because
 * none of them live on the `visual` itself. That is the whole point: you tune
 * one element, then try a different image in it.
 */
export function replaceVisualAsset(selectionId: string, visual: PositionedVisualEntry["visual"]): boolean {
  if (!selectionId.startsWith("visual-")) return false;
  const state = useProjectStore.getState();
  const { project, selectedSceneId } = state;
  const scene = project.scenes.find((entry) => entry.id === selectedSceneId);
  if (!scene || !selectedSceneId) return false;

  const id = selectionId.slice(7);
  const visuals = scene.content.visuals ?? [];
  if (!visuals.some((entry) => entry.id === id)) return false;
  state.updateSceneVisuals(
    selectedSceneId,
    visuals.map((entry) => (entry.id === id ? { ...entry, visual } : entry))
  );
  return true;
}
