import { Kind, Row, Track } from "./fullTimelineTypes";

export const LABEL = 170;

export const ROW_HEIGHT = 38;

export const MIN_ZOOM = 0.35;

export const MAX_ZOOM = 14;

const KIND_ORDER: Kind[] = ["scene", "text", "visual", "item", "sound"];

export const KIND_LABEL: Record<Kind, string> = {
  scene: "Scene guides",
  text: "Text",
  visual: "Visuals",
  item: "Items",
  sound: "Sounds",
};

export const KIND_COLOR: Record<Kind, string> = {
  scene: "#64748b",
  text: "#8b5cf6",
  visual: "#ff7024",
  item: "#14b8a6",
  sound: "#3b82f6",
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function overlaps(a: Row, b: Row) {
  return a.start < b.end + 2 && b.start < a.end + 2;
}

export function buildTracks(rows: Row[]): Track[] {
  const tracks: Track[] = [];
  for (const kind of KIND_ORDER) {
    const matching = rows.filter((row) => row.kind === kind);
    if (!matching.length) continue;
    const lanes: Row[][] = [];
    for (const row of matching) {
      let lane = row.lane;
      if (lane === undefined) {
        lane = lanes.findIndex((entries) =>
          entries.every((entry) => !overlaps(row, entry)),
        );
        if (lane < 0) lane = lanes.length;
      }
      while (lanes.length <= lane) lanes.push([]);
      lanes[lane].push(row);
    }
    lanes.forEach((entries, lane) =>
      tracks.push({ kind, lane, rows: entries }),
    );
    if (kind !== "scene" && matching.some((row) => row.setLane))
      tracks.push({ kind, lane: lanes.length, rows: [] });
  }
  return tracks;
}
