import { useProjectStore } from "../state/projectStore";
import type { Block, PositionedVisualEntry, RichHeadlineLine, StepItem } from "../../schema/scene";
import { computeSceneTimings } from "../../utils/duration";
import { parseSelection } from "./selectionId";

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
 * onto the undo stack.
 *
 * A LIST, because the timeline selects more than one clip: copying a headline
 * together with the layer it labels and pasting the pair into the next scene is
 * the whole reason to select two things at once. One object is just a list of
 * length one, so there is no second code path. */
let clipboard: ClipboardEntry[] = [];

export function clipboardHas(): boolean {
  return clipboard.length > 0;
}

function entryLabel(entry: ClipboardEntry): string {
  switch (entry.kind) {
    case "visual":
      return entry.value.visual.type;
    case "block":
      return entry.value.text;
    case "line":
      return entry.value.text;
    case "step":
      return entry.value.label;
    case "audio":
      return entry.value.sfxId;
  }
}

export function clipboardLabel(): string | null {
  if (!clipboard.length) return null;
  if (clipboard.length === 1) return entryLabel(clipboard[0]);
  return `${clipboard.length} objektai`;
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

/**
 * The clipboard entry for ONE selection id, or null if it addresses nothing.
 *
 * The scene comes from the ID, not from what is open: copying is often the LAST
 * thing you do in a scene before moving to the next one, and resolving against
 * the open scene meant the copy silently referred to the wrong objects the
 * moment the selection spanned scenes.
 */
function entryFor(selectionId: string): ClipboardEntry | null {
  const { project, selectedSceneId } = useProjectStore.getState();
  const { sceneId: owner, objectId } = parseSelection(selectionId);
  if (objectId.startsWith("audio-clip-")) {
    const clip = (project.audioClips ?? []).find((entry) => entry.id === objectId.slice(11));
    return clip ? { kind: "audio", value: clip } : null;
  }
  const sceneId = owner ?? selectedSceneId;
  const scene = project.scenes.find((entry) => entry.id === sceneId);
  if (!scene) return null;
  const sceneEnd = computeSceneTimings(project).find((entry) => entry.scene.id === sceneId)?.durationInFrames ?? project.fps;
  const selection = objectId;

  if (selection.startsWith("visual-")) {
    const entry = scene.content.visuals?.find((visual) => visual.id === selection.slice(7));
    return entry ? { kind: "visual", value: { ...entry, exitAt: entry.exitAt ?? sceneEnd } } : null;
  }

  if (selection.startsWith("block-")) {
    const block = scene.content.blocks?.find((entry) => entry.id === selection.slice(6));
    return block ? { kind: "block", value: { ...block, exitAt: block.exitAt ?? sceneEnd } } : null;
  }

  const lineIndex = /^line-(\d+)$/.exec(selection)?.[1];
  if (lineIndex !== undefined) {
    const line = scene.content.richHeadline?.[Number(lineIndex)];
    return line ? { kind: "line", value: { ...line, exitAt: line.exitAt ?? scene.motion?.exitAt ?? sceneEnd } } : null;
  }

  const stepIndex = /^step-(\d+)$/.exec(selection)?.[1];
  if (stepIndex !== undefined) {
    const item = scene.content.items?.[Number(stepIndex)];
    return item ? { kind: "step", value: { ...item, exitAt: item.exitAt ?? scene.motion?.exitAt ?? sceneEnd } } : null;
  }

  return null;
}

export function copyTimelineObject(selectionId: string): boolean {
  return copyTimelineObjects([selectionId]);
}

/** Copies every selected object at once, keeping author order. */
export function copyTimelineObjects(selectionIds: string[]): boolean {
  const entries = selectionIds.map(entryFor).filter((entry): entry is ClipboardEntry => entry !== null);
  if (!entries.length) return false;
  clipboard = entries;
  return true;
}

/** Where a clipboard entry started, so a multi-object paste can keep the
 * spacing the objects had relative to each other. */
function startOf(entry: ClipboardEntry): number {
  return entry.kind === "audio" ? entry.value.from : (entry.value.delay ?? 0);
}

/** Keeps a copy the same length as the original, moved to `at`. */
function retime<T extends { delay?: number; exitAt?: number }>(value: T, at: number | undefined): T {
  if (at === undefined) return value;
  const shift = at - (value.delay ?? 0);
  return { ...value, delay: at, exitAt: value.exitAt === undefined ? undefined : value.exitAt + shift };
}

/** Pastes ONE entry. Reads the store fresh, so pasting several in a row appends
 * to what the previous one added instead of to a stale snapshot. */
function pasteOne(entry: ClipboardEntry, at: number | undefined): string | null {
  const state = useProjectStore.getState();
  const { project, selectedSceneId } = state;
  const scene = project.scenes.find((candidate) => candidate.id === selectedSceneId);
  if (!scene || !selectedSceneId) return null;

  if (entry.kind === "audio") {
    const sceneFrom = computeSceneTimings(project).find((timing) => timing.scene.id === selectedSceneId)?.from ?? 0;
    state.addAudioClip(entry.value.sfxId, sceneFrom + (at ?? 0));
    const clips = useProjectStore.getState().project.audioClips ?? [];
    const inserted = clips[clips.length - 1];
    if (inserted) {
      state.updateAudioClip(inserted.id, {
        startFrom: entry.value.startFrom,
        durationInFrames: entry.value.durationInFrames,
        volume: entry.value.volume,
      });
    }
    return inserted ? `audio-clip-${inserted.id}` : null;
  }

  if (entry.kind === "visual") {
    const copy = retime(freshVisual(entry.value), at);
    state.updateSceneVisuals(selectedSceneId, [...(scene.content.visuals ?? []), copy]);
    return `visual-${copy.id}`;
  }

  if (entry.kind === "block") {
    const copy = retime({ ...entry.value, id: newId("block") }, at);
    state.updateSceneBlocks(selectedSceneId, [...(scene.content.blocks ?? []), copy]);
    return `block-${copy.id}`;
  }

  if (entry.kind === "line") {
    const lines = scene.content.richHeadline ?? [];
    // Rich Headline is capped at 6 lines by the schema; silently dropping the
    // paste would look like the shortcut not working.
    if (lines.length >= 6) return null;
    state.updateSceneRichHeadline(selectedSceneId, [...lines, retime({ ...entry.value }, at)]);
    return `line-${lines.length}`;
  }

  const items = scene.content.items ?? [];
  state.updateSceneItems(selectedSceneId, [...items, retime({ ...entry.value }, at)]);
  return `step-${items.length}`;
}

/**
 * Drops the whole clipboard into the selected scene and returns the new
 * objects' selection ids.
 *
 * `atFrame` (scene-relative, normally the playhead) becomes the start of the
 * EARLIEST copied object; the rest keep their offsets from it, so a group
 * pasted together arrives arranged the way it was copied rather than stacked on
 * one frame. The whole paste is one history transaction — Ctrl+Z after pasting
 * four objects undoes the paste, not a quarter of it.
 */
export function pasteTimelineObjects(atFrame?: number): string[] {
  if (!clipboard.length) return [];
  const state = useProjectStore.getState();
  const origin = Math.min(...clipboard.map(startOf));
  state.beginHistoryTransaction();
  const pasted = clipboard
    .map((entry) => pasteOne(entry, atFrame === undefined ? undefined : atFrame + (startOf(entry) - origin)))
    .filter((id): id is string => id !== null);
  state.endHistoryTransaction();
  return pasted;
}

/** Single-object paste — returns the last id so the caller can select it. */
export function pasteTimelineObject(atFrame?: number): string | null {
  const pasted = pasteTimelineObjects(atFrame);
  return pasted[pasted.length - 1] ?? null;
}

/** Copy and paste in one gesture, which is what "duplicate" is. */
export function duplicateTimelineObject(selectionId: string, atFrame?: number): string | null {
  if (!copyTimelineObject(selectionId)) return null;
  return pasteTimelineObject(atFrame);
}

/** Duplicates every selected object at once, keeping their relative timing. */
export function duplicateTimelineObjects(selectionIds: string[], atFrame?: number): string[] {
  if (!copyTimelineObjects(selectionIds)) return [];
  return pasteTimelineObjects(atFrame);
}

/**
 * Swaps ONLY the artwork on a visual layer, keeping the entry it sits in —
 * position, scale, effects, keyframes, timing and sound all survive, because
 * none of them live on the `visual` itself. That is the whole point: you tune
 * one element, then try a different image in it.
 */
export function replaceVisualAsset(selectionId: string, visual: PositionedVisualEntry["visual"]): boolean {
  const { sceneId: owner, objectId } = parseSelection(selectionId);
  if (!objectId.startsWith("visual-")) return false;
  const state = useProjectStore.getState();
  const { project, selectedSceneId } = state;
  const sceneId = owner ?? selectedSceneId;
  const scene = project.scenes.find((entry) => entry.id === sceneId);
  if (!scene || !sceneId) return false;

  const id = objectId.slice(7);
  const visuals = scene.content.visuals ?? [];
  if (!visuals.some((entry) => entry.id === id)) return false;
  state.updateSceneVisuals(
    sceneId,
    visuals.map((entry) => (entry.id === id ? { ...entry, visual } : entry))
  );
  return true;
}
