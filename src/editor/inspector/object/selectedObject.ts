import type { VideoProject } from "../../../schema/project";
import type {
  Block,
  PositionedVisualEntry,
  RichHeadlineLine,
  Scene,
  StepItem,
} from "../../../schema/scene";
import type { VisualConfig } from "../../../schema/visual";
import { computeSceneTimings } from "../../../utils/duration";
import { useProjectStore } from "../../state/projectStore";
import { sceneTimelineEnd } from "../../timeline/sceneTimelineEnd";
import { parseSelection } from "../../timeline/selectionId";

type AudioClip = NonNullable<VideoProject["audioClips"]>[number];
type ChecklistItem = Extract<
  VisualConfig,
  { type: "checklist" }
>["items"][number];

// What every tab needs to know about the scene the object is in.
export type ObjectScene = {
  project: VideoProject;
  scene: Scene;
  sceneFrom: number; // first frame of the scene in the whole video
  sceneEnd: number; // scene length in frames
  max: number; // last frame an object in this scene can reach
};

// The object picked in the timeline, already found in the project, with an
// update() that changes only that object. The tabs switch on `kind`.
export type SelectedObject = ObjectScene &
  (
    | {
        kind: "audio-clip";
        clip: AudioClip;
        update: (patch: Partial<AudioClip>) => void;
      }
    | { kind: "scene-sound"; isOut: boolean }
    | {
        kind: "visual-sound";
        isOut: boolean;
        visual: PositionedVisualEntry;
        update: (patch: Partial<PositionedVisualEntry>) => void;
      }
    | { kind: "scene-text" }
    | {
        kind: "text-line";
        index: number;
        line: RichHeadlineLine;
        update: (patch: Partial<RichHeadlineLine>) => void;
      }
    | {
        kind: "text-block";
        block: Block;
        update: (patch: Partial<Block>) => void;
      }
    | {
        kind: "visual";
        visual: PositionedVisualEntry;
        update: (patch: Partial<PositionedVisualEntry>) => void;
      }
    | {
        kind: "step";
        index: number;
        item: StepItem;
        update: (patch: Partial<StepItem>) => void;
      }
    | {
        kind: "checklist-item";
        index: number;
        item: ChecklistItem;
        update: (patch: Partial<ChecklistItem>) => void;
      }
  );

// Finds the object behind a timeline selection id such as
// "scene-01-hook::line-0" or "audio-clip-voice". null = nothing to show.
export function useSelectedObject(selectionId: string): SelectedObject | null {
  const project = useProjectStore((state) => state.project);
  const openSceneId = useProjectStore((state) => state.selectedSceneId);
  const updateSceneRichHeadline = useProjectStore(
    (state) => state.updateSceneRichHeadline,
  );
  const updateSceneBlocks = useProjectStore((state) => state.updateSceneBlocks);
  const updateSceneVisuals = useProjectStore(
    (state) => state.updateSceneVisuals,
  );
  const updateSceneItems = useProjectStore((state) => state.updateSceneItems);
  const updateAudioClip = useProjectStore((state) => state.updateAudioClip);

  const parsed = parseSelection(selectionId);
  const id = parsed.objectId;
  const sceneId = parsed.sceneId ?? openSceneId;
  const timing = computeSceneTimings(project).find(
    (entry) => entry.scene.id === sceneId,
  );
  if (!timing) return null;
  const scene = timing.scene;
  const base: ObjectScene = {
    project,
    scene,
    sceneFrom: timing.from,
    sceneEnd: timing.durationInFrames,
    max: sceneTimelineEnd(project, timing),
  };
  const lines = scene.content.richHeadline ?? [];
  const blocks = scene.content.blocks ?? [];
  const visuals = scene.content.visuals ?? [];
  const steps = scene.content.items ?? [];
  // replaces the item at `index` in a list, keeping the others
  const replaceAt = <T>(list: T[], index: number, patch: Partial<T>) =>
    list.map((value, at) => (at === index ? { ...value, ...patch } : value));

  if (id.startsWith("audio-clip-")) {
    const clip = (project.audioClips ?? []).find(
      (value) => value.id === id.slice(11),
    );
    if (!clip) return null;
    return {
      ...base,
      kind: "audio-clip",
      clip,
      update: (patch) => updateAudioClip(clip.id, patch),
    };
  }
  const sceneSound = /^sound-scene-(in|out)$/.exec(id);
  if (sceneSound)
    return { ...base, kind: "scene-sound", isOut: sceneSound[1] === "out" };

  const visualSound = /^sound-visual-(.+)-(in|out)$/.exec(id);
  if (visualSound) {
    const index = visuals.findIndex((entry) => entry.id === visualSound[1]);
    if (index === -1) return null;
    return {
      ...base,
      kind: "visual-sound",
      isOut: visualSound[2] === "out",
      visual: visuals[index],
      update: (patch) =>
        updateSceneVisuals(scene.id, replaceAt(visuals, index, patch)),
    };
  }
  if (id === "text-group") return { ...base, kind: "scene-text" };

  const lineIndex = /^line-(\d+)$/.exec(id);
  if (lineIndex && lines[Number(lineIndex[1])]) {
    const index = Number(lineIndex[1]);
    return {
      ...base,
      kind: "text-line",
      index,
      line: lines[index],
      update: (patch) =>
        updateSceneRichHeadline(scene.id, replaceAt(lines, index, patch)),
    };
  }
  if (id.startsWith("block-")) {
    const index = blocks.findIndex((item) => item.id === id.slice(6));
    if (index === -1) return null;
    return {
      ...base,
      kind: "text-block",
      block: blocks[index],
      update: (patch) =>
        updateSceneBlocks(scene.id, replaceAt(blocks, index, patch)),
    };
  }
  if (id.startsWith("visual-")) {
    const index = visuals.findIndex((item) => item.id === id.slice(7));
    if (index === -1) return null;
    return {
      ...base,
      kind: "visual",
      visual: visuals[index],
      update: (patch) =>
        updateSceneVisuals(scene.id, replaceAt(visuals, index, patch)),
    };
  }
  const stepIndex = /^step-(\d+)$/.exec(id);
  if (stepIndex && steps[Number(stepIndex[1])]) {
    const index = Number(stepIndex[1]);
    return {
      ...base,
      kind: "step",
      index,
      item: steps[index],
      update: (patch) =>
        updateSceneItems(scene.id, replaceAt(steps, index, patch)),
    };
  }
  const check = /^check-(.+)-(\d+)$/.exec(id);
  if (check) {
    const itemIndex = Number(check[2]);
    const visualIndex = visuals.findIndex(
      (entry) => entry.id === check[1] && entry.visual.type === "checklist",
    );
    const checklist = visuals[visualIndex]?.visual;
    if (checklist?.type !== "checklist" || !checklist.items[itemIndex])
      return null;
    return {
      ...base,
      kind: "checklist-item",
      index: itemIndex,
      item: checklist.items[itemIndex],
      update: (patch) =>
        updateSceneVisuals(
          scene.id,
          replaceAt(visuals, visualIndex, {
            visual: {
              ...checklist,
              items: replaceAt(checklist.items, itemIndex, patch),
            },
          }),
        ),
    };
  }
  return null;
}

// The heading at the top of the panel, e.g. "Text 2" / "Rich headline line".
export function objectTitle(object: SelectedObject): {
  title: string;
  subtitle: string;
} {
  switch (object.kind) {
    case "audio-clip":
      return { title: "Audio clip", subtitle: "Global audio" };
    case "scene-sound":
      return {
        title: `Scene ${object.isOut ? "OUT" : "IN"} sound`,
        subtitle: "Timeline sound cue",
      };
    case "visual-sound":
      return {
        title: `${object.isOut ? "OUT" : "IN"} sound`,
        subtitle: "Selected visual's sound",
      };
    case "scene-text":
      return { title: "Scene text", subtitle: "Text and timing" };
    case "text-line":
      return {
        title: `Text ${object.index + 1}`,
        subtitle: "Rich headline line",
      };
    case "text-block":
      return { title: "Text block", subtitle: object.block.type };
    case "visual":
      return { title: "Visual", subtitle: object.visual.visual.type };
    case "step":
      return { title: `Item ${object.index + 1}`, subtitle: "Scene item" };
    case "checklist-item":
      return { title: `Item ${object.index + 1}`, subtitle: "Checklist item" };
  }
}
