import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { random } from "remotion";
import { Buildings } from "../bulbCity/Buildings";
import { Glow, glowTexture } from "../bulbCity/kit";
import { Street } from "../bulbCity/Street";
import { Cars, ParkedCars } from "../bulbCity/Traffic";
import { chime, fanfare, pop, thud, unlockAudio, whoosh } from "./audio";
import { BOXES, ORBS, RINGS, startPose, TRACK, TRACK_LENGTH } from "./track";

// "City Flight": the bulb → city clip's city at night, as a game. Fly a
// paper plane through the streets, collect the lights, shoot through the
// rings, finish on top of the glass tower.
//
// Keys: arrows / WASD. Touch or mouse: drag anywhere like a joystick.
// ?autopilot=1 – the plane flies the course by itself.
// ?capture=1   – no clock of its own: window.__step() advances exactly one
//                1/30 s frame (scripts/recordGame.ts records it frame by frame).

const params = new URLSearchParams(window.location.search);
const AUTOPILOT = params.has("autopilot");
const CAPTURE = params.has("capture");
// A phone or tablet: the intro talks about dragging, not keys.
const TOUCH = window.matchMedia?.("(pointer: coarse)").matches ?? false;

// The city's components come from a clip timeline; this frame is "fully
// built, at night".
const CITY_FRAME = 400;
const SPEED = 2.5;
const TURN = 2.3;
const BEST_KEY = "cityflight.best";

type Phase = "intro" | "playing" | "done";
type Spark = { p: THREE.Vector3; v: THREE.Vector3; born: number; color: THREE.Color; life: number };

type Game = {
  phase: Phase;
  pos: THREE.Vector3;
  yaw: number;
  vy: number;
  roll: number;
  s: number;
  boostUntil: number;
  bumpUntil: number;
  shake: number;
  collected: number[];
  rings: number[];
  trail: THREE.Vector3[];
  time: number;
  started: number;
  finished: number;
  streak: number;
  lastCollect: number;
  keys: Set<string>;
  stick: { active: boolean; x0: number; y0: number; x: number; y: number };
  sparks: Spark[];
  bursts: number;
};

function newGame(): Game {
  const { pos, yaw } = startPose();
  return {
    phase: "intro",
    pos,
    yaw,
    vy: 0,
    roll: 0,
    s: 0,
    boostUntil: -1,
    bumpUntil: -1,
    shake: 0,
    collected: ORBS.map(() => -1),
    rings: RINGS.map(() => -1),
    trail: [],
    time: 0,
    started: 0,
    finished: 0,
    streak: 0,
    lastCollect: -10,
    keys: new Set(),
    stick: { active: false, x0: 0, y0: 0, x: 0, y: 0 },
    sparks: [],
    bursts: 0,
  };
}

function startGame(game: Game) {
  const { pos, yaw } = startPose();
  Object.assign(game, {
    phase: "playing" as Phase,
    pos,
    yaw,
    vy: 0,
    roll: 0,
    s: 0,
    boostUntil: -1,
    bumpUntil: -1,
    collected: ORBS.map(() => -1),
    rings: RINGS.map(() => -1),
    trail: [],
    started: game.time,
    streak: 0,
    lastCollect: -10,
    sparks: [],
    bursts: 0,
  });
}

const angleDiff = (a: number, b: number) => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function spawnSparks(game: Game, at: THREE.Vector3, color: THREE.Color, count: number, speed: number, life: number) {
  for (let i = 0; i < count; i++) {
    const y = Math.random() * 2 - 1;
    const r = Math.sqrt(1 - y * y);
    const a = Math.random() * Math.PI * 2;
    const dir = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    game.sparks.push({
      p: at.clone(),
      v: dir.multiplyScalar(speed * (0.5 + Math.random() * 0.7)),
      born: game.time,
      color,
      life,
    });
  }
}

const FIREWORK_COLORS = ["#ffcf6e", "#7fe7ff", "#ff7aa8", "#b9a2ff", "#9dffb0"].map((c) =>
  new THREE.Color(c).multiplyScalar(2.4),
);

function stepGame(game: Game, dt: number) {
  game.time += dt;
  game.shake = Math.max(0, game.shake - dt * 1.6);
  game.sparks = game.sparks.filter((s) => game.time - s.born < s.life);
  for (const s of game.sparks) {
    s.p.addScaledVector(s.v, dt);
    s.v.y -= 2.2 * dt;
    s.v.multiplyScalar(1 - dt * 0.9);
  }
  if (game.phase === "intro") return;

  if (game.phase === "done") {
    // the plane glides in a lazy circle above the city while the sky celebrates
    game.yaw += 0.5 * dt;
    game.roll += (-0.35 - game.roll) * Math.min(1, dt * 3);
    game.pos.x += Math.sin(game.yaw) * 2 * dt;
    game.pos.z += Math.cos(game.yaw) * 2 * dt;
    game.pos.y += (8.6 - game.pos.y) * Math.min(1, dt);
    const since = game.time - game.finished;
    while (game.bursts < 10 && since > game.bursts * 0.42) {
      const at = new THREE.Vector3((Math.random() - 0.5) * 7, 4.6 + Math.random() * 3.4, (Math.random() - 0.5) * 7);
      spawnSparks(game, at, FIREWORK_COLORS[game.bursts % FIREWORK_COLORS.length], 110, 4.2, 1.9);
      pop();
      game.bursts++;
    }
    game.trail.push(game.pos.clone());
    if (game.trail.length > 80) game.trail.shift();
    return;
  }

  const boosting = game.time < game.boostUntil;
  const bumped = game.time < game.bumpUntil;
  const speed = SPEED * (boosting ? 1.65 : 1) * (bumped ? 0.5 : 1);
  const prev = game.pos.clone();

  if (AUTOPILOT) {
    game.s = Math.min(TRACK_LENGTH, game.s + speed * dt);
    const u = game.s / TRACK_LENGTH;
    game.pos.copy(TRACK.getPointAt(u));
    const t = TRACK.getTangentAt(u);
    const yaw = Math.atan2(t.x, t.z);
    const rate = angleDiff(yaw, game.yaw) / Math.max(dt, 1e-4);
    game.yaw = yaw;
    game.vy = t.y * speed;
    game.roll += (-clamp(rate * 0.35, -0.7, 0.7) - game.roll) * Math.min(1, dt * 5);
  } else {
    let turn = 0;
    let climb = 0;
    if (game.keys.has("ArrowLeft") || game.keys.has("a")) turn += 1;
    if (game.keys.has("ArrowRight") || game.keys.has("d")) turn -= 1;
    if (game.keys.has("ArrowUp") || game.keys.has("w")) climb += 1;
    if (game.keys.has("ArrowDown") || game.keys.has("s")) climb -= 1;
    if (game.stick.active) {
      turn += clamp(-(game.stick.x - game.stick.x0) / 70, -1, 1);
      climb += clamp(-(game.stick.y - game.stick.y0) / 70, -1, 1);
    }
    turn = clamp(turn, -1, 1);
    climb = clamp(climb, -1, 1);
    game.yaw += turn * TURN * dt;
    game.vy += (climb * 1.8 - game.vy) * Math.min(1, dt * 4);
    game.roll += (-turn * 0.6 - game.roll) * Math.min(1, dt * 5);
    game.pos.x += Math.sin(game.yaw) * speed * dt;
    game.pos.z += Math.cos(game.yaw) * speed * dt;
    game.pos.y = clamp(game.pos.y + game.vy * dt, 0.45, 10.5);
    const edge = 6.6;
    if (Math.abs(game.pos.x) > edge || Math.abs(game.pos.z) > edge) {
      const back = Math.atan2(-game.pos.x, -game.pos.z);
      game.yaw += Math.sign(angleDiff(back, game.yaw)) * TURN * 1.2 * dt;
    }
    // walls: bounce off, lose speed, shake
    for (const b of BOXES) {
      const p = game.pos;
      if (p.x > b.minX && p.x < b.maxX && p.z > b.minZ && p.z < b.maxZ && p.y < b.top) {
        const dx = Math.min(p.x - b.minX, b.maxX - p.x);
        const dz = Math.min(p.z - b.minZ, b.maxZ - p.z);
        game.pos.copy(prev);
        if (dx < dz) game.yaw = -game.yaw;
        else game.yaw = Math.PI - game.yaw;
        game.bumpUntil = game.time + 0.6;
        game.shake = 0.6;
        game.streak = 0;
        thud();
        break;
      }
    }
  }

  ORBS.forEach((orb, i) => {
    if (game.collected[i] >= 0 || game.pos.distanceTo(orb) > 0.65) return;
    game.collected[i] = game.time;
    game.streak = game.time - game.lastCollect < 2.4 ? game.streak + 1 : 0;
    game.lastCollect = game.time;
    spawnSparks(game, orb, new THREE.Color(2.6, 2.0, 1.0), 18, 2.2, 0.7);
    chime(game.streak);
  });
  RINGS.forEach((ring, i) => {
    if (game.rings[i] >= 0) return;
    const d = game.pos.clone().sub(ring.at);
    const along = d.dot(ring.facing);
    const radial = d.addScaledVector(ring.facing, -along).length();
    if (Math.abs(along) < 0.35 && radial < 0.75) {
      game.rings[i] = game.time;
      game.boostUntil = game.time + 1.4;
      spawnSparks(game, ring.at, new THREE.Color(0.9, 2.6, 3.2), 26, 2.6, 0.8);
      whoosh();
    }
  });

  if (game.collected.every((c) => c >= 0)) {
    game.phase = "done";
    game.finished = game.time;
    fanfare();
    try {
      const took = game.finished - game.started;
      const best = Number(localStorage.getItem(BEST_KEY));
      if (!CAPTURE && !AUTOPILOT && (!best || took < best)) localStorage.setItem(BEST_KEY, String(took));
    } catch {
      // no storage: no best time, the game still works
    }
  }
  game.trail.push(game.pos.clone());
  if (game.trail.length > 80) game.trail.shift();
}

// ── The plane and what it leaves behind ──────────────────────────────────

function paperPlane(): THREE.BufferGeometry {
  // a folded dart: two wings and a keel, nose along +z
  const v = [
    0, 0, 0.5, -0.32, 0.02, -0.42, 0, 0, -0.32,
    0, 0, 0.5, 0, 0, -0.32, 0.32, 0.02, -0.42,
    0, 0, 0.5, 0, -0.12, -0.36, 0, 0, -0.32,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function Plane({ game }: { game: Game }) {
  const geometry = useMemo(paperPlane, []);
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    g.visible = game.phase !== "intro";
    g.position.copy(game.pos);
    const wobble = game.time < game.bumpUntil ? Math.sin(game.time * 40) * 0.25 : 0;
    g.rotation.set(-game.vy * 0.25, game.yaw, game.roll + wobble, "YXZ");
  });
  return (
    <group ref={ref}>
      <mesh geometry={geometry} scale={0.55}>
        <meshStandardMaterial color="#fbfaf5" emissive="#fff3d6" emissiveIntensity={0.4} side={THREE.DoubleSide} roughness={0.6} />
      </mesh>
      <pointLight color="#fff0d0" intensity={1.8} distance={2.4} decay={1.6} />
    </group>
  );
}

function Trail({ game }: { game: Game }) {
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(80 * 3), 3));
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(2.2, 1.9, 1.4),
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const l = new THREE.Line(geometry, material);
    l.frustumCulled = false;
    return l;
  }, []);
  useFrame(() => {
    const attr = line.geometry.getAttribute("position") as THREE.BufferAttribute;
    game.trail.forEach((p, i) => attr.setXYZ(i, p.x, p.y, p.z));
    line.geometry.setDrawRange(0, game.trail.length);
    attr.needsUpdate = true;
    const material = line.material as THREE.LineBasicMaterial;
    if (game.time < game.boostUntil) material.color.setRGB(1.2, 3.0, 3.6);
    else material.color.setRGB(2.2, 1.9, 1.4);
  });
  return <primitive object={line} />;
}

// Sparks and fireworks: one cloud of glowing points.
const MAX_SPARKS = 1200;
function Sparks({ game }: { game: Game }) {
  const points = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_SPARKS * 3), 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(MAX_SPARKS * 3), 3));
    const material = new THREE.PointsMaterial({
      size: 0.27,
      map: glowTexture(),
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const p = new THREE.Points(geometry, material);
    p.frustumCulled = false;
    return p;
  }, []);
  useFrame(() => {
    const pos = points.geometry.getAttribute("position") as THREE.BufferAttribute;
    const col = points.geometry.getAttribute("color") as THREE.BufferAttribute;
    const list = game.sparks.slice(-MAX_SPARKS);
    list.forEach((s, i) => {
      const fade = 1 - (game.time - s.born) / s.life;
      pos.setXYZ(i, s.p.x, s.p.y, s.p.z);
      col.setXYZ(i, s.color.r * fade, s.color.g * fade, s.color.b * fade);
    });
    points.geometry.setDrawRange(0, list.length);
    pos.needsUpdate = true;
    col.needsUpdate = true;
  });
  return <primitive object={points} />;
}

function Orbs({ game }: { game: Game }) {
  const [, rerender] = useState(0);
  useFrame(() => rerender((n) => (n + 1) % 1e6));
  const t = game.time;
  const next = game.collected.findIndex((c) => c < 0);
  return (
    <>
      {ORBS.map((orb, i) => {
        if (game.collected[i] >= 0) return null;
        const bob = Math.sin(t * 2 + i) * 0.07;
        const isNext = i === next && game.phase === "playing";
        const isLast = i === ORBS.length - 1;
        const pulse = isNext ? 1 + Math.sin(t * 6) * 0.12 : 1;
        return (
          <group key={i} position={[orb.x, orb.y + bob, orb.z]}>
            <mesh scale={(isLast ? 0.2 : 0.12) * pulse}>
              <sphereGeometry args={[1, 20, 20]} />
              <meshBasicMaterial color={isLast ? [3.4, 2.6, 0.8] : [3, 2.4, 1.2]} />
            </mesh>
            <Glow scale={(isLast ? 2.2 : isNext ? 1.3 : 0.85) * pulse} opacity={0.9} />
          </group>
        );
      })}
    </>
  );
}

function Rings({ game }: { game: Game }) {
  const [, rerender] = useState(0);
  useFrame(() => rerender((n) => (n + 1) % 1e6));
  const turns = useMemo(
    () => RINGS.map((ring) => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), ring.facing)),
    [],
  );
  return (
    <>
      {RINGS.map((ring, i) => {
        const hit = game.rings[i];
        const since = hit >= 0 ? game.time - hit : -1;
        if (since > 0.5) return null;
        const grow = since >= 0 ? 1 + since * 2.4 : 1 + Math.sin(game.time * 3 + i) * 0.04;
        return (
          <mesh key={i} position={ring.at} quaternion={turns[i]} scale={grow}>
            <torusGeometry args={[0.62, 0.045, 12, 64]} />
            <meshBasicMaterial color={[1.0, 2.6, 3.2]} transparent opacity={since >= 0 ? 1 - since / 0.5 : 0.95} />
          </mesh>
        );
      })}
    </>
  );
}

// ── Camera ───────────────────────────────────────────────────────────────

function CameraRig({ game }: { game: Game }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const look = useRef(new THREE.Vector3(0, 2, 0));
  const placed = useRef(false);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    let want: THREE.Vector3;
    let target: THREE.Vector3;
    let fov = 55;
    let k = placed.current ? Math.min(1, dt * 5) : 1;
    if (game.phase === "playing") {
      const forward = new THREE.Vector3(Math.sin(game.yaw), 0, Math.cos(game.yaw));
      want = game.pos.clone().addScaledVector(forward, -2.1).add(new THREE.Vector3(0, 0.62, 0));
      target = game.pos.clone().addScaledVector(forward, 2.6).add(new THREE.Vector3(0, -0.12, 0));
      fov = game.time < game.boostUntil ? 67 : 55;
    } else {
      // the intro and the finish: a slow orbit around the whole city
      const a = game.time * 0.12;
      const r = game.phase === "done" ? 14 : 15.5;
      want = new THREE.Vector3(Math.sin(a) * r, 9.5, Math.cos(a) * r);
      target = new THREE.Vector3(0, game.phase === "done" ? 3.2 : 1.6, 0);
      fov = 50;
      if (game.phase === "done") k = Math.min(1, dt * 1.2);
    }
    camera.position.lerp(want, k);
    look.current.lerp(target, k);
    if (game.shake > 0) {
      camera.position.x += (Math.random() - 0.5) * game.shake * 0.12;
      camera.position.y += (Math.random() - 0.5) * game.shake * 0.12;
    }
    camera.lookAt(look.current);
    camera.fov += (fov - camera.fov) * Math.min(1, dt * 4);
    camera.updateProjectionMatrix();
    placed.current = true;
  });
  return null;
}

// ── The city at night ────────────────────────────────────────────────────

const STARS = (() => {
  const positions = new Float32Array(1200 * 3);
  for (let i = 0; i < 1200; i++) {
    const theta = random(`st-${i}`) * Math.PI * 2;
    const y = random(`sy-${i}`) * 2 - 1;
    const r = Math.sqrt(1 - y * y);
    positions[i * 3] = Math.cos(theta) * r * 80;
    positions[i * 3 + 1] = Math.abs(y) * 80;
    positions[i * 3 + 2] = Math.sin(theta) * r * 80;
  }
  return positions;
})();

function Night() {
  const { gl, scene } = useThree();
  useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "#24366e");
    g.addColorStop(1, "#0a1230");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.background = texture;
    scene.fog = new THREE.Fog("#101a40", 10, 30);
    const pmrem = new THREE.PMREMGenerator(gl);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.25;
    pmrem.dispose();
  }, [gl, scene]);
  return null;
}

function Bloom() {
  const { gl, scene, camera, size } = useThree();
  const composer = useMemo(() => {
    const pixelRatio = gl.getPixelRatio();
    const target = new THREE.WebGLRenderTarget(size.width * pixelRatio, size.height * pixelRatio, {
      type: THREE.HalfFloatType,
      samples: 4,
    });
    const c = new EffectComposer(gl, target);
    c.setPixelRatio(pixelRatio);
    c.setSize(size.width, size.height);
    c.addPass(new RenderPass(scene, camera));
    c.addPass(new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 0.5, 0.45, 1.4));
    c.addPass(new OutputPass());
    return c;
  }, [gl, scene, camera, size.width, size.height]);
  useFrame(() => composer.render(), 1);
  return null;
}

// Everything that never moves, drawn once.
const StaticCity = memo(function StaticCity() {
  return (
    <>
      <hemisphereLight args={["#3c4f9a", "#2a2230", 0.4]} />
      <directionalLight position={[6, 9, -5]} intensity={0.6} color="#8ea6ff" />
      <pointLight position={[0, 1.4, 0]} intensity={9} distance={6} decay={1.6} color="#ffcf87" />
      <pointLight position={[2.9, 1.2, 2.9]} intensity={6} distance={5} decay={1.6} color="#ffcf87" />
      <pointLight position={[-2.6, 1.2, 0.9]} intensity={6} distance={5} decay={1.6} color="#ffcf87" />
      <pointLight position={[2.6, 1.2, -0.9]} intensity={6} distance={5} decay={1.6} color="#ffcf87" />
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[STARS, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#ffffff" size={0.32} transparent opacity={0.9} depthWrite={false} fog={false} />
      </points>
      <Street frame={CITY_FRAME} />
      <Buildings frame={CITY_FRAME} />
      <ParkedCars frame={CITY_FRAME} />
    </>
  );
});

// The traffic keeps driving on its own loop.
function MovingCars({ game }: { game: Game }) {
  const [, rerender] = useState(0);
  useFrame(() => rerender((n) => (n + 1) % 1e6));
  return <Cars frame={200 + ((game.time * 30) % 220)} />;
}

// Runs the game: by the clock, or (capture) one frame per window.__step().
function Driver({ game }: { game: Game }) {
  const { advance } = useThree();
  useEffect(() => {
    if (!CAPTURE) return;
    startGame(game);
    let now = performance.now();
    (window as unknown as { __step: () => void }).__step = () => {
      stepGame(game, 1 / 30);
      now += 1000 / 30;
      advance(now);
    };
  }, [advance, game]);
  useFrame((_, dt) => {
    if (!CAPTURE) stepGame(game, Math.min(dt, 1 / 20));
  }, -1);
  return null;
}

// ── Screens around the game ──────────────────────────────────────────────

const glass: CSSProperties = {
  background: "rgba(8,12,30,0.62)",
  border: "1.5px solid rgba(255,220,150,0.4)",
  boxShadow: "0 0 34px rgba(255,190,90,0.28)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  color: "#ffe9bd",
  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
};

const button: CSSProperties = {
  ...glass,
  padding: "0.7em 1.4em",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: "clamp(16px, 2.6vh, 30px)",
  cursor: "pointer",
};

type Hud = { phase: Phase; score: number; seconds: number; streak: number; streakAt: number; now: number; best: number | null; took: number };

function readBest(): number | null {
  try {
    const v = Number(localStorage.getItem(BEST_KEY));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

export function CityGame() {
  const game = useMemo(newGame, []);
  const [hud, setHud] = useState<Hud>({ phase: "intro", score: 0, seconds: 0, streak: 0, streakAt: -10, now: 0, best: readBest(), took: 0 });
  const [stick, setStick] = useState({ ...game.stick });
  const [toast, setToast] = useState("");

  const begin = () => {
    unlockAudio();
    startGame(game);
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (game.phase === "intro") begin();
      game.keys.add(key);
      if (key.startsWith("Arrow")) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => game.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    // On phones the sound may only start when a finger lifts.
    const wake = () => unlockAudio();
    const lifts = ["pointerup", "touchend", "click"] as const;
    for (const lift of lifts) window.addEventListener(lift, wake, { passive: true });
    const timer = window.setInterval(() => {
      setHud({
        phase: game.phase,
        score: game.collected.filter((c) => c >= 0).length,
        seconds: game.phase === "playing" ? game.time - game.started : game.finished - game.started,
        streak: game.streak,
        streakAt: game.lastCollect,
        now: game.time,
        best: readBest(),
        took: game.finished - game.started,
      });
      setStick({ ...game.stick });
    }, 50);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      for (const lift of lifts) window.removeEventListener(lift, wake);
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  const share = async () => {
    const url = window.location.href.split("?")[0];
    const text = `I collected all ${ORBS.length} lights in City Flight in ${hud.took.toFixed(1)} s – can you beat it?`;
    try {
      if (navigator.share) await navigator.share({ title: "City Flight", text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setToast("Link copied!");
        window.setTimeout(() => setToast(""), 1800);
      }
    } catch {
      // sharing cancelled
    }
  };

  const showStreak = hud.phase === "playing" && hud.streak >= 2 && hud.now - hud.streakAt < 0.9;

  return (
    <div
      style={{ position: "fixed", inset: 0, touchAction: "none", userSelect: "none", WebkitUserSelect: "none" }}
      onPointerDown={(e) => {
        if (game.phase === "intro") begin();
        if (game.phase !== "playing") return;
        Object.assign(game.stick, { active: true, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY });
      }}
      onPointerMove={(e) => {
        if (!game.stick.active) return;
        game.stick.x = e.clientX;
        game.stick.y = e.clientY;
      }}
      onPointerUp={() => (game.stick.active = false)}
      onPointerCancel={() => (game.stick.active = false)}
    >
      <Canvas
        frameloop={CAPTURE ? "never" : "always"}
        dpr={CAPTURE ? 1 : [1, 1.5]}
        gl={{ antialias: true, preserveDrawingBuffer: CAPTURE, powerPreference: "high-performance" }}
        camera={{ fov: 50, near: 0.05, far: 200, position: [0, 9.5, 15.5] }}
      >
        <Driver game={game} />
        <Night />
        <Bloom />
        <CameraRig game={game} />
        <StaticCity />
        <MovingCars game={game} />
        <Rings game={game} />
        <Orbs game={game} />
        <Sparks game={game} />
        <Trail game={game} />
        <Plane game={game} />
      </Canvas>

      {/* score and time while flying */}
      {hud.phase === "playing" ? (
        <div style={{ position: "absolute", top: "6%", left: 0, right: 0, display: "flex", justifyContent: "center", gap: 12, pointerEvents: "none" }}>
          <div style={{ ...glass, padding: "0.45em 1.1em", borderRadius: 999, fontWeight: 800, fontSize: "clamp(18px, 3.2vh, 60px)" }}>
            ✦ {hud.score} / {ORBS.length}
          </div>
          <div style={{ ...glass, padding: "0.45em 1.1em", borderRadius: 999, fontWeight: 700, fontSize: "clamp(18px, 3.2vh, 60px)", fontVariantNumeric: "tabular-nums" }}>
            {hud.seconds.toFixed(1)} s
          </div>
        </div>
      ) : null}
      {showStreak ? (
        <div
          style={{
            position: "absolute",
            top: "15%",
            left: 0,
            right: 0,
            textAlign: "center",
            pointerEvents: "none",
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 900,
            fontSize: "clamp(28px, 5vh, 90px)",
            color: "#fff1c4",
            textShadow: "0 0 24px rgba(255,190,90,0.9)",
          }}
        >
          ×{hud.streak + 1} streak!
        </div>
      ) : null}

      {/* the joystick under the finger */}
      {stick.active && hud.phase === "playing" ? (
        <>
          <div style={{ position: "absolute", left: stick.x0 - 55, top: stick.y0 - 55, width: 110, height: 110, borderRadius: 55, border: "2px solid rgba(255,230,180,0.45)", pointerEvents: "none" }} />
          <div
            style={{
              position: "absolute",
              left: stick.x0 + clamp(stick.x - stick.x0, -55, 55) - 22,
              top: stick.y0 + clamp(stick.y - stick.y0, -55, 55) - 22,
              width: 44,
              height: 44,
              borderRadius: 22,
              background: "rgba(255,230,180,0.55)",
              pointerEvents: "none",
            }}
          />
        </>
      ) : null}

      {/* intro */}
      {hud.phase === "intro" && !CAPTURE ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2.2vh", pointerEvents: "none", textAlign: "center", padding: "0 6vw" }}>
          <div style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 900, fontSize: "clamp(40px, 8vh, 140px)", color: "#fff3d6", letterSpacing: 2, textShadow: "0 0 40px rgba(255,190,90,0.8)" }}>
            CITY FLIGHT
          </div>
          <div style={{ ...glass, padding: "0.8em 1.3em", borderRadius: 24, fontSize: "clamp(15px, 2.4vh, 34px)", lineHeight: 1.45, fontWeight: 600 }}>
            Collect all {ORBS.length} lights · fly through the rings for speed
            <br />
            {TOUCH ? "Drag anywhere to steer" : "Steer: arrow keys / WASD or drag"}
            {hud.best ? (
              <>
                <br />
                Best: {hud.best.toFixed(1)} s
              </>
            ) : null}
          </div>
          <div style={{ ...button, fontSize: "clamp(18px, 3vh, 40px)" }}>{TOUCH ? "Tap" : "Click"} to fly ✈</div>
        </div>
      ) : null}

      {/* finish */}
      {hud.phase === "done" ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: "8%", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.6vh", textAlign: "center", padding: "0 6vw" }}>
          <div style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 900, fontSize: "clamp(30px, 5.6vh, 100px)", color: "#fff3d6", textShadow: "0 0 36px rgba(255,190,90,0.85)" }}>
            ✦ All {ORBS.length} lights!
          </div>
          <div style={{ ...glass, padding: "0.6em 1.2em", borderRadius: 22, fontWeight: 700, fontSize: "clamp(17px, 2.8vh, 48px)" }}>
            {hud.took.toFixed(1)} s{hud.best && !CAPTURE ? ` · best ${hud.best.toFixed(1)} s` : ""}
          </div>
          {!CAPTURE ? (
            <div style={{ display: "flex", gap: 14, marginTop: "1vh" }}>
              <button style={button} onPointerDown={(e) => e.stopPropagation()} onClick={() => begin()}>
                Play again
              </button>
              <button style={button} onPointerDown={(e) => e.stopPropagation()} onClick={() => void share()}>
                Share
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {toast ? (
        <div style={{ ...glass, position: "absolute", bottom: "10%", left: "50%", transform: "translateX(-50%)", padding: "0.5em 1em", borderRadius: 999, fontWeight: 700 }}>
          {toast}
        </div>
      ) : null}

      <div style={{ position: "absolute", bottom: "2%", left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,0.55)", fontFamily: "Inter, system-ui, sans-serif", fontSize: "clamp(11px, 1.6vh, 22px)", pointerEvents: "none" }}>
        Built with Claude Code
      </div>
    </div>
  );
}
