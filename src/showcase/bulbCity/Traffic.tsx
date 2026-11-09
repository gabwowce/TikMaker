import { interpolate } from "remotion";
import { clamp, Glow, nightAt, pop, T } from "./kit";
import { HALF } from "./Street";

// Cars driving through the crossroads, and clouds drifting around the
// diorama. The cars are timed so the two roads never meet in the middle.

type CarKind = "taxi" | "sedan" | "bus" | "hatch" | "van";
type CarSpec = {
  kind: CarKind;
  color: string;
  // along the x road (0) or the z road (1), and which way
  road: 0 | 1;
  dir: 1 | -1;
  // the frame it is in the middle of the crossroads
  centre: number;
};

const SPEED = 0.07; // units per frame
const CARS: CarSpec[] = [
  { kind: "taxi", color: "#f5c518", road: 0, dir: 1, centre: 250 },
  { kind: "hatch", color: "#3d7dd8", road: 1, dir: 1, centre: 275 },
  { kind: "sedan", color: "#c8372d", road: 0, dir: -1, centre: 300 },
  { kind: "van", color: "#f2f2ee", road: 1, dir: -1, centre: 324 },
  { kind: "bus", color: "#2f8f83", road: 0, dir: 1, centre: 346 },
];

const SIZE: Record<CarKind, { len: number; body: number; cabin: number; cabinLen: number }> = {
  taxi: { len: 0.62, body: 0.13, cabin: 0.12, cabinLen: 0.34 },
  sedan: { len: 0.64, body: 0.13, cabin: 0.12, cabinLen: 0.32 },
  hatch: { len: 0.52, body: 0.14, cabin: 0.13, cabinLen: 0.3 },
  van: { len: 0.7, body: 0.3, cabin: 0, cabinLen: 0 },
  bus: { len: 1.15, body: 0.36, cabin: 0, cabinLen: 0 },
};

// The car itself, at the origin, facing +x.
function CarBody({
  kind,
  color,
  night,
  wheelSpin,
  lightsOn,
}: {
  kind: CarKind;
  color: string;
  night: number;
  wheelSpin: number;
  lightsOn: boolean;
}) {
  const s = SIZE[kind];
  const width = kind === "bus" ? 0.3 : 0.27;
  const tall = s.cabin === 0;
  const lit = lightsOn ? night : 0;
  return (
    <group>
      {/* body */}
      <mesh position={[0, 0.055 + s.body / 2, 0]} castShadow>
        <boxGeometry args={[s.len, s.body, width]} />
        <meshPhysicalMaterial color={color} metalness={0.4} roughness={0.25} clearcoat={1} clearcoatRoughness={0.1} />
      </mesh>
      {/* cabin with tinted glass */}
      {!tall ? (
        <mesh position={[-0.03, 0.055 + s.body + s.cabin / 2, 0]} castShadow>
          <boxGeometry args={[s.cabinLen, s.cabin, width - 0.03]} />
          <meshPhysicalMaterial color="#1f2a35" metalness={0.5} roughness={0.08} clearcoat={1} envMapIntensity={2} />
        </mesh>
      ) : (
        <mesh position={[0.02, 0.055 + s.body * 0.68, 0]}>
          <boxGeometry args={[s.len - 0.06, s.body * 0.3, width + 0.004]} />
          <meshPhysicalMaterial
            color="#1f2a35"
            metalness={0.5}
            roughness={0.08}
            envMapIntensity={2}
            emissive="#ffe4b0"
            emissiveIntensity={kind === "bus" ? lit * 1.4 : 0}
          />
        </mesh>
      )}
      {kind === "taxi" ? (
        <mesh position={[-0.03, 0.055 + s.body + s.cabin + 0.02, 0]}>
          <boxGeometry args={[0.1, 0.035, 0.05]} />
          <meshStandardMaterial color="#fff6d0" emissive="#fff0b0" emissiveIntensity={0.3 + lit * 1.5} />
        </mesh>
      ) : null}
      {/* wheels */}
      {[
        [s.len * 0.32, width / 2],
        [-s.len * 0.32, width / 2],
        [s.len * 0.32, -width / 2],
        [-s.len * 0.32, -width / 2],
      ].map(([wx, wz], i) => (
        <mesh key={i} position={[wx, 0.055, wz]} rotation={[Math.PI / 2, 0, -wheelSpin]} castShadow>
          <cylinderGeometry args={[0.055, 0.055, 0.045, 16]} />
          <meshStandardMaterial color="#1b1b1d" roughness={0.8} />
        </mesh>
      ))}
      {/* head and tail lights */}
      {[-0.08, 0.08].map((lz) => (
        <group key={lz}>
          <mesh position={[s.len / 2 + 0.003, 0.055 + s.body * 0.55, lz]}>
            <boxGeometry args={[0.01, 0.03, 0.05]} />
            <meshBasicMaterial color={lightsOn ? "#fffbe8" : "#d9d6cc"} toneMapped={lit < 0.2} />
          </mesh>
          <mesh position={[-s.len / 2 - 0.003, 0.055 + s.body * 0.55, lz]}>
            <boxGeometry args={[0.01, 0.03, 0.05]} />
            <meshBasicMaterial color={lightsOn ? "#ff3b30" : "#8a2a24"} toneMapped={lit < 0.2} />
          </mesh>
        </group>
      ))}
      <Glow position={[s.len / 2 + 0.1, 0.1, 0]} scale={0.55 * lit} opacity={0.85} />
      {lit > 0.05 ? (
        <mesh position={[s.len / 2 + 0.38, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.6, 0.3]} />
          <meshBasicMaterial color="#fff2c8" transparent opacity={0.14 * lit} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  );
}

function Car({ spec, frame }: { spec: CarSpec; frame: number }) {
  const along = SPEED * (frame - spec.centre) * spec.dir;
  const edge = HALF - 0.2;
  if (Math.abs(along) > edge) return null;
  // they drive onto and off the slab, appearing at its edge
  const fade = interpolate(Math.abs(along), [edge - 0.5, edge], [1, 0], clamp);
  const lane = 0.32 * spec.dir;
  const x = spec.road === 0 ? along : -lane;
  const z = spec.road === 0 ? lane : along;
  const heading =
    spec.road === 0 ? (spec.dir > 0 ? 0 : Math.PI) : spec.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
  const bounce = Math.sin(frame * 0.9 + spec.centre) * 0.004;
  return (
    <group position={[x, 0.02 + bounce, z]} rotation={[0, heading, 0]} scale={fade}>
      <CarBody
        kind={spec.kind}
        color={spec.color}
        night={nightAt(frame)}
        wheelSpin={(frame * SPEED) / 0.055}
        lightsOn
      />
    </group>
  );
}

// ── Parking lots behind the buildings ───────────────────────────────────

type Lot = {
  x: number;
  z: number;
  // stalls run along x (0) or along z (1)
  along: 0 | 1;
  stalls: number;
  cars: { stall: number; kind: CarKind; color: string; flip?: boolean }[];
  start: number;
};

const STALL = 0.46;
const LOTS: Lot[] = [
  {
    x: 2.95,
    z: -4.6,
    along: 0,
    stalls: 7,
    cars: [
      { stall: 0, kind: "sedan", color: "#e9e7e1" },
      { stall: 2, kind: "hatch", color: "#2f6fb8" },
      { stall: 3, kind: "taxi", color: "#f5c518", flip: true },
      { stall: 5, kind: "sedan", color: "#3a3d42" },
    ],
    start: T.PROPS + 24,
  },
  {
    x: -2.95,
    z: 4.5,
    along: 0,
    stalls: 7,
    cars: [
      { stall: 1, kind: "hatch", color: "#c8372d", flip: true },
      { stall: 2, kind: "sedan", color: "#8fb6a8" },
      { stall: 4, kind: "van", color: "#f2f2ee" },
      { stall: 6, kind: "hatch", color: "#f0a43a", flip: true },
    ],
    start: T.PROPS + 28,
  },
];

function ParkingLot({ lot, frame }: { lot: Lot; frame: number }) {
  const grown = pop(frame, lot.start, { damping: 13, stiffness: 140 });
  if (grown < 0.002) return null;
  const length = lot.stalls * STALL;
  const night = nightAt(frame);
  return (
    <group position={[lot.x, 0.1, lot.z]} rotation={[0, lot.along ? Math.PI / 2 : 0, 0]}>
      <mesh position={[0, 0.004, 0]} scale={[grown, 1, grown]} receiveShadow>
        <boxGeometry args={[length + 0.1, 0.008, 0.86]} />
        <meshStandardMaterial color="#45484e" roughness={0.95} />
      </mesh>
      {Array.from({ length: lot.stalls + 1 }, (_, i) => (
        <mesh key={i} position={[(-length / 2 + i * STALL) * grown, 0.01, 0.06]} scale={grown}>
          <boxGeometry args={[0.02, 0.004, 0.62]} />
          <meshStandardMaterial color="#efefe9" roughness={0.7} />
        </mesh>
      ))}
      {lot.cars.map((car, i) => {
        const parked = pop(frame, lot.start + 6 + i * 4, { damping: 11, stiffness: 160 });
        if (parked < 0.002) return null;
        return (
          <group
            key={i}
            position={[-length / 2 + (car.stall + 0.5) * STALL, 0.006, 0.06]}
            rotation={[0, car.flip ? -Math.PI / 2 : Math.PI / 2, 0]}
            scale={parked}
          >
            <CarBody kind={car.kind} color={car.color} night={night} wheelSpin={0} lightsOn={false} />
          </group>
        );
      })}
    </group>
  );
}

export function ParkedCars({ frame }: { frame: number }) {
  return (
    <>
      {LOTS.map((lot, i) => (
        <ParkingLot key={i} lot={lot} frame={frame} />
      ))}
    </>
  );
}

export function Cars({ frame }: { frame: number }) {
  return (
    <>
      {CARS.map((spec, i) => (
        <Car key={i} spec={spec} frame={frame} />
      ))}
    </>
  );
}

// ── Clouds ──────────────────────────────────────────────────────────────

const CLOUDS = [
  { x: -4.6, y: 4.6, z: -3.8, size: 1.1 },
  { x: 4.9, y: 3.6, z: -4.2, size: 0.9 },
  { x: -5.6, y: 2.6, z: 3.4, size: 0.8 },
  { x: 5.4, y: 5.4, z: 2.6, size: 1.0 },
  { x: -1.4, y: 7.4, z: -5.6, size: 1.2 },
  { x: 2.6, y: 6.6, z: -5.2, size: 0.8 },
];

export function Clouds({ frame }: { frame: number }) {
  const night = nightAt(frame);
  return (
    <>
      {CLOUDS.map((cloud, i) => {
        const grown = pop(frame, T.CLOUDS + i * 5, { damping: 12, stiffness: 110 });
        if (grown < 0.002) return null;
        const drift = Math.sin(frame / 70 + i) * 0.35;
        return (
          <group key={i} position={[cloud.x + drift, cloud.y, cloud.z]} scale={cloud.size * grown}>
            {[
              [0, 0, 0, 0.55],
              [0.55, -0.1, 0.1, 0.42],
              [-0.55, -0.12, 0, 0.4],
              [0.2, 0.3, -0.05, 0.42],
              [-0.25, 0.22, 0.12, 0.38],
              [0.95, -0.18, -0.05, 0.3],
              [-0.95, -0.2, 0.05, 0.26],
              [0.5, 0.12, -0.3, 0.32],
            ].map(([px, py, pz, r], k) => (
              <mesh key={k} position={[px, py, pz]} scale={[r, r * 0.88, r]}>
                <sphereGeometry args={[1, 32, 24]} />
                <meshStandardMaterial
                  color={night > 0.5 ? "#8d9cc9" : "#ffffff"}
                  roughness={1}
                  emissive={night > 0.5 ? "#5b6fa8" : "#eaf6ff"}
                  emissiveIntensity={0.22 * (1 - night) + 0.25 * night}
                />
              </mesh>
            ))}
          </group>
        );
      })}
    </>
  );
}
