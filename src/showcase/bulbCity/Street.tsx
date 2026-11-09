import { useMemo, type ReactElement } from "react";
import * as THREE from "three";
import { interpolate, random } from "remotion";
import {
  clamp,
  foliageGeometry,
  Glow,
  goldAt,
  Instances,
  mat,
  nightAt,
  pavingTexture,
  pop,
  T,
  tiled,
} from "./kit";

// The ground of the diorama: a slab with a crossroads (asphalt, double
// yellow lines, lane edges, zebra crossings, stop lines), four raised
// sidewalk blocks, a park with a fountain, and the street furniture – trees,
// lamps, traffic lights, hydrants, benches, bins, bushes.

export const HALF = 5.3; // the slab's half size
const ROAD = 0.72; // half the road's width (where the sidewalks start)
const BLOCK = { from: ROAD, to: 5.1 };
const BLOCK_SIZE = BLOCK.to - BLOCK.from;
const BLOCK_CENTRE = (BLOCK.to + BLOCK.from) / 2;
const SIDEWALK_TOP = 0.1;
const QUADRANTS: [number, number][] = [
  [1, 1],
  [-1, 1],
  [-1, -1],
  [1, -1],
];

function useMarkings() {
  return useMemo(() => {
    const yellow: THREE.Matrix4[] = [];
    const white: THREE.Matrix4[] = [];
    const zebra: THREE.Matrix4[] = [];
    const len = HALF - 1.5;
    const mid = 1.5 + len / 2;
    for (const s of [1, -1]) {
      // double yellow centre lines, both roads
      for (const off of [-0.035, 0.035]) {
        yellow.push(mat(s * mid, 0.026, off, 0, len, 1, 1));
        yellow.push(mat(off, 0.026, s * mid, Math.PI / 2, len, 1, 1));
      }
      // lane edges
      for (const edge of [-0.6, 0.6]) {
        white.push(mat(s * mid, 0.026, edge, 0, len, 1, 1));
        white.push(mat(edge, 0.026, s * mid, Math.PI / 2, len, 1, 1));
      }
      // stop lines, on the incoming lane
      white.push(mat(s * 1.42, 0.026, -s * 0.3, Math.PI / 2, 0.58, 4, 1));
      white.push(mat(s * 0.3, 0.026, s * 1.42, 0, 0.58, 4, 1));
      // zebra crossings
      for (let i = 0; i < 7; i++) {
        const across = -0.54 + i * 0.18;
        zebra.push(mat(s * 1.12, 0.027, across, 0));
        zebra.push(mat(across, 0.027, s * 1.12, Math.PI / 2));
      }
    }
    return { yellow, white, zebra };
  }, []);
}

// ── Street furniture ────────────────────────────────────────────────────

// Points spread over a sphere: where a crown's leafy clumps sit.
const CLUMPS = Array.from({ length: 13 }, (_, i) => {
  const y = 1 - (i / 12) * 2;
  const r = Math.sqrt(1 - y * y);
  const phi = i * 2.399963;
  return new THREE.Vector3(Math.cos(phi) * r, y * 0.8, Math.sin(phi) * r);
});
const GREENS = { top: "#78b856", mid: "#5c9f45", low: "#41823a" };

function Tree({
  x,
  z,
  size,
  seed,
  start,
  frame,
}: {
  x: number;
  z: number;
  size: number;
  seed: string;
  start: number;
  frame: number;
}) {
  const clumps = useMemo(
    () =>
      CLUMPS.map((dir, i) => {
        const jitter = 0.85 + random(`${seed}-j${i}`) * 0.3;
        const at = dir.clone().multiplyScalar(0.21 * jitter);
        const shade = dir.y > 0.35 ? GREENS.top : dir.y < -0.3 ? GREENS.low : GREENS.mid;
        return {
          at,
          scale: 0.12 + random(`${seed}-s${i}`) * 0.06,
          variant: Math.floor(random(`${seed}-v${i}`) * 4),
          color: `#${new THREE.Color(shade).offsetHSL(0, 0, (random(`${seed}-c${i}`) - 0.5) * 0.06).getHexString()}`,
        };
      }),
    [seed],
  );
  const grown = pop(frame, start, { damping: 9, stiffness: 170, mass: 0.5 });
  if (grown < 0.002) return null;
  const sway = Math.sin(frame / 22 + random(seed) * 6) * 0.025;
  return (
    <group position={[x, SIDEWALK_TOP, z]} scale={grown * size} rotation={[sway, 0, sway]}>
      {/* a little square of soil around the trunk */}
      <mesh position={[0, 0.006, 0]} receiveShadow>
        <boxGeometry args={[0.3, 0.012, 0.3]} />
        <meshStandardMaterial color="#5b4636" roughness={1} />
      </mesh>
      <mesh position={[0, 0.24, 0]} castShadow>
        <cylinderGeometry args={[0.032, 0.05, 0.48, 10]} />
        <meshStandardMaterial color="#6e4b33" roughness={0.9} />
      </mesh>
      <mesh position={[0.05, 0.42, 0]} rotation={[0, 0, -0.6]} castShadow>
        <cylinderGeometry args={[0.014, 0.022, 0.18, 8]} />
        <meshStandardMaterial color="#6e4b33" roughness={0.9} />
      </mesh>
      <group position={[0, 0.7, 0]}>
        <mesh geometry={foliageGeometry(0)} scale={0.24} castShadow receiveShadow>
          <meshStandardMaterial color={GREENS.mid} roughness={0.9} />
        </mesh>
        {clumps.map((clump, i) => (
          <mesh
            key={i}
            geometry={foliageGeometry(clump.variant)}
            position={clump.at}
            scale={clump.scale}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color={clump.color} roughness={0.88} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Lamp({
  x,
  z,
  facing,
  start,
  frame,
}: {
  x: number;
  z: number;
  facing: number;
  start: number;
  frame: number;
}) {
  const grown = pop(frame, start);
  if (grown < 0.002) return null;
  const night = nightAt(frame);
  const metal = <meshStandardMaterial color="#1f2a27" metalness={0.5} roughness={0.5} />;
  return (
    <group position={[x, SIDEWALK_TOP, z]} rotation={[0, facing, 0]} scale={grown}>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.045, 0.055, 0.08, 12]} />
        {metal}
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.024, 1.0, 10]} />
        {metal}
      </mesh>
      <mesh position={[0.11, 1.04, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, 0.24, 8]} />
        {metal}
      </mesh>
      <mesh position={[0.22, 1.02, 0]}>
        <boxGeometry args={[0.13, 0.05, 0.08]} />
        {metal}
      </mesh>
      <mesh position={[0.22, 0.993, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.1, 0.06]} />
        <meshBasicMaterial color={night > 0.05 ? "#fff1c6" : "#d8d4c8"} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <Glow position={[0.22, 0.97, 0]} scale={0.9 * night} opacity={0.9} />
      {/* the pool of light on the pavement */}
      {night > 0.02 ? (
        <mesh position={[0.22, 0.012 - SIDEWALK_TOP + 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.42, 32]} />
          <meshBasicMaterial
            color="#ffcf80"
            transparent
            opacity={0.22 * night}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ) : null}
    </group>
  );
}

// Green 60 frames, amber 15, red 75; the two roads take turns.
function signal(frame: number, offset: number): 0 | 1 | 2 {
  const t = (((frame + offset) % 150) + 150) % 150;
  return t < 60 ? 2 : t < 75 ? 1 : 0;
}

function TrafficLight({
  x,
  z,
  facing,
  offset,
  start,
  frame,
}: {
  x: number;
  z: number;
  facing: number;
  offset: number;
  start: number;
  frame: number;
}) {
  const grown = pop(frame, start);
  if (grown < 0.002) return null;
  const on = signal(frame, offset);
  const colors = ["#ff3b30", "#ffb020", "#34d27b"];
  return (
    <group position={[x, SIDEWALK_TOP, z]} rotation={[0, facing, 0]} scale={grown}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.028, 1.0, 10]} />
        <meshStandardMaterial color="#2a2c2f" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0.2, 0.97, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.014, 0.014, 0.4, 8]} />
        <meshStandardMaterial color="#2a2c2f" metalness={0.5} roughness={0.5} />
      </mesh>
      <group position={[0.36, 0.86, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.09, 0.27, 0.08]} />
          <meshStandardMaterial color="#d9b13b" roughness={0.6} />
        </mesh>
        {colors.map((color, i) => (
          <mesh key={color} position={[0, 0.085 - i * 0.085, 0.043]}>
            <sphereGeometry args={[0.028, 16, 16]} />
            <meshBasicMaterial
              color={on === i ? color : "#2b2b2b"}
              toneMapped={on !== i}
            />
          </mesh>
        ))}
        {(() => {
          const y = 0.085 - on * 0.085;
          return <Glow position={[0, y, 0.06]} scale={0.32} opacity={0.6} />;
        })()}
      </group>
    </group>
  );
}

function Hydrant({ x, z, start, frame }: { x: number; z: number; start: number; frame: number }) {
  const grown = pop(frame, start);
  if (grown < 0.002) return null;
  const red = <meshStandardMaterial color="#c8302a" roughness={0.5} />;
  return (
    <group position={[x, SIDEWALK_TOP, z]} scale={grown}>
      <mesh position={[0, 0.07, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.04, 0.14, 12]} />
        {red}
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.038, 12, 12]} />
        {red}
      </mesh>
      <mesh position={[0, 0.09, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.016, 0.016, 0.11, 8]} />
        {red}
      </mesh>
    </group>
  );
}

function Bench({ x, z, ry, start, frame }: { x: number; z: number; ry: number; start: number; frame: number }) {
  const grown = pop(frame, start);
  if (grown < 0.002) return null;
  const wood = <meshStandardMaterial color="#8a5a3a" roughness={0.8} />;
  const iron = <meshStandardMaterial color="#2c2c30" metalness={0.5} roughness={0.5} />;
  return (
    <group position={[x, SIDEWALK_TOP, z]} rotation={[0, ry, 0]} scale={grown}>
      <mesh position={[0, 0.1, 0]} castShadow>
        <boxGeometry args={[0.42, 0.025, 0.13]} />
        {wood}
      </mesh>
      <mesh position={[0, 0.19, -0.06]} rotation={[-0.2, 0, 0]} castShadow>
        <boxGeometry args={[0.42, 0.11, 0.02]} />
        {wood}
      </mesh>
      {[-0.17, 0.17].map((lx) => (
        <mesh key={lx} position={[lx, 0.05, 0]}>
          <boxGeometry args={[0.025, 0.1, 0.12]} />
          {iron}
        </mesh>
      ))}
    </group>
  );
}

function Bin({ x, z, start, frame }: { x: number; z: number; start: number; frame: number }) {
  const grown = pop(frame, start);
  if (grown < 0.002) return null;
  return (
    <mesh position={[x, SIDEWALK_TOP + 0.08 * grown, z]} scale={grown} castShadow>
      <cylinderGeometry args={[0.05, 0.045, 0.16, 14]} />
      <meshStandardMaterial color="#2f5d4a" roughness={0.6} />
    </mesh>
  );
}

function Bush({ x, z, size, seed, start, frame }: { x: number; z: number; size: number; seed: string; start: number; frame: number }) {
  const grown = pop(frame, start, { damping: 9, stiffness: 180, mass: 0.4 });
  if (grown < 0.002) return null;
  return (
    <mesh
      geometry={foliageGeometry(Math.floor(random(seed) * 4))}
      position={[x, SIDEWALK_TOP + 0.08 * size, z]}
      scale={[0.17 * size * grown, 0.12 * size * grown, 0.17 * size * grown]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={random(`${seed}-c`) < 0.5 ? "#3d7a35" : "#4f8f3a"} roughness={0.9} />
    </mesh>
  );
}

// ── The park (front quadrant) ────────────────────────────────────────────

function Park({ frame }: { frame: number }) {
  const c = BLOCK_CENTRE;
  const grass = pop(frame, T.SLAB + 12);
  const night = nightAt(frame);
  const spray = 1 + Math.sin(frame / 4) * 0.08;
  const fountain = pop(frame, T.PROPS + 4);
  return (
    <group>
      {grass > 0.002 ? (
        <group position={[c, SIDEWALK_TOP, c]} scale={[grass, 1, grass]}>
          <mesh position={[0, 0.012, 0]} receiveShadow>
            <boxGeometry args={[BLOCK_SIZE - 0.5, 0.024, BLOCK_SIZE - 0.5]} />
            <meshStandardMaterial color="#6aa94f" roughness={0.95} />
          </mesh>
          {[0, Math.PI / 2].map((ry) => (
            <mesh key={ry} position={[0, 0.026, 0]} rotation={[0, ry, 0]} receiveShadow>
              <boxGeometry args={[BLOCK_SIZE - 0.5, 0.008, 0.36]} />
              <meshStandardMaterial color="#d8ccb0" roughness={0.95} />
            </mesh>
          ))}
        </group>
      ) : null}
      {fountain > 0.002 ? (
        <group position={[c, SIDEWALK_TOP + 0.02, c]} scale={fountain}>
          <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.55, 0.58, 0.14, 48]} />
            <meshStandardMaterial color="#d3cab9" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.145, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.49, 48]} />
            <meshStandardMaterial color="#4fa6cf" metalness={0.2} roughness={0.05} envMapIntensity={2} />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <cylinderGeometry args={[0.06, 0.09, 0.3, 16]} />
            <meshStandardMaterial color="#d3cab9" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.44, 0]}>
            <cylinderGeometry args={[0.2, 0.08, 0.06, 32]} />
            <meshStandardMaterial color="#d3cab9" roughness={0.8} />
          </mesh>
          {/* the water jet */}
          <mesh position={[0, 0.62 * spray, 0]} scale={[1, spray, 1]}>
            <coneGeometry args={[0.16, 0.36, 24, 1, true]} />
            <meshStandardMaterial
              color="#bfe8ff"
              transparent
              opacity={0.55}
              roughness={0.05}
              emissive="#9ad6ff"
              emissiveIntensity={0.2 + night * 0.8}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      ) : null}
      {[
        [-1.1, -1.1],
        [1.1, -1.1],
        [-1.1, 1.1],
        [1.1, 1.1],
      ].map(([dx, dz], i) => (
        <Tree key={i} x={c + dx} z={c + dz} size={1.55} seed={`park-${i}`} start={T.PROPS + 8 + i * 3} frame={frame} />
      ))}
      <Bench x={c + 0.65} z={c - 0.42} ry={Math.PI} start={T.PROPS + 18} frame={frame} />
      <Bench x={c - 0.42} z={c + 0.65} ry={Math.PI / 2} start={T.PROPS + 20} frame={frame} />
      {Array.from({ length: 10 }, (_, i) => {
        const along = -1.9 + i * 0.42;
        const edge = BLOCK_SIZE / 2 - 0.12;
        return (
          <group key={i}>
            <Bush x={c + along} z={c + edge} size={1} seed={`hb-${i}`} start={T.PROPS + 14 + i} frame={frame} />
            <Bush x={c + edge} z={c + along} size={1} seed={`hc-${i}`} start={T.PROPS + 15 + i} frame={frame} />
          </group>
        );
      })}
    </group>
  );
}

// ── Everything on the ground ────────────────────────────────────────────

export function Street({ frame }: { frame: number }) {
  const markings = useMarkings();
  const paving = useMemo(() => tiled(pavingTexture(), BLOCK_SIZE, BLOCK_SIZE, 0.5), []);
  const slab = pop(frame, T.SLAB, { damping: 15, stiffness: 120, mass: 0.7 });
  if (slab < 0.002) return null;

  // Along each road edge of a building block: tree, lamp, tree, bush.
  const furniture: ReactElement[] = [];
  QUADRANTS.forEach(([sx, sz], q) => {
    if (q === 0) return; // the park has its own
    [0, 1].forEach((axis) => {
      const place = (along: number): [number, number] =>
        axis === 0 ? [sx * along, sz * 0.94] : [sx * 0.94, sz * along];
      const delay = T.PROPS + q * 4 + axis * 2;
      const [tx1, tz1] = place(1.5);
      const [lx, lz] = place(2.6);
      const [tx2, tz2] = place(3.7);
      const [bx, bz] = place(4.75);
      furniture.push(
        <Tree key={`t1-${q}-${axis}`} x={tx1} z={tz1} size={1} seed={`st-${q}-${axis}-1`} start={delay} frame={frame} />,
        <Lamp
          key={`l-${q}-${axis}`}
          x={lx}
          z={lz}
          facing={axis === 0 ? (sz > 0 ? Math.PI / 2 : -Math.PI / 2) : sx > 0 ? Math.PI : 0}
          start={delay + 3}
          frame={frame}
        />,
        <Tree key={`t2-${q}-${axis}`} x={tx2} z={tz2} size={1.1} seed={`st-${q}-${axis}-2`} start={delay + 6} frame={frame} />,
        <Bush key={`b-${q}-${axis}`} x={bx} z={bz} size={1.3} seed={`sb-${q}-${axis}`} start={delay + 8} frame={frame} />,
      );
    });
  });

  return (
    <group>
      <group scale={[slab, 1, slab]}>
        {/* the slab: concrete sides, a lip, asphalt on top */}
        <mesh position={[0, -0.26, 0]} receiveShadow castShadow>
          <boxGeometry args={[HALF * 2 + 0.1, 0.5, HALF * 2 + 0.1]} />
          <meshStandardMaterial color="#a39c8f" roughness={0.95} />
        </mesh>
        <mesh position={[0, -0.005, 0]}>
          <boxGeometry args={[HALF * 2 + 0.22, 0.03, HALF * 2 + 0.22]} />
          <meshStandardMaterial color="#c4beb2" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.01, 0]} receiveShadow>
          <boxGeometry args={[HALF * 2, 0.02, HALF * 2]} />
          <meshStandardMaterial color="#393c41" roughness={0.92} />
        </mesh>
        {goldAt(frame, T.SLAB) > 0.003 ? (
          <mesh position={[0, 0.05, 0]} renderOrder={5}>
            <boxGeometry args={[HALF * 2 + 0.1, 0.12, HALF * 2 + 0.1]} />
            <meshBasicMaterial
              color={[1.6, 1.1, 0.5]}
              transparent
              opacity={goldAt(frame, T.SLAB) * 0.3}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        ) : null}
        <Instances matrices={markings.yellow}>
          <boxGeometry args={[1, 0.004, 0.03]} />
          <meshStandardMaterial color="#e6c02f" roughness={0.7} />
        </Instances>
        <Instances matrices={markings.white}>
          <boxGeometry args={[1, 0.004, 0.025]} />
          <meshStandardMaterial color="#efefe9" roughness={0.7} />
        </Instances>
        <Instances matrices={markings.zebra}>
          <boxGeometry args={[0.42, 0.004, 0.1]} />
          <meshStandardMaterial color="#efefe9" roughness={0.7} />
        </Instances>
        {/* two manhole covers */}
        {[
          [2.6, 0.32],
          [-0.3, -3.1],
        ].map(([mx, mz], i) => (
          <mesh key={i} position={[mx, 0.022, mz]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.11, 24]} />
            <meshStandardMaterial color="#26282b" metalness={0.5} roughness={0.6} />
          </mesh>
        ))}
      </group>

      {/* raised sidewalk blocks with a curb */}
      {QUADRANTS.map(([sx, sz], q) => {
        const up = pop(frame, T.SLAB + 6 + q * 3, { damping: 12, stiffness: 160 });
        if (up < 0.002) return null;
        return (
          <group key={q} position={[sx * BLOCK_CENTRE, 0, sz * BLOCK_CENTRE]} scale={[1, up, 1]}>
            <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
              <boxGeometry args={[BLOCK_SIZE, 0.08, BLOCK_SIZE]} />
              <meshStandardMaterial attach="material-0" color="#d7d2c8" roughness={0.85} />
              <meshStandardMaterial attach="material-1" color="#d7d2c8" roughness={0.85} />
              <meshStandardMaterial attach="material-2" map={paving} roughness={0.92} />
              <meshStandardMaterial attach="material-3" color="#bdb8ae" />
              <meshStandardMaterial attach="material-4" color="#d7d2c8" roughness={0.85} />
              <meshStandardMaterial attach="material-5" color="#d7d2c8" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.055, 0]}>
              <boxGeometry args={[BLOCK_SIZE + 0.03, 0.07, BLOCK_SIZE + 0.03]} />
              <meshStandardMaterial color="#d7d2c8" roughness={0.85} />
            </mesh>
          </group>
        );
      })}

      <Park frame={frame} />
      {furniture}

      {/* traffic lights on the four corners of the crossroads */}
      {QUADRANTS.map(([sx, sz], q) => (
        <TrafficLight
          key={q}
          x={sx * 0.9}
          z={sz * 0.9}
          facing={[Math.PI * 0.75, Math.PI * 0.25, -Math.PI * 0.25, -Math.PI * 0.75][q]}
          offset={q % 2 ? 75 : 0}
          start={T.PROPS - 6 + q * 2}
          frame={frame}
        />
      ))}
      {/* a small square behind the tower: trees, benches, planters */}
      {[-1.6, -2.9, -4.2].map((tx, i) => (
        <Tree key={`sq-${i}`} x={tx} z={-4.55} size={1.15} seed={`sq-${i}`} start={T.PROPS + 22 + i * 3} frame={frame} />
      ))}
      <Bench x={-2.25} z={-4.25} ry={0} start={T.PROPS + 30} frame={frame} />
      <Bench x={-3.55} z={-4.25} ry={0} start={T.PROPS + 32} frame={frame} />
      {[4.85, 4.85].map((bx, i) => (
        <Bush key={`rb-${i}`} x={bx} z={-1.6 - i * 1.4} size={1.4} seed={`rb-${i}`} start={T.PROPS + 26 + i * 2} frame={frame} />
      ))}
      <Hydrant x={-1.45} z={0.92} start={T.PROPS + 12} frame={frame} />
      <Hydrant x={1.4} z={-0.92} start={T.PROPS + 13} frame={frame} />
      <Bin x={-0.92} z={-1.35} start={T.PROPS + 14} frame={frame} />
      <Bin x={0.92} z={1.45} start={T.PROPS + 15} frame={frame} />
    </group>
  );
}

// How far the crossroads' night lights reach – shared with the scene's lights.
export const nightGlow = (frame: number) =>
  interpolate(frame, [T.NIGHT - 20, T.NIGHT + 10], [0, 1], clamp);
