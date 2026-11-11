import * as THREE from "three";
import { BRICKS, TOWER } from "../bulbCity/Buildings";

// The course through the city: down the long street, a climb over the park,
// a dive into the cross street, out behind the tower block and a spiral up to
// the top of the glass tower. The lights and rings sit on it; the autopilot
// flies it exactly.

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export const TRACK = new THREE.CatmullRomCurve3(
  [
    v(-6.2, 1.4, 0),
    v(-3.0, 1.3, 0),
    v(0, 1.5, 0),
    v(3.0, 1.5, 0),
    v(5.0, 2.2, 0.8),
    v(5.0, 3.0, 3.2),
    v(3.0, 3.2, 4.8),
    v(0.8, 2.6, 4.9),
    v(0, 1.9, 3.0),
    v(0, 1.5, 1.2),
    v(0, 1.5, -1.5),
    v(0, 1.7, -3.6),
    v(-0.6, 2.4, -5.2),
    v(-3.0, 3.6, -5.6),
    v(-5.6, 5.0, -3.6),
    v(-4.2, 6.4, -1.0),
    v(-1.4, 7.2, -1.2),
    v(-2.8, 8.4, -2.8),
  ],
  false,
  "centripetal",
);
export const TRACK_LENGTH = TRACK.getLength();

// 22 lights spread along the course, the last one on top of the tower.
export const ORBS: THREE.Vector3[] = Array.from({ length: 22 }, (_, i) =>
  TRACK.getPointAt(0.07 + (0.93 * i) / 21),
);

// Rings between lights: fly through one for a burst of speed.
export const RINGS = [0.2, 0.42, 0.6, 0.86].map((u) => ({
  at: TRACK.getPointAt(u),
  facing: TRACK.getTangentAt(u).normalize(),
}));

// Where the plane starts: the beginning of the course, facing along it.
export function startPose() {
  const at = TRACK.getPointAt(0);
  const t = TRACK.getTangentAt(0);
  return { pos: at.clone(), yaw: Math.atan2(t.x, t.z) };
}

// The buildings, as boxes the plane bounces off.
export type Box = { minX: number; maxX: number; minZ: number; maxZ: number; top: number };
const GROUND = 0.1;
const FLOOR = 0.42;
export const BOXES: Box[] = [
  ...BRICKS.map((b) => ({
    minX: b.x - b.w / 2 - 0.08,
    maxX: b.x + b.w / 2 + 0.08,
    minZ: b.z - b.d / 2 - 0.08,
    maxZ: b.z + b.d / 2 + (b.fireEscape ? 0.4 : 0.08),
    top: GROUND + FLOOR * 1.35 + (b.floors - 1) * FLOOR + 0.3,
  })),
  {
    minX: TOWER.x - TOWER.w / 2 - 0.08,
    maxX: TOWER.x + TOWER.w / 2 + 0.08,
    minZ: TOWER.z - TOWER.d / 2 - 0.08,
    maxZ: TOWER.z + TOWER.d / 2 + 0.25,
    top: GROUND + 0.55 + TOWER.floors * FLOOR + 0.6,
  },
];
