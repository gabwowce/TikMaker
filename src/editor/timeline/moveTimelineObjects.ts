import { useProjectStore } from "../state/projectStore";
import { parseSelection } from "./selectionId";
export type ObjectPosition = {
  start: number;
  end: number;
};
export function applyTimelineObjectPositions(
  positions: Map<string, ObjectPosition>,
): void {
  if (!positions.size) return;
  const state = useProjectStore.getState();
  const { selectedSceneId } = state;
  const byScene = new Map<string, Map<string, ObjectPosition>>();
  for (const [id, position] of positions) {
    const { sceneId, objectId } = parseSelection(id);
    const owner = sceneId ?? selectedSceneId;
    if (!owner) continue;
    const group = byScene.get(owner) ?? new Map<string, ObjectPosition>();
    group.set(objectId, position);
    byScene.set(owner, group);
  }
  for (const [sceneId, group] of byScene) applyToScene(sceneId, group);
}
function applyToScene(
  selectedSceneId: string,
  positions: Map<string, ObjectPosition>,
): void {
  const state = useProjectStore.getState();
  const scene = state.project.scenes.find(
    (entry) => entry.id === selectedSceneId,
  );
  if (!scene) return;
  const project = state.project;
  const lines = scene.content.richHeadline;
  if (lines?.some((_, index) => positions.has(`line-${index}`))) {
    state.updateSceneRichHeadline(
      selectedSceneId,
      lines.map((line, index) => {
        const at = positions.get(`line-${index}`);
        return at
          ? {
              ...line,
              delay: at.start,
              exitAt: at.end,
              exit: line.exit ?? "fade",
            }
          : line;
      }),
    );
  }
  const blocks = scene.content.blocks;
  if (blocks?.some((block) => positions.has(`block-${block.id}`))) {
    state.updateSceneBlocks(
      selectedSceneId,
      blocks.map((block) => {
        const at = positions.get(`block-${block.id}`);
        return at ? { ...block, delay: at.start, exitAt: at.end } : block;
      }),
    );
  }
  const items = scene.content.items;
  if (items?.some((_, index) => positions.has(`step-${index}`))) {
    state.updateSceneItems(
      selectedSceneId,
      items.map((item, index) => {
        const at = positions.get(`step-${index}`);
        return at ? { ...item, delay: at.start, exitAt: at.end } : item;
      }),
    );
  }
  const visuals = scene.content.visuals;
  const touchesVisuals = visuals?.some(
    (entry) =>
      positions.has(`visual-${entry.id}`) ||
      (entry.visual.type === "checklist" &&
        entry.visual.items.some((_, index) =>
          positions.has(`check-${entry.id}-${index}`),
        )),
  );
  if (visuals && touchesVisuals) {
    state.updateSceneVisuals(
      selectedSceneId,
      visuals.map((entry) => {
        const at = positions.get(`visual-${entry.id}`);
        let next = at
          ? {
              ...entry,
              delay: at.start,
              exitAt: at.end,
              exit: entry.exit ?? "fade",
            }
          : entry;
        if (next.visual.type === "checklist") {
          const checklist = next.visual;
          if (
            checklist.items.some((_, index) =>
              positions.has(`check-${entry.id}-${index}`),
            )
          ) {
            next = {
              ...next,
              visual: {
                ...checklist,
                items: checklist.items.map((item, index) => {
                  const itemAt = positions.get(`check-${entry.id}-${index}`);
                  return itemAt
                    ? { ...item, delay: itemAt.start, exitAt: itemAt.end }
                    : item;
                }),
              },
            };
          }
        }
        return next;
      }),
    );
  }
  for (const clip of project.audioClips ?? []) {
    const at = positions.get(`audio-clip-${clip.id}`);
    if (at)
      state.updateAudioClip(clip.id, {
        from: at.start,
        durationInFrames: Math.max(1, at.end - at.start),
      });
  }
}
