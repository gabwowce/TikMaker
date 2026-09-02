import { useProjectStore } from "../state/projectStore";
import { parseSelection } from "./selectionId";

/**
 * Repositions SEVERAL timeline objects in one write.
 *
 * Every timeline row carries its own `set(start, end)`, and each one rebuilds
 * the whole collection it belongs to (`richHeadline`, `blocks`, `visuals`, …)
 * from the snapshot captured when that row was rendered. Calling three of them
 * in a row therefore does not move three clips: each write is computed from the
 * same stale array, so the last one lands and the first two are silently
 * discarded — which is exactly what a group drag looked like before this
 * existed (one clip moved, the rest stayed put).
 *
 * The fix is not to make every `set` re-read the store. It is to have ONE
 * function that takes every new position at once and writes each collection
 * exactly once, from the state as it is right now.
 *
 * Positions are ABSOLUTE, not deltas, and the caller keeps the poses the
 * objects held before the gesture: applying a delta per pointermove would
 * compound onto the previous move and send the group sliding away on its own.
 */
export type ObjectPosition = { start: number; end: number };

export function applyTimelineObjectPositions(positions: Map<string, ObjectPosition>): void {
  if (!positions.size) return;
  const state = useProjectStore.getState();
  const { selectedSceneId } = state;

  // A selection can span scenes (the full-video timeline shows them all at
  // once), and each scene's collections have to be written separately — one
  // write per scene per collection, still never two for the same array.
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

function applyToScene(selectedSceneId: string, positions: Map<string, ObjectPosition>): void {
  const state = useProjectStore.getState();
  const scene = state.project.scenes.find((entry) => entry.id === selectedSceneId);
  if (!scene) return;
  const project = state.project;

  const lines = scene.content.richHeadline;
  if (lines?.some((_, index) => positions.has(`line-${index}`))) {
    state.updateSceneRichHeadline(
      selectedSceneId,
      lines.map((line, index) => {
        const at = positions.get(`line-${index}`);
        return at ? { ...line, delay: at.start, exitAt: at.end, exit: line.exit ?? "fade" } : line;
      })
    );
  }

  const blocks = scene.content.blocks;
  if (blocks?.some((block) => positions.has(`block-${block.id}`))) {
    state.updateSceneBlocks(
      selectedSceneId,
      blocks.map((block) => {
        const at = positions.get(`block-${block.id}`);
        return at ? { ...block, delay: at.start, exitAt: at.end } : block;
      })
    );
  }

  const items = scene.content.items;
  if (items?.some((_, index) => positions.has(`step-${index}`))) {
    state.updateSceneItems(
      selectedSceneId,
      items.map((item, index) => {
        const at = positions.get(`step-${index}`);
        return at ? { ...item, delay: at.start, exitAt: at.end } : item;
      })
    );
  }

  const visuals = scene.content.visuals;
  // Checklist rows live INSIDE a visual, so both are resolved in the same pass
  // over `visuals` — two passes would be two writes and the second would undo
  // the first, which is the bug this function exists to avoid.
  const touchesVisuals = visuals?.some(
    (entry) =>
      positions.has(`visual-${entry.id}`) ||
      (entry.visual.type === "checklist" && entry.visual.items.some((_, index) => positions.has(`check-${entry.id}-${index}`)))
  );
  if (visuals && touchesVisuals) {
    state.updateSceneVisuals(
      selectedSceneId,
      visuals.map((entry) => {
        const at = positions.get(`visual-${entry.id}`);
        let next = at ? { ...entry, delay: at.start, exitAt: at.end, exit: entry.exit ?? "fade" } : entry;
        if (next.visual.type === "checklist") {
          const checklist = next.visual;
          if (checklist.items.some((_, index) => positions.has(`check-${entry.id}-${index}`))) {
            next = {
              ...next,
              visual: {
                ...checklist,
                items: checklist.items.map((item, index) => {
                  const itemAt = positions.get(`check-${entry.id}-${index}`);
                  return itemAt ? { ...item, delay: itemAt.start, exitAt: itemAt.end } : item;
                }),
              },
            };
          }
        }
        return next;
      })
    );
  }

  // Audio clips are project-level and each has its own setter, so they cannot
  // clobber one another the way a shared array does.
  for (const clip of project.audioClips ?? []) {
    const at = positions.get(`audio-clip-${clip.id}`);
    if (at) state.updateAudioClip(clip.id, { from: at.start, durationInFrames: Math.max(1, at.end - at.start) });
  }
}
