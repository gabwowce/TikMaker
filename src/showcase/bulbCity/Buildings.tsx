import { useMemo } from "react";
import * as THREE from "three";
import { interpolate, random } from "remotion";
import {
  brickTexture,
  clamp,
  goldAt,
  Instances,
  mat,
  nightAt,
  officeLightsTexture,
  pop,
  stripesTexture,
  T,
  tiled,
} from "./kit";

// The city's buildings: brick walk-ups (windows with frames, sills and
// lintels on the walls only; a cornice and parapet on top; chimneys, AC
// units, a water tower, a fire escape) and one glass office tower.

const GROUND = 0.1; // the sidewalk's top

type Side = { ry: number; half: number; len: number };

function sides(w: number, d: number): Side[] {
  return [
    { ry: 0, half: d / 2, len: w },
    { ry: Math.PI, half: d / 2, len: w },
    { ry: Math.PI / 2, half: w / 2, len: d },
    { ry: -Math.PI / 2, half: w / 2, len: d },
  ];
}

// A point on a facade: `u` along it, `out` from the building's centre.
function on(side: Side, u: number, out: number): [number, number] {
  const c = Math.cos(side.ry);
  const s = Math.sin(side.ry);
  return [u * c + out * s, -u * s + out * c];
}

// Windows lit at night come on in three waves per building.
function windowGlow(frame: number, delay: number, wave: number) {
  const start = T.NIGHT - 34 + delay * 26 + wave * 11;
  return interpolate(frame, [start, start + 8], [0, 2.6], clamp);
}

// A building made of light as it rises, cooling to its own colours: a shell
// of warm light around it, added on top, that fades.
function LightShell({ w, h, d, glow }: { w: number; h: number; d: number; glow: number }) {
  if (glow <= 0.003) return null;
  return (
    <mesh position={[0, h / 2, 0]} renderOrder={5}>
      <boxGeometry args={[w + 0.08, h + 0.08, d + 0.08]} />
      <meshBasicMaterial
        color={[1.7, 1.15, 0.5]}
        transparent
        opacity={glow * 0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

// ── Brick walk-up ────────────────────────────────────────────────────────

export type BrickSpec = {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  floors: number;
  brick: string;
  trim: string;
  start: number;
  lightDelay: number;
  fireEscape?: boolean;
  waterTower?: boolean;
  // the side with a shop front and a striped awning (0 = +z, 1 = −z, 2 = +x, 3 = −x)
  shop?: { side: number; awning: string };
  door: number;
};

const FLOOR = 0.42;

function useWindows(spec: BrickSpec) {
  return useMemo(() => {
    const groundH = FLOOR * 1.35;
    const frames: THREE.Matrix4[] = [];
    const sills: THREE.Matrix4[] = [];
    const lintels: THREE.Matrix4[] = [];
    const dark: THREE.Matrix4[] = [];
    const lit: THREE.Matrix4[][] = [[], [], []];
    const shopGlass: THREE.Matrix4[] = [];
    const shopFrames: THREE.Matrix4[] = [];
    sides(spec.w, spec.d).forEach((side, si) => {
      const cols = Math.max(1, Math.floor((side.len - 0.2) / 0.4));
      const spacing = side.len / cols;
      const isShop = spec.shop?.side === si;
      // ground floor: a shop front, or taller windows and a door
      if (isShop) {
        const panes = Math.max(1, Math.floor(side.len / 0.62));
        const ps = side.len / panes;
        for (let c = 0; c < panes; c++) {
          const u = -side.len / 2 + ps * (c + 0.5);
          const [x, z] = on(side, u, side.half + 0.012);
          shopFrames.push(mat(x, groundH * 0.48, z, side.ry, ps - 0.04, groundH * 0.82, 0.04));
          const [gx, gz] = on(side, u, side.half + 0.03);
          shopGlass.push(mat(gx, groundH * 0.5, gz, side.ry, ps - 0.13, groundH * 0.66, 0.02));
        }
      }
      for (let f = isShop ? 1 : 0; f < spec.floors; f++) {
        const ground = f === 0;
        const y = ground ? groundH * 0.5 : groundH + (f - 1) * FLOOR + FLOOR * 0.52;
        const tall = ground ? 1.3 : 1;
        for (let c = 0; c < cols; c++) {
          const u = -side.len / 2 + spacing * (c + 0.5);
          if (ground && si === spec.door && c === Math.floor(cols / 2)) continue;
          const [fx, fz] = on(side, u, side.half + 0.012);
          frames.push(mat(fx, y, fz, side.ry, 1, tall, 1));
          const [gx, gz] = on(side, u, side.half + 0.03);
          const glass = mat(gx, y, gz, side.ry, 1, tall, 1);
          if (random(`lit-${spec.id}-${si}-${f}-${c}`) < 0.62)
            lit[Math.floor(random(`wave-${spec.id}-${si}-${f}-${c}`) * 3)].push(glass);
          else dark.push(glass);
          const [sx, sz] = on(side, u, side.half + 0.035);
          sills.push(mat(sx, y - 0.2 * tall, sz, side.ry));
          lintels.push(mat(sx, y + 0.2 * tall, sz, side.ry));
        }
      }
    });
    return { frames, sills, lintels, dark, lit, shopGlass, shopFrames, groundH };
  }, [spec]);
}

const GLASS_DAY = "#2d3b4b";

function FireEscape({ spec, groundH }: { spec: BrickSpec; groundH: number }) {
  const parts = useMemo(() => {
    const width = Math.min(1.0, spec.w * 0.45);
    const u0 = -spec.w * 0.22;
    const z = spec.d / 2 + 0.18;
    const slabs: THREE.Matrix4[] = [];
    const rails: THREE.Matrix4[] = [];
    const posts: THREE.Matrix4[] = [];
    for (let f = 1; f < spec.floors; f++) {
      const y = groundH + (f - 1) * FLOOR + 0.02;
      slabs.push(mat(u0, y, z, 0, width, 1, 0.34));
      rails.push(mat(u0, y + 0.22, z + 0.16, 0, width, 1, 1));
      rails.push(mat(u0 - width / 2, y + 0.22, z, Math.PI / 2, 0.34, 1, 1));
      rails.push(mat(u0 + width / 2, y + 0.22, z, Math.PI / 2, 0.34, 1, 1));
      for (let p = 0; p <= 5; p++)
        posts.push(mat(u0 - width / 2 + (width * p) / 5, y + 0.11, z + 0.16));
      if (f < spec.floors - 1) {
        const run = width * 0.8;
        const angle = Math.atan2(FLOOR, run) * (f % 2 ? 1 : -1);
        const length = Math.hypot(run, FLOOR);
        slabs.push(mat(u0, y + FLOOR / 2, z - 0.02, 0, length / width, 1, 0.22 / 0.34, 0, angle));
        rails.push(mat(u0, y + FLOOR / 2 + 0.18, z + 0.08, 0, length, 1, 1, 0, angle));
      }
    }
    return { slabs, rails, posts, width };
  }, [spec, groundH]);
  const iron = (
    <meshStandardMaterial color="#2a2b30" metalness={0.55} roughness={0.45} />
  );
  return (
    <group>
      <Instances matrices={parts.slabs} castShadow>
        <boxGeometry args={[parts.width, 0.025, 0.34]} />
        {iron}
      </Instances>
      <Instances matrices={parts.rails}>
        <boxGeometry args={[1, 0.018, 0.018]} />
        {iron}
      </Instances>
      <Instances matrices={parts.posts}>
        <boxGeometry args={[0.014, 0.22, 0.014]} />
        {iron}
      </Instances>
    </group>
  );
}

function WaterTower({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {[
        [-0.17, -0.17],
        [0.17, -0.17],
        [-0.17, 0.17],
        [0.17, 0.17],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.18, lz]} castShadow>
          <cylinderGeometry args={[0.02, 0.025, 0.36, 8]} />
          <meshStandardMaterial color="#3a3a3d" metalness={0.4} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.58, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.46, 32]} />
        <meshStandardMaterial color="#8a5a3b" roughness={0.85} />
      </mesh>
      {[0.42, 0.58, 0.74].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <torusGeometry args={[0.305, 0.012, 6, 40]} />
          <meshStandardMaterial color="#2f2f33" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 0.93, 0]} castShadow>
        <coneGeometry args={[0.34, 0.26, 32]} />
        <meshStandardMaterial color="#4b3426" roughness={0.8} />
      </mesh>
    </group>
  );
}

export function BrickBuilding({ spec, frame }: { spec: BrickSpec; frame: number }) {
  const win = useWindows(spec);
  const height = win.groundH + (spec.floors - 1) * FLOOR;
  const walls = useMemo(() => {
    const brick = brickTexture(spec.brick);
    return {
      front: tiled(brick, spec.w, height),
      side: tiled(brick, spec.d, height),
    };
  }, [spec, height]);
  const grown = pop(frame, spec.start, { damping: 13, stiffness: 110, mass: 0.7 });
  if (grown < 0.002) return null;

  const night = nightAt(frame);
  const trim = <meshStandardMaterial color={spec.trim} roughness={0.7} />;
  const roof = <meshStandardMaterial color="#55524e" roughness={0.95} />;
  return (
    <group position={[spec.x, GROUND, spec.z]} scale={[1, grown, 1]}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[spec.w, height, spec.d]} />
        <meshStandardMaterial attach="material-0" map={walls.side} roughness={0.9} />
        <meshStandardMaterial attach="material-1" map={walls.side} roughness={0.9} />
        <meshStandardMaterial attach="material-2" color="#55524e" roughness={0.95} />
        <meshStandardMaterial attach="material-3" color="#55524e" />
        <meshStandardMaterial attach="material-4" map={walls.front} roughness={0.9} />
        <meshStandardMaterial attach="material-5" map={walls.front} roughness={0.9} />
      </mesh>
      {/* plinth, belt course above the ground floor, cornice and parapet */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[spec.w + 0.03, 0.12, spec.d + 0.03]} />
        <meshStandardMaterial color="#8e867a" roughness={0.9} />
      </mesh>
      <mesh position={[0, win.groundH, 0]}>
        <boxGeometry args={[spec.w + 0.05, 0.05, spec.d + 0.05]} />
        {trim}
      </mesh>
      <mesh position={[0, height - 0.06, 0]}>
        <boxGeometry args={[spec.w + 0.08, 0.05, spec.d + 0.08]} />
        {trim}
      </mesh>
      <mesh position={[0, height + 0.04, 0]} castShadow>
        <boxGeometry args={[spec.w + 0.16, 0.12, spec.d + 0.16]} />
        {trim}
      </mesh>
      {sides(spec.w, spec.d).map((side, i) => {
        const [x, z] = on(side, 0, side.half + 0.02);
        return (
          <mesh key={i} position={[x, height + 0.17, z]} rotation={[0, side.ry, 0]} castShadow>
            <boxGeometry args={[side.len + 0.12, 0.14, 0.06]} />
            {roof}
          </mesh>
        );
      })}

      {/* windows: frame, glass (some lit at night), sill and lintel */}
      <Instances matrices={win.frames}>
        <boxGeometry args={[0.25, 0.36, 0.04]} />
        <meshStandardMaterial color="#f1ebe0" roughness={0.6} />
      </Instances>
      <Instances matrices={win.dark}>
        <boxGeometry args={[0.19, 0.29, 0.02]} />
        <meshStandardMaterial color={GLASS_DAY} metalness={0.3} roughness={0.12} envMapIntensity={1.4} />
      </Instances>
      {win.lit.map((group, wave) => (
        <Instances key={wave} matrices={group}>
          <boxGeometry args={[0.19, 0.29, 0.02]} />
          <meshStandardMaterial
            color={GLASS_DAY}
            metalness={0.3}
            roughness={0.12}
            envMapIntensity={1.4}
            emissive="#ffc46a"
            emissiveIntensity={windowGlow(frame, spec.lightDelay, wave)}
          />
        </Instances>
      ))}
      <Instances matrices={win.sills}>
        <boxGeometry args={[0.29, 0.035, 0.07]} />
        {trim}
      </Instances>
      <Instances matrices={win.lintels}>
        <boxGeometry args={[0.29, 0.05, 0.04]} />
        {trim}
      </Instances>

      {/* the door */}
      {(() => {
        const side = sides(spec.w, spec.d)[spec.door];
        const [x, z] = on(side, 0, side.half + 0.015);
        const [sx, sz] = on(side, 0, side.half + 0.1);
        return (
          <group>
            <mesh position={[x, 0.3, z]} rotation={[0, side.ry, 0]}>
              <boxGeometry args={[0.3, 0.5, 0.04]} />
              <meshStandardMaterial color="#4a2d20" roughness={0.6} />
            </mesh>
            <mesh position={[sx, 0.04, sz]} rotation={[0, side.ry, 0]} receiveShadow>
              <boxGeometry args={[0.46, 0.08, 0.18]} />
              <meshStandardMaterial color="#b7b0a3" roughness={0.9} />
            </mesh>
          </group>
        );
      })()}

      {/* shop front and its awning */}
      {spec.shop ? (
        <ShopFront spec={spec} frames={win.shopFrames} glass={win.shopGlass} groundH={win.groundH} night={night} />
      ) : null}

      {spec.fireEscape ? <FireEscape spec={spec} groundH={win.groundH} /> : null}

      <LightShell w={spec.w} h={height + 0.3} d={spec.d} glow={goldAt(frame, spec.start)} />

      {/* the roof: chimneys, AC units, maybe a water tower */}
      <group position={[0, height + 0.1, 0]}>
        {[
          [spec.w * 0.33, -spec.d * 0.3],
          [-spec.w * 0.36, -spec.d * 0.32],
        ].map(([cx, cz], i) => (
          <group key={i} position={[cx, 0, cz]}>
            <mesh position={[0, 0.18, 0]} castShadow>
              <boxGeometry args={[0.16, 0.36, 0.16]} />
              <meshStandardMaterial map={walls.side} roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.38, 0]}>
              <boxGeometry args={[0.2, 0.04, 0.2]} />
              {trim}
            </mesh>
          </group>
        ))}
        {[
          [spec.w * 0.22, spec.d * 0.22],
          [spec.w * 0.02, spec.d * 0.28],
        ].map(([ax, az], i) => (
          <group key={i} position={[ax, 0, az]}>
            <mesh position={[0, 0.08, 0]} castShadow>
              <boxGeometry args={[0.26, 0.16, 0.2]} />
              <meshStandardMaterial color="#c9ccd0" metalness={0.3} roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.165, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.07, 20]} />
              <meshStandardMaterial color="#45484d" />
            </mesh>
          </group>
        ))}
        {spec.waterTower ? <WaterTower x={-spec.w * 0.18} z={spec.d * 0.12} /> : null}
      </group>
    </group>
  );
}

function ShopFront({
  spec,
  frames,
  glass,
  groundH,
  night,
}: {
  spec: BrickSpec;
  frames: THREE.Matrix4[];
  glass: THREE.Matrix4[];
  groundH: number;
  night: number;
}) {
  const shop = spec.shop!;
  const side = sides(spec.w, spec.d)[shop.side];
  const awning = useMemo(() => {
    const texture = stripesTexture(shop.awning).clone();
    texture.needsUpdate = true;
    texture.repeat.set((side.len * 0.9) / 0.3, 1);
    return texture;
  }, [shop.awning, side.len]);
  const [ax, az] = on(side, 0, side.half + 0.2);
  return (
    <group>
      <Instances matrices={frames}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#21443a" roughness={0.5} />
      </Instances>
      <Instances matrices={glass}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#33424f"
          metalness={0.3}
          roughness={0.1}
          envMapIntensity={1.5}
          emissive="#ffd28a"
          emissiveIntensity={0.25 + night * 2.2}
        />
      </Instances>
      <mesh
        position={[ax, groundH + 0.02, az]}
        rotation={[0.42, side.ry, 0]}
        castShadow
      >
        <boxGeometry args={[side.len * 0.9, 0.025, 0.42]} />
        <meshStandardMaterial map={awning} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ── Glass office tower ──────────────────────────────────────────────────

export type TowerSpec = {
  x: number;
  z: number;
  w: number;
  d: number;
  floors: number;
  start: number;
};

export function GlassTower({ spec, frame }: { spec: TowerSpec; frame: number }) {
  const lobby = 0.55;
  const height = lobby + spec.floors * FLOOR;
  const detail = useMemo(() => {
    const fins: THREE.Matrix4[] = [];
    const bands: THREE.Matrix4[] = [];
    sides(spec.w, spec.d).forEach((side) => {
      const count = Math.round(side.len / 0.38);
      for (let i = 0; i <= count; i++) {
        const u = -side.len / 2 + (side.len * i) / count;
        const [x, z] = on(side, u, side.half + 0.02);
        fins.push(mat(x, lobby + (height - lobby) / 2, z, side.ry, 1, height - lobby, 1));
      }
      for (let f = 0; f <= spec.floors; f++) {
        const [x, z] = on(side, 0, side.half + 0.025);
        bands.push(mat(x, lobby + f * FLOOR, z, side.ry, side.len + 0.06, 1, 1));
      }
    });
    const office = officeLightsTexture();
    const lights = (len: number) => {
      const texture = office.clone();
      texture.needsUpdate = true;
      texture.repeat.set(len / (8 * 0.38), spec.floors / 8);
      return texture;
    };
    return { fins, bands, front: lights(spec.w), side: lights(spec.d) };
  }, [spec, height]);
  const grown = pop(frame, spec.start, { damping: 14, stiffness: 90, mass: 0.8 });
  if (grown < 0.002) return null;
  const night = nightAt(frame);
  const glow = interpolate(frame, [T.NIGHT - 28, T.NIGHT + 6], [0, 1.35], clamp);
  const glassMaterial = (map: THREE.Texture, index: number) => (
    <meshPhysicalMaterial
      attach={`material-${index}`}
      color="#8db7d6"
      metalness={0.75}
      roughness={0.06}
      envMapIntensity={1.8}
      clearcoat={0.6}
      emissive="#ffe0a8"
      emissiveMap={map}
      emissiveIntensity={glow}
    />
  );
  return (
    <group position={[spec.x, GROUND, spec.z]} scale={[1, grown, 1]}>
      {/* lobby */}
      <mesh position={[0, lobby / 2, 0]} receiveShadow>
        <boxGeometry args={[spec.w - 0.14, lobby, spec.d - 0.14]} />
        <meshStandardMaterial
          color="#2c3a46"
          metalness={0.4}
          roughness={0.1}
          emissive="#ffe2b0"
          emissiveIntensity={0.2 + night * 1.6}
        />
      </mesh>
      {/* the glass shaft */}
      <mesh position={[0, lobby + (height - lobby) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[spec.w, height - lobby, spec.d]} />
        {glassMaterial(detail.side, 0)}
        {glassMaterial(detail.side, 1)}
        <meshStandardMaterial attach="material-2" color="#5e6166" roughness={0.9} />
        <meshStandardMaterial attach="material-3" color="#5e6166" />
        {glassMaterial(detail.front, 4)}
        {glassMaterial(detail.front, 5)}
      </mesh>
      <Instances matrices={detail.fins}>
        <boxGeometry args={[0.03, 1, 0.06]} />
        <meshStandardMaterial color="#cfd6dd" metalness={0.6} roughness={0.35} />
      </Instances>
      <Instances matrices={detail.bands}>
        <boxGeometry args={[1, 0.05, 0.05]} />
        <meshStandardMaterial color="#e3e7ea" metalness={0.4} roughness={0.4} />
      </Instances>
      <LightShell w={spec.w} h={height + 0.4} d={spec.d} glow={goldAt(frame, spec.start)} />
      {/* entrance canopy */}
      <mesh position={[0, lobby + 0.02, spec.d / 2 + 0.16]} castShadow>
        <boxGeometry args={[spec.w * 0.5, 0.05, 0.36]} />
        <meshStandardMaterial color="#d9dde1" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* crown, rooftop plant room and antenna with its red light */}
      <mesh position={[0, height + 0.12, 0]} castShadow>
        <boxGeometry args={[spec.w + 0.08, 0.24, spec.d + 0.08]} />
        <meshStandardMaterial color="#d4d8dc" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0.2, height + 0.42, -0.15]} castShadow>
        <boxGeometry args={[0.9, 0.36, 0.7]} />
        <meshStandardMaterial color="#9aa0a6" roughness={0.7} />
      </mesh>
      <mesh position={[-0.45, height + 0.9, 0.35]}>
        <cylinderGeometry args={[0.02, 0.03, 1.3, 8]} />
        <meshStandardMaterial color="#b9bec4" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.45, height + 1.57, 0.35]}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshBasicMaterial
          color="#ff3b30"
          toneMapped={false}
          transparent
          opacity={0.4 + 0.6 * (Math.sin(frame / 6) > 0 ? night : 0.2 * night)}
        />
      </mesh>
    </group>
  );
}

// ── The line-up ─────────────────────────────────────────────────────────

export const BRICKS: BrickSpec[] = [
  {
    id: "walkup",
    x: -2.75,
    z: 2.7,
    w: 2.3,
    d: 2.0,
    floors: 8,
    brick: "#a8492f",
    trim: "#efe4d2",
    start: T.BUILD + 6,
    lightDelay: 0.2,
    fireEscape: true,
    waterTower: true,
    door: 2,
  },
  {
    id: "row-a",
    x: 1.95,
    z: -2.85,
    w: 1.3,
    d: 2.5,
    floors: 6,
    brick: "#8e3d2b",
    trim: "#e9dcc6",
    start: T.BUILD + 14,
    lightDelay: 0.6,
    door: 0,
  },
  {
    id: "row-b",
    x: 3.55,
    z: -2.85,
    w: 1.6,
    d: 2.5,
    floors: 4,
    brick: "#c98e5c",
    trim: "#f4ecdc",
    start: T.BUILD + 20,
    lightDelay: 0.9,
    shop: { side: 0, awning: "#c8372d" },
    door: 2,
  },
  {
    id: "corner-shop",
    x: -4.5,
    z: 2.5,
    w: 1.0,
    d: 2.4,
    floors: 3,
    brick: "#d6a46e",
    trim: "#f6eedf",
    start: T.BUILD + 10,
    lightDelay: 0.4,
    shop: { side: 1, awning: "#2f7d4f" },
    door: 3,
  },
  {
    id: "row-c",
    x: -4.45,
    z: -2.9,
    w: 1.0,
    d: 2.3,
    floors: 10,
    brick: "#e3d3b8",
    trim: "#ffffff",
    start: T.BUILD + 18,
    lightDelay: 0.7,
    door: 0,
  },
];

export const TOWER: TowerSpec = {
  x: -2.8,
  z: -2.8,
  w: 2.0,
  d: 2.0,
  floors: 14,
  start: T.BUILD + 24,
};

export function Buildings({ frame }: { frame: number }) {
  return (
    <>
      {BRICKS.map((spec) => (
        <BrickBuilding key={spec.id} spec={spec} frame={frame} />
      ))}
      <GlassTower spec={TOWER} frame={frame} />
    </>
  );
}
