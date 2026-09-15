import { TimelineRow } from "./timelineRowTypes";

export const LABEL_WIDTH = 190;

export const ROW_HEIGHT = 34;

export function laneLabel(kind: TimelineRow["kind"]) {
  return kind === "text"
    ? "Text"
    : kind === "visual"
      ? "Visuals"
      : kind === "item"
        ? "Items"
        : "Sounds";
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const LANE_GAP_FRAMES = 2;

export function autoLane(row: TimelineRow, ofKind: TimelineRow[]): number {
  return ofKind.indexOf(row);
}

export function overlaps(
  a: {
    start: number;
    end: number;
    point?: boolean;
  },
  b: {
    start: number;
    end: number;
    point?: boolean;
  },
): boolean {
  function spanOf(row: { start: number; end: number; point?: boolean }) {
    return {
      from: row.start - LANE_GAP_FRAMES,
      to: (row.point ? row.start + LANE_GAP_FRAMES : row.end) + LANE_GAP_FRAMES,
    };
  }
  const first = spanOf(a);
  const second = spanOf(b);
  return first.from < second.to && second.from < first.to;
}

export const MIN_SCENE_FRAMES = 9;

export const MIN_PANEL_HEIGHT = 120;

export const MAX_PANEL_HEIGHT = 900;

const SNAP_PX = 7;

export function snapFrame(
  frame: number,
  targets: number[],
  pixelsPerFrame: number,
): number {
  const tolerance = SNAP_PX / pixelsPerFrame;
  let best = frame;
  let bestDistance = tolerance;
  for (const target of targets) {
    const distance = Math.abs(target - frame);
    if (distance <= bestDistance) {
      bestDistance = distance;
      best = target;
    }
  }
  return Math.round(best);
}
