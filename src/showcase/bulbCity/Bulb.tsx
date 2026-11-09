import { useMemo } from "react";
import * as THREE from "three";
import { Easing, interpolate, random } from "remotion";
import { BULB_Y, clamp, Glow, glowTexture, T } from "./kit";

// A classic incandescent bulb: a clear glass envelope, a glass stem with
// copper lead wires, a zig-zag filament and a brass screw base. It burns
// brighter, glowing cracks run over the glass, and the envelope bursts into
// curved pieces of itself; the base falls onto the crossroads below.

// The glass's outline (radius, height), smoothed and spun around the axis.
const GLASS_PROFILE: [number, number][] = [
  [0.47, -1.06],
  [0.48, -0.95],
  [0.53, -0.72],
  [0.68, -0.42],
  [0.88, -0.08],
  [0.985, 0.25],
  [0.975, 0.56],
  [0.86, 0.88],
  [0.63, 1.12],
  [0.33, 1.27],
  [0.001, 1.32],
];

function profile() {
  return new THREE.SplineCurve(GLASS_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)));
}

// ── The envelope, made of the pieces it will break into ──────────────────

type Piece = {
  geometry: THREE.BufferGeometry;
  centre: THREE.Vector3;
  dir: THREE.Vector3;
  speed: number;
  spin: THREE.Vector3;
};

function makePieces(): Piece[] {
  const points = profile().getSpacedPoints(96);
  const cuts = [0, 22, 40, 56, 70, 83, 96];
  const sectors = [5, 7, 8, 8, 7, 4];
  const pieces: Piece[] = [];
  sectors.forEach((count, band) => {
    const slice = points.slice(cuts[band], cuts[band + 1] + 1);
    const length = (Math.PI * 2) / count;
    // each ring is turned a little, so the cracks don't line up
    const offset = random(`band-${band}`) * length;
    for (let k = 0; k < count; k++) {
      const geometry = new THREE.LatheGeometry(
        slice,
        Math.max(4, Math.round(72 / count)),
        offset + k * length,
        length,
      );
      geometry.computeBoundingBox();
      const centre = geometry.boundingBox!.getCenter(new THREE.Vector3());
      geometry.translate(-centre.x, -centre.y, -centre.z);
      const dir = centre.clone().sub(new THREE.Vector3(0, 0.1, 0));
      dir.y *= 0.7;
      dir.normalize();
      const seed = `${band}-${k}`;
      pieces.push({
        geometry,
        centre,
        dir,
        speed: 0.055 + random(`pv-${seed}`) * 0.07,
        spin: new THREE.Vector3(
          random(`px-${seed}`) - 0.5,
          random(`py-${seed}`) - 0.5,
          random(`pz-${seed}`) - 0.5,
        ).multiplyScalar(0.34),
      });
    }
  });
  return pieces;
}

// ── Glowing cracks: random walks over the glass from one point ───────────

type Crack = {
  geometry: THREE.TubeGeometry;
  segments: number;
  start: number;
  grow: number;
};

const RADIAL = 5;

function makeCracks(): Crack[] {
  const curve = profile();
  const length = curve.getLength();
  const at = (v: number) => curve.getPointAt(Math.min(0.995, Math.max(0.005, v)));
  const surface = (u: number, v: number) => {
    const p = at(v);
    return new THREE.Vector3(Math.sin(u) * p.x * 1.01, p.y, Math.cos(u) * p.x * 1.01);
  };
  const walk = (seed: string, u0: number, v0: number, angle0: number, steps: number) => {
    let u = u0;
    let v = v0;
    let angle = angle0;
    const points = [surface(u, v)];
    const params: [number, number][] = [[u, v]];
    for (let s = 0; s < steps; s++) {
      angle += (random(`${seed}-${s}`) - 0.5) * 1.25;
      const r = Math.max(0.25, at(v).x);
      u += (Math.cos(angle) * 0.065) / r;
      v += (Math.sin(angle) * 0.065) / length;
      if (v < 0.06 || v > 0.96) break;
      points.push(surface(u, v));
      params.push([u, v]);
    }
    return { points, params };
  };
  const cracks: Crack[] = [];
  const add = (points: THREE.Vector3[], start: number, grow: number) => {
    if (points.length < 3) return;
    const path = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.15);
    const segments = (points.length - 1) * 3;
    cracks.push({
      geometry: new THREE.TubeGeometry(path, segments, 0.0075, RADIAL, false),
      segments,
      start,
      grow,
    });
  };
  // where the glass faces the camera when it breaks
  const facing = -0.15;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + random(`ca-${i}`) * 0.5;
    const main = walk(`c-${i}`, facing, 0.6, angle, 14 + Math.floor(random(`cl-${i}`) * 20));
    const start = T.SHAKE + 4 + i * 2;
    add(main.points, start, 16);
    // a branch from somewhere along it
    const from = main.params[Math.floor(main.params.length * (0.35 + random(`cb-${i}`) * 0.3))];
    if (from) {
      const side = random(`cs-${i}`) < 0.5 ? -1 : 1;
      const branch = walk(`b-${i}`, from[0], from[1], angle + side * 0.9, 7 + Math.floor(random(`bl-${i}`) * 8));
      add(branch.points, start + 9, 10);
    }
  }
  return cracks;
}

// ── The rest of the bulb ─────────────────────────────────────────────────

// Threads: the radius rises and falls in a wave down the base.
function baseGeometry(): THREE.LatheGeometry {
  const points: THREE.Vector2[] = [new THREE.Vector2(0.5, -1.0)];
  const top = -1.06;
  const bottom = -1.72;
  const steps = 140;
  for (let i = 0; i <= steps; i++) {
    const y = top + ((bottom - top) * i) / steps;
    const wave = Math.sin(((y - top) / 0.12) * Math.PI * 2);
    points.push(new THREE.Vector2(0.475 + wave * 0.028, y));
  }
  points.push(new THREE.Vector2(0.4, -1.76));
  points.push(new THREE.Vector2(0.3, -1.79));
  return new THREE.LatheGeometry(points, 80);
}

function wire(points: [number, number, number][], radius: number) {
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
    48,
    radius,
    8,
    false,
  );
}

const FILAMENT: [number, number, number][] = [
  [-0.24, 0.22, 0],
  [-0.15, 0.48, 0.02],
  [-0.06, 0.22, -0.02],
  [0.03, 0.48, 0.02],
  [0.12, 0.22, -0.02],
  [0.24, 0.48, 0],
];

// Clear glass without a grey veil: a black body blended additively, so what
// shows is the reflections (strongest at the edges) plus a warm tint.
function glassMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: "#140b03",
    roughness: 0.03,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    envMapIntensity: 2.0,
    emissive: new THREE.Color("#ff8a2a"),
    emissiveIntensity: 0.06,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

const STEM = new THREE.CylinderGeometry(0.06, 0.16, 0.5, 24);
const BUTTON = new THREE.SphereGeometry(0.07, 20, 20);

export function Bulb({ frame }: { frame: number }) {
  const pieces = useMemo(makePieces, []);
  const cracks = useMemo(makeCracks, []);
  const glass = useMemo(glassMaterial, []);
  const stemGlass = useMemo(glassMaterial, []);
  const base = useMemo(baseGeometry, []);
  const filament = useMemo(() => wire(FILAMENT, 0.019), []);
  const leads = useMemo(
    () => [
      wire([[-0.07, -0.62, 0], [-0.16, -0.1, 0], [-0.24, 0.22, 0]], 0.009),
      wire([[0.07, -0.62, 0], [0.18, -0.05, 0], [0.24, 0.48, 0]], 0.009),
      wire([[0, -0.55, 0], [0, 0.0, 0], [0, 0.56, 0]], 0.007),
    ],
    [],
  );

  if (frame > T.LAND + 12) return null;
  const t = frame - T.CRACK;
  const broken = t >= 0;
  const calm = Math.min(frame, T.CRACK);
  const bob = broken ? 0 : Math.sin(frame / 16) * 0.05;
  const tremble = broken
    ? 0
    : interpolate(frame, [T.SHAKE, T.CRACK], [0, 1], clamp) * Math.sin(frame * 2.9) * 0.045;
  const heat = interpolate(frame, [0, T.SHAKE, T.CRACK], [0.75, 1, 2.6], {
    ...clamp,
    easing: Easing.in(Easing.quad),
  });
  const flicker = 1 + Math.sin(frame * 0.9) * 0.03 + Math.sin(frame * 2.3) * 0.02;

  glass.emissiveIntensity = broken
    ? interpolate(t, [0, 6], [0.45, 0.02], clamp)
    : 0.05 + interpolate(frame, [T.SHAKE, T.CRACK], [0, 0.3], clamp);
  glass.opacity = broken ? interpolate(t, [0, 28, 52], [1, 0.85, 0], clamp) : 1;
  stemGlass.emissiveIntensity = 0.2;

  // the stem and wires go at once; the base falls and shrinks into the city
  const away = interpolate(t, [0, 10], [1, 0], { ...clamp, easing: Easing.in(Easing.cubic) });
  const fall = interpolate(frame, [T.CRACK + 2, T.LAND], [0, -0.62], {
    ...clamp,
    easing: Easing.in(Easing.quad),
  });
  const baseScale = interpolate(frame, [T.LAND - 4, T.LAND + 10], [1, 0], clamp);

  return (
    <>
      <group position={[0, BULB_Y + bob, 0]} rotation={[0.05, 0.4 + calm * 0.01, tremble]}>
        {/* the envelope – whole, then flying apart */}
        {t < 54
          ? pieces.map((piece, i) => {
              const k = Math.max(0, t);
              const p = piece.centre
                .clone()
                .addScaledVector(piece.dir, k * piece.speed + (broken ? 0.04 : 0));
              p.y -= 0.0032 * k * k;
              return (
                <mesh
                  key={i}
                  geometry={piece.geometry}
                  material={glass}
                  position={p}
                  rotation={[piece.spin.x * k, piece.spin.y * k, piece.spin.z * k]}
                  scale={broken ? interpolate(t, [0, 54], [1, 0.8], clamp) : 1}
                  renderOrder={3}
                />
              );
            })
          : null}

        {/* glowing cracks, running before it breaks */}
        {!broken
          ? cracks.map((crack, i) => {
              const grown = interpolate(frame, [crack.start, crack.start + crack.grow], [0, 1], clamp);
              if (grown <= 0) return null;
              crack.geometry.setDrawRange(0, Math.floor(grown * crack.segments) * RADIAL * 6);
              return (
                <mesh key={i} geometry={crack.geometry} renderOrder={4}>
                  <meshBasicMaterial color={[3.4, 1.7, 0.5]} />
                </mesh>
              );
            })
          : null}

        <group scale={away}>
          <mesh position={[0, -0.82, 0]} geometry={STEM} material={stemGlass} />
          <mesh position={[0, -0.58, 0]} geometry={BUTTON} material={stemGlass} />
          {leads.map((geometry, i) => (
            <mesh key={i} geometry={geometry}>
              <meshStandardMaterial
                color="#c78a52"
                metalness={0.8}
                roughness={0.3}
                emissive="#ff9a3c"
                emissiveIntensity={0.3 * heat}
              />
            </mesh>
          ))}
          <mesh geometry={filament}>
            <meshBasicMaterial color={[3.2 * Math.sqrt(heat), 2.3 * Math.sqrt(heat), 1.2 * Math.sqrt(heat)]} />
          </mesh>
          <Glow position={[0, 0.35, 0]} scale={0.95 * Math.min(heat, 1.8) * flicker} opacity={0.85} />
          <Glow position={[0, 0.3, 0]} scale={1.9 * Math.min(heat, 1.6) * flicker} opacity={0.28} />
          <pointLight
            position={[0, 0.35, 0]}
            color="#ffb860"
            intensity={18 * Math.min(heat, 1.8) * flicker}
            distance={10}
            decay={1.5}
          />
        </group>

        {/* brass screw base, its collar and the black insulator */}
        <group position={[0, fall, 0]} scale={baseScale}>
          <mesh geometry={base} castShadow>
            <meshStandardMaterial color="#d6a94e" metalness={1} roughness={0.18} envMapIntensity={1.6} />
          </mesh>
          <mesh position={[0, -1.05, 0]}>
            <cylinderGeometry args={[0.5, 0.49, 0.06, 64]} />
            <meshStandardMaterial color="#e0b860" metalness={1} roughness={0.15} />
          </mesh>
          <mesh position={[0, -1.84, 0]}>
            <cylinderGeometry args={[0.28, 0.17, 0.1, 48]} />
            <meshPhysicalMaterial color="#0d0d0f" roughness={0.15} clearcoat={1} />
          </mesh>
          <mesh position={[0, -1.91, 0]}>
            <sphereGeometry args={[0.1, 24, 16]} />
            <meshStandardMaterial color="#c9a04a" metalness={1} roughness={0.25} />
          </mesh>
        </group>
      </group>

      {/* the warm pool of light under the bulb, before it breaks */}
      {t < 8 ? (
        <mesh position={[0, BULB_Y - 2.02, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[3.6, 2.6, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={glowTexture()}
            transparent
            opacity={interpolate(frame, [0, T.CRACK, T.CRACK + 8], [0.35, 0.75, 0], clamp) * flicker}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ) : null}
    </>
  );
}

// The ring of light spreading over the ground as the base lands.
export function Shockwave({ frame }: { frame: number }) {
  const t = frame - T.LAND;
  if (t < 0 || t > 32) return null;
  const r = interpolate(t, [0, 32], [0.3, 6.2], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.14, 0]}>
      <ringGeometry args={[r * 0.9, r, 128]} />
      <meshBasicMaterial
        color={[2.2, 1.9, 1.4]}
        transparent
        opacity={interpolate(t, [0, 24], [0.7, 0], clamp)}
        depthWrite={false}
      />
    </mesh>
  );
}
