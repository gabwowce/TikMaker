import type {
  Block,
  PositionedVisualEntry,
  RichHeadlineLine,
  StepItem,
} from "../../schema/scene";
import { computeSceneTimings } from "../../utils/duration";
import { useProjectStore } from "../state/projectStore";
import { parseSelection } from "./selectionId";
type ClipboardEntry =
  | {
      kind: "visual";
      value: PositionedVisualEntry;
    }
  | {
      kind: "block";
      value: Block;
    }
  | {
      kind: "line";
      value: RichHeadlineLine;
    }
  | {
      kind: "step";
      value: StepItem;
    }
  | {
      kind: "audio";
      value: NonNullable<
        ReturnType<typeof useProjectStore.getState>["project"]["audioClips"]
      >[number];
    };
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
  return `${clipboard.length} objects`;
}
function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
function freshVisual(entry: PositionedVisualEntry): PositionedVisualEntry {
  const { link: _link, ...rest } = entry;
  return {
    ...rest,
    id: newId("visual"),
    keyframes: entry.keyframes?.map((keyframe) => ({
      ...keyframe,
      id: newId("kf"),
    })),
  };
}
function entryFor(selectionId: string): ClipboardEntry | null {
  const { project, selectedSceneId } = useProjectStore.getState();
  const { sceneId: owner, objectId } = parseSelection(selectionId);
  if (objectId.startsWith("audio-clip-")) {
    const clip = (project.audioClips ?? []).find(
      (entry) => entry.id === objectId.slice(11),
    );
    return clip ? { kind: "audio", value: clip } : null;
  }
  const sceneId = owner ?? selectedSceneId;
  const scene = project.scenes.find((entry) => entry.id === sceneId);
  if (!scene) return null;
  const sceneEnd =
    computeSceneTimings(project).find((entry) => entry.scene.id === sceneId)
      ?.durationInFrames ?? project.fps;
  const selection = objectId;
  if (selection.startsWith("visual-")) {
    const entry = scene.content.visuals?.find(
      (visual) => visual.id === selection.slice(7),
    );
    return entry
      ? {
          kind: "visual",
          value: { ...entry, exitAt: entry.exitAt ?? sceneEnd },
        }
      : null;
  }
  if (selection.startsWith("block-")) {
    const block = scene.content.blocks?.find(
      (entry) => entry.id === selection.slice(6),
    );
    return block
      ? { kind: "block", value: { ...block, exitAt: block.exitAt ?? sceneEnd } }
      : null;
  }
  const lineIndex = /^line-(\d+)$/.exec(selection)?.[1];
  if (lineIndex !== undefined) {
    const line = scene.content.richHeadline?.[Number(lineIndex)];
    return line
      ? {
          kind: "line",
          value: {
            ...line,
            exitAt: line.exitAt ?? scene.motion?.exitAt ?? sceneEnd,
          },
        }
      : null;
  }
  const stepIndex = /^step-(\d+)$/.exec(selection)?.[1];
  if (stepIndex !== undefined) {
    const item = scene.content.items?.[Number(stepIndex)];
    return item
      ? {
          kind: "step",
          value: {
            ...item,
            exitAt: item.exitAt ?? scene.motion?.exitAt ?? sceneEnd,
          },
        }
      : null;
  }
  return null;
}
export function copyTimelineObject(selectionId: string): boolean {
  return copyTimelineObjects([selectionId]);
}
export function copyTimelineObjects(selectionIds: string[]): boolean {
  const entries = selectionIds
    .map(entryFor)
    .filter((entry): entry is ClipboardEntry => entry !== null);
  if (!entries.length) return false;
  clipboard = entries;
  return true;
}
function startOf(entry: ClipboardEntry): number {
  return entry.kind === "audio" ? entry.value.from : (entry.value.delay ?? 0);
}
function retime<
  T extends {
    delay?: number;
    exitAt?: number;
  },
>(value: T, at: number | undefined): T {
  if (at === undefined) return value;
  const shift = at - (value.delay ?? 0);
  return {
    ...value,
    delay: at,
    exitAt: value.exitAt === undefined ? undefined : value.exitAt + shift,
  };
}
function pasteOne(
  entry: ClipboardEntry,
  at: number | undefined,
): string | null {
  const state = useProjectStore.getState();
  const { project, selectedSceneId } = state;
  const scene = project.scenes.find(
    (candidate) => candidate.id === selectedSceneId,
  );
  if (!scene || !selectedSceneId) return null;
  if (entry.kind === "audio") {
    const sceneFrom =
      computeSceneTimings(project).find(
        (timing) => timing.scene.id === selectedSceneId,
      )?.from ?? 0;
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
    state.updateSceneVisuals(selectedSceneId, [
      ...(scene.content.visuals ?? []),
      copy,
    ]);
    return `visual-${copy.id}`;
  }
  if (entry.kind === "block") {
    const copy = retime({ ...entry.value, id: newId("block") }, at);
    state.updateSceneBlocks(selectedSceneId, [
      ...(scene.content.blocks ?? []),
      copy,
    ]);
    return `block-${copy.id}`;
  }
  if (entry.kind === "line") {
    const lines = scene.content.richHeadline ?? [];
    if (lines.length >= 6) return null;
    state.updateSceneRichHeadline(selectedSceneId, [
      ...lines,
      retime({ ...entry.value }, at),
    ]);
    return `line-${lines.length}`;
  }
  const items = scene.content.items ?? [];
  state.updateSceneItems(selectedSceneId, [
    ...items,
    retime({ ...entry.value }, at),
  ]);
  return `step-${items.length}`;
}
export function pasteTimelineObjects(atFrame?: number): string[] {
  if (!clipboard.length) return [];
  const state = useProjectStore.getState();
  const origin = Math.min(...clipboard.map(startOf));
  state.beginHistoryTransaction();
  const pasted = clipboard
    .map((entry) =>
      pasteOne(
        entry,
        atFrame === undefined ? undefined : atFrame + (startOf(entry) - origin),
      ),
    )
    .filter((id): id is string => id !== null);
  state.endHistoryTransaction();
  return pasted;
}
export function pasteTimelineObject(atFrame?: number): string | null {
  const pasted = pasteTimelineObjects(atFrame);
  return pasted[pasted.length - 1] ?? null;
}
export function duplicateTimelineObject(
  selectionId: string,
  atFrame?: number,
): string | null {
  if (!copyTimelineObject(selectionId)) return null;
  return pasteTimelineObject(atFrame);
}
export function duplicateTimelineObjects(
  selectionIds: string[],
  atFrame?: number,
): string[] {
  if (!copyTimelineObjects(selectionIds)) return [];
  return pasteTimelineObjects(atFrame);
}
export function replaceVisualAsset(
  selectionId: string,
  visual: PositionedVisualEntry["visual"],
): boolean {
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
    visuals.map((entry) => (entry.id === id ? { ...entry, visual } : entry)),
  );
  return true;
}
