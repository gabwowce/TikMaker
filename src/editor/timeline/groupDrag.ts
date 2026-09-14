import type { ObjectPosition } from "./moveTimelineObjects";

export type DragOrigin = ObjectPosition & {
  id: string;
  offset?: number;
};

export function groupDragPositions(
  origins: DragOrigin[],
  delta: number,
  max = Infinity,
): Map<string, ObjectPosition> {
  const positions = new Map<string, ObjectPosition>();
  for (const origin of origins) {
    const length = origin.end - origin.start;
    const start = Math.min(max - length, Math.max(0, origin.start + delta));
    const offset = origin.offset ?? 0;
    positions.set(origin.id, {
      start: start - offset,
      end: start + length - offset,
    });
  }
  return positions;
}
