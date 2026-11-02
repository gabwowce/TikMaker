import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  continueRender,
  delayRender,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { MONO_FONT } from "../../visuals/dev/devText";
import { ensureFontsLoaded } from "../../typography/fonts";
import { colors, fontFamilies, fontSizes } from "../../typography/tokens";
import { NO, OK, Sfx, StepNumber, Title, word } from "./kit";

// "AI agents explained", drawn as ONE desk seen from above (the shot list:
// docs/eksperimentai/ai-agent-explained-shotlist.md). A green cutting mat,
// and on it the story's objects: a toy robot (the agent), a tool tray (the
// menu), a rubber stamp (the manager – plain code), sticky notes on a string
// (goal → plan → steps) and phones whose screens carry the 2D interface.
// Every scene renders the same desk; the camera flies over it to the next
// object, and what has happened so far stays on the desk.

const W = 1080;
const H = 1920;
const MOVE = 30; // frames the camera takes to fly to the next spot

// ── fonts for the textures drawn on canvases ────────────────────────────

function useFontsReady() {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("desk fonts"));
  useEffect(() => {
    ensureFontsLoaded();
    Promise.all([
      document.fonts.load(`400 80px "${fontFamilies.tanker}"`),
      document.fonts.load(`600 80px "${fontFamilies.clashSemibold}"`),
      document.fonts.load(`700 80px "${fontFamilies.clashBold}"`),
    ])
      .catch(() => undefined)
      .then(() => {
        setReady(true);
        continueRender(handle);
      });
  }, [handle]);
  return ready;
}

function canvasTexture(
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D) => void,
) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// The cutting mat: green, a fine and a bold grid, a ruler along the edge.
function matTexture() {
  return canvasTexture(2048, 1536, (g) => {
    g.fillStyle = "#0f5a43";
    g.fillRect(0, 0, 2048, 1536);
    for (let i = 0; i <= 64; i++) {
      const x = i * 32;
      g.strokeStyle =
        i % 5 === 0 ? "rgba(170,255,220,.55)" : "rgba(170,255,220,.18)";
      g.lineWidth = i % 5 === 0 ? 4 : 2;
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, 1536);
      g.stroke();
    }
    for (let i = 0; i <= 48; i++) {
      const y = i * 32;
      g.strokeStyle =
        i % 5 === 0 ? "rgba(170,255,220,.55)" : "rgba(170,255,220,.18)";
      g.lineWidth = i % 5 === 0 ? 4 : 2;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(2048, y);
      g.stroke();
    }
    // wear: fine scratches and specks from years of cutting
    const r = rand(3);
    for (let i = 0; i < 260; i++) {
      g.strokeStyle = `rgba(220,255,240,${0.04 + r() * 0.08})`;
      g.lineWidth = 1;
      const x = r() * 2048;
      const y = r() * 1536;
      const a = r() * Math.PI;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(
        x + Math.cos(a) * (20 + r() * 120),
        y + Math.sin(a) * (20 + r() * 120),
      );
      g.stroke();
    }
    speckle(g, 2048, 1536, 11, 0.06);
    g.fillStyle = "rgba(190,255,230,.75)";
    g.font = "600 44px sans-serif";
    for (let i = 1; i < 13; i++) g.fillText(String(i), i * 160 - 12, 1500);
  });
}

// Small deterministic noise, so textures look the same in every render.
function rand(seed: number) {
  let x = seed;
  return () => {
    x = (x * 16807) % 2147483647;
    return x / 2147483647;
  };
}

// Wood: warm planks with wavy grain lines and a few knots.
function woodTexture() {
  const r = rand(7);
  const t = canvasTexture(1024, 1024, (g) => {
    g.fillStyle = "#6a4528";
    g.fillRect(0, 0, 1024, 1024);
    for (let plank = 0; plank < 4; plank++) {
      const y0 = plank * 256;
      g.fillStyle = `rgba(${40 + r() * 30},${20 + r() * 20},10,${0.15 + r() * 0.15})`;
      g.fillRect(0, y0, 1024, 256);
      for (let line = 0; line < 46; line++) {
        const y = y0 + r() * 256;
        g.strokeStyle = `rgba(${30 + r() * 40},${15 + r() * 20},5,${0.12 + r() * 0.3})`;
        g.lineWidth = 1 + r() * 3;
        g.beginPath();
        for (let x = 0; x <= 1024; x += 16) {
          const yy = y + Math.sin(x / (90 + r() * 40) + line) * 6;
          if (x === 0) g.moveTo(x, yy);
          else g.lineTo(x, yy);
        }
        g.stroke();
      }
      g.fillStyle = "rgba(0,0,0,.45)";
      g.fillRect(0, y0, 1024, 3);
    }
    for (let k = 0; k < 5; k++) {
      const x = r() * 1024;
      const y = r() * 1024;
      g.strokeStyle = "rgba(30,15,5,.5)";
      for (let ring = 1; ring < 6; ring++) {
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(x, y, ring * 9, ring * 4, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 5);
  return t;
}

// Paper and plastic fibre: specks over a flat colour.
function speckle(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  amount = 0.05,
) {
  const r = rand(seed);
  for (let i = 0; i < (w * h) / 60; i++) {
    g.fillStyle =
      r() > 0.5
        ? `rgba(0,0,0,${r() * amount})`
        : `rgba(255,255,255,${r() * amount})`;
    g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
  }
}

function textTexture(
  lines: string[],
  opts: {
    bg: string;
    fg: string;
    font: string;
    w?: number;
    h?: number;
    align?: CanvasTextAlign;
    rotate?: number;
    border?: string;
  },
) {
  const w = opts.w ?? 512;
  const h = opts.h ?? 512;
  return canvasTexture(w, h, (g) => {
    g.fillStyle = opts.bg;
    g.fillRect(0, 0, w, h);
    if (!opts.bg.startsWith("rgba(0,0,0,0)"))
      speckle(g, w, h, lines.join("").length + w, 0.07);
    if (opts.border) {
      g.strokeStyle = opts.border;
      g.lineWidth = 22;
      g.strokeRect(30, 30, w - 60, h - 60);
    }
    g.fillStyle = opts.fg;
    g.font = opts.font;
    g.textAlign = opts.align ?? "center";
    g.textBaseline = "middle";
    const step = h / (lines.length + 1);
    lines.forEach((line, i) =>
      g.fillText(line, opts.align === "left" ? 40 : w / 2, step * (i + 1)),
    );
  });
}

// ── camera: one pose per scene, flown between ───────────────────────────

type Pose = { pos: [number, number, number]; look: [number, number, number] };
// Each pose is written as where the camera looks and from which direction;
// `away` pulls it back along that line, so framing is one number per scene.
const shot = (
  look: [number, number, number],
  dir: [number, number, number],
  away: number,
): Pose => {
  const len = Math.hypot(...dir);
  return {
    look,
    pos: [
      look[0] + (dir[0] / len) * away,
      look[1] + (dir[1] / len) * away,
      look[2] + (dir[2] / len) * away,
    ],
  };
};
const POSES: Pose[] = [
  shot([0, 0.6, 0.4], [0, 9.5, 6.2], 13), // 1 the robot drops in
  shot([-4.4, 0.6, -2.0], [-0.4, 4.6, 5.6], 12.5), // 2 the new employee's desk
  shot([5.2, 0.4, -2.0], [2.8, 5.2, 5.0], 14), // 3 tools and the stamp
  shot([5.0, 0, 3.4], [0, 4.4, 2.4], 9), // 4 the chatbot phone
  shot([-4.4, 0, 3.8], [0, 8.6, 4.8], 18.5), // 5 goal, plan, steps
  shot([4.6, 0.4, -1.3], [1.8, 4.2, 3.6], 12.5), // 6 pick a tool, check it
  shot([0, 0.9, 5.9], [0, 5.0, 5.2], 11), // 7 inside TikMaker
  shot([7.4, 0.3, 8.2], [1.6, 5.0, 4.0], 12.5), // 8 the stamp checks
  { pos: [0, 24, 13], look: [0, 0, 2.2] }, // 9 the whole desk
];
// Scene 4 dives into the phone's screen; scene 9 comes down to the phone
// once the whole desk has been seen.
const DIVE: Pose = { pos: [5.0, 1.25, 3.25], look: [5.0, 0, 3.15] };
const FINALE: Pose = { pos: [0, 5.0, 15.6], look: [0, 2.0, 5.4] };

const smooth = Easing.bezier(0.65, 0, 0.35, 1);
const lerp3 = (a: number[], b: number[], t: number) =>
  a.map((v, i) => v + (b[i] - v) * t) as [number, number, number];

// Each scene is a short shot list: [frame, pose] – from that frame the camera
// moves to the pose (SHOT_MOVE frames). The first entry is flown to from
// wherever the previous scene ended, so the whole video is one camera move.
const SHOT_MOVE = 26;
const at = (
  pos: [number, number, number],
  look: [number, number, number],
): Pose => ({ pos, look });
const SHOTS: [number, Pose][][] = [
  // 1 · low and close as the robot lands, then crane up to the desk
  [
    [0, at([1.6, 1.9, 5.8], [0, 1.1, 0.4])],
    [word(3), POSES[0]],
  ],
  // 2 · its desk, then its face up close ("new employee"), then back out
  [
    [0, POSES[1]],
    [word(6), at([-4.5, 1.9, 2.7], [-5.2, 1.2, -1.6])],
    [word(11), POSES[1]],
  ],
  // 3 · down at tool height along the tray, then up at the stamp coming down
  [
    [0, at([2.6, 3.6, 3.8], [4.8, 0.3, -2.4])],
    [word(13), at([4.0, 3.0, 6.6], [5.8, 2.4, -1.4])],
  ],
  // 4 · over the phone, then the dive into its screen
  [
    [0, POSES[3]],
    [MOVE + 4, DIVE],
  ],
  // 5 · from above, then a dolly down along the string to the steps
  [
    [0, POSES[4]],
    [word(12), at([-4.4, 5.2, 11.8], [-4.4, 0, 5.4])],
  ],
  // 6 · macro on the pencil being picked, then out to the checked card
  [
    [0, at([4.6, 3.8, 4.4], [3.6, 0.7, -1.6])],
    [word(9), POSES[5]],
  ],
  // 7 · at phone height, the cards rising over us, then up and over
  [
    [0, at([0.4, 2.9, 12.4], [0, 1.3, 6.0])],
    [word(15), POSES[6]],
  ],
  // 8 · the line of answers, then low behind the stamp as it slams
  [
    [0, POSES[7]],
    [word(9), at([8.8, 4.6, 14.8], [8.6, 1.4, 8.4])],
  ],
  // 9 · up over the whole desk, then down to the finished phone
  [
    [0, POSES[8]],
    [word(9), FINALE],
  ],
];

function fly(from: Pose, to: Pose, t: number): Pose {
  return {
    pos: lerp3(from.pos, to.pos, t),
    look: lerp3(from.look, to.look, t),
  };
}

function poseAt(scene: number, frame: number): Pose {
  const shots = SHOTS[scene];
  const last = (s: number) => SHOTS[s][SHOTS[s].length - 1][1];
  let pose = scene === 0 ? shots[0][1] : last(scene - 1);
  shots.forEach(([start, target], i) => {
    if (scene === 0 && i === 0) return;
    const length = i === 0 ? MOVE : SHOT_MOVE;
    const t = interpolate(frame, [start, start + length], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: smooth,
    });
    pose = fly(pose, target, t);
  });
  // a slow handheld drift, so the frame is never still
  const drift = Math.sin(frame / 50) * 0.1;
  const sway = Math.cos(frame / 70) * 0.06;
  return {
    pos: [pose.pos[0] + drift, pose.pos[1] + sway, pose.pos[2]],
    look: pose.look,
  };
}

function CameraRig({ pose }: { pose: Pose }) {
  const cam = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    cam.fov = 34;
    cam.aspect = W / H;
    cam.near = 0.05;
    cam.far = 200;
    cam.position.set(...pose.pos);
    cam.lookAt(new THREE.Vector3(...pose.look));
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  });
  return null;
}

function toScreen(pose: Pose, p: [number, number, number]): [number, number] {
  const cam = new THREE.PerspectiveCamera(34, W / H, 0.05, 200);
  cam.position.set(...pose.pos);
  cam.lookAt(new THREE.Vector3(...pose.look));
  cam.updateMatrixWorld();
  const v = new THREE.Vector3(...p).project(cam);
  return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
}

// ── timing helpers ──────────────────────────────────────────────────────

// 0 → 1: done once its scene is over, a spring on its own frame inside it.
function useBeat(now: number, scene: number, at: number, damping = 14) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (now > scene) return 1;
  if (now < scene) return 0;
  return spring({ frame: frame - at, fps, config: { damping, mass: 0.8 } });
}
function useRamp(now: number, scene: number, at: number, length: number) {
  const frame = useCurrentFrame();
  if (now > scene) return 1;
  if (now < scene) return 0;
  return interpolate(frame, [at, at + length], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
}

const rounded = (w: number, h: number, d: number, r: number) =>
  new RoundedBoxGeometry(w, h, d, 4, r);

// ── the objects ─────────────────────────────────────────────────────────

// The agent: a toy robot. `look` turns its head, `hop` lifts it, `badge`
// sticks the NEW badge on.
function Robot({ badge, carry }: { badge: number; carry?: number }) {
  const frame = useCurrentFrame();
  const head = useMemo(() => rounded(1.1, 0.85, 0.9, 0.22), []);
  const body = useMemo(() => rounded(0.9, 0.75, 0.65, 0.18), []);
  const blink = frame % 80 > 75 ? 0.15 : 1;
  const bob = Math.sin(frame / 9) * 0.04;
  return (
    <group position={[0, bob, 0]}>
      <mesh geometry={body} position={[0, 0.45, 0]} castShadow>
        <meshStandardMaterial color="#e9e6df" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.55, 0.335]} castShadow>
        <boxGeometry args={[0.14, 0.42, 0.02]} />
        <meshStandardMaterial color={colors.accent} roughness={0.5} />
      </mesh>
      <group
        position={[0, 1.3, 0]}
        rotation={[0, Math.sin(frame / 30) * 0.25, 0]}
      >
        <mesh geometry={head} castShadow>
          <meshStandardMaterial color="#e9e6df" roughness={0.45} />
        </mesh>
        <mesh position={[0, 0, 0.452]}>
          <planeGeometry args={[0.8, 0.52]} />
          <meshStandardMaterial color="#141414" roughness={0.3} />
        </mesh>
        {[-0.18, 0.18].map((x) => (
          <mesh key={x} position={[x, 0.04, 0.46]} scale={[1, blink, 1]}>
            <circleGeometry args={[0.08, 24]} />
            <meshStandardMaterial
              color={colors.accent}
              emissive={colors.accent}
              emissiveIntensity={1.4}
            />
          </mesh>
        ))}
        <mesh position={[0, 0.58, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.3, 12]} />
          <meshStandardMaterial color="#9a9a9a" />
        </mesh>
        <mesh position={[0, 0.76, 0]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial
            color={colors.accent}
            emissive={colors.accent}
            emissiveIntensity={0.8}
          />
        </mesh>
      </group>
      {badge > 0 ? (
        <mesh position={[0.24, 0.62, 0.34]} scale={badge}>
          <planeGeometry args={[0.32, 0.16]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ) : null}
      {carry ? (
        <group position={[0.55, 0.65, 0.2]} rotation={[0, 0, -0.6]}>
          <Pencil glow={1} />
        </group>
      ) : null}
    </group>
  );
}

function Pencil({ glow = 0 }: { glow?: number }) {
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.07, 0.07, 1.1, 6]} />
        <meshStandardMaterial
          color={colors.accent}
          emissive={colors.accent}
          emissiveIntensity={glow * 0.5}
          roughness={0.5}
        />
      </mesh>
      <mesh position={[0, 0.65, 0]} castShadow>
        <coneGeometry args={[0.07, 0.2, 6]} />
        <meshStandardMaterial color="#e8c9a0" />
      </mesh>
    </group>
  );
}

function ToolTray({ picked }: { picked: number }) {
  const tray = useMemo(() => rounded(3.6, 0.3, 1.5, 0.12), []);
  return (
    <group position={[4.6, 0, -2.6]}>
      <mesh geometry={tray} position={[0, 0.15, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#2a2a2c" roughness={0.6} metalness={0.2} />
      </mesh>
      {/* 01 search: a magnifier */}
      <group position={[-1.3, 0.38, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.28, 0.06, 12, 32]} />
          <meshStandardMaterial
            color="#cfcfd4"
            metalness={0.8}
            roughness={0.25}
          />
        </mesh>
        <mesh
          position={[0.32, 0, 0.32]}
          rotation={[0, Math.PI / 4, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.05, 0.05, 0.45, 8]} />
          <meshStandardMaterial color="#1b1b1b" />
        </mesh>
      </group>
      {/* 02 write: the pencil the agent picks */}
      <group
        position={[-0.35, 0.38 + picked * 0.9, 0]}
        rotation={[0, 0.3, 0]}
        scale={1 - picked}
      >
        <Pencil glow={picked} />
      </group>
      {/* 03 lay out: a ruler */}
      <mesh position={[0.6, 0.36, 0]} rotation={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[0.32, 0.05, 1.2]} />
        <meshStandardMaterial color="#e4d38a" roughness={0.6} />
      </mesh>
      {/* 04 check: a small tick stamp */}
      <group position={[1.35, 0.3, 0]}>
        <mesh position={[0, 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.24, 0.22, 20]} />
          <meshStandardMaterial color={OK} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.38, 0]} castShadow>
          <sphereGeometry args={[0.14, 16, 16]} />
          <meshStandardMaterial color="#1b1b1b" />
        </mesh>
      </group>
    </group>
  );
}

// The manager: a big rubber stamp. `press` 0 → 1 → 0 brings it down.
function BigStamp({ press, hover }: { press: number; hover: number }) {
  const base = useMemo(() => rounded(1.4, 0.35, 1.0, 0.08), []);
  const y = 0.25 + (1 - press) * 1.4 + (1 - hover) * 6;
  return (
    <group position={[0, y, 0]}>
      <mesh geometry={base} position={[0, 0.18, 0]} castShadow>
        <meshStandardMaterial color="#2b2b2d" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[1.3, 0.06, 0.9]} />
        <meshStandardMaterial color="#8a1e1e" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.65, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.2, 0.7, 16]} />
        <meshStandardMaterial color="#d9d4c8" roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.15, 0]} castShadow>
        <sphereGeometry args={[0.34, 24, 24]} />
        <meshStandardMaterial color={colors.accent} roughness={0.4} />
      </mesh>
    </group>
  );
}

// A sticky note that drops onto the desk.
function Note({
  text,
  drop,
  at,
  color = "#ffd84d",
  size = 1.6,
  turn = 0,
}: {
  text: string;
  drop: number;
  at: [number, number, number];
  color?: string;
  size?: number;
  turn?: number;
}) {
  const tex = useMemo(
    () =>
      textTexture([text], {
        bg: color,
        fg: "#1b1b1b",
        font: `400 ${text.length > 8 ? 92 : 120}px "${fontFamilies.tanker}"`,
      }),
    [text, color],
  );
  return (
    <group
      position={[at[0], at[1] + (1 - drop) * 3, at[2]]}
      rotation={[0, turn + (1 - drop) * 0.6, 0]}
      scale={drop > 0 ? 1 : 0}
    >
      <mesh
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow
        receiveShadow
      >
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial map={tex} roughness={0.85} />
      </mesh>
    </group>
  );
}

// The red string from note to note, growing along its path.
function StringPath({
  points,
  grow,
}: {
  points: [number, number, number][];
  grow: number;
}) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    return new THREE.TubeGeometry(curve, 60, 0.03, 8, false);
  }, [points]);
  const count = geo.index ? geo.index.count : 0;
  geo.setDrawRange(0, Math.floor((count * grow) / 6) * 6);
  return (
    <mesh geometry={geo} castShadow>
      <meshStandardMaterial color="#d72a2a" roughness={0.6} />
    </mesh>
  );
}

// A phone lying on the desk; `screen` is its texture, `stand` 0 → 1 lifts
// it upright towards the camera.
function Phone({
  at,
  screen,
  stand = 0,
  children,
}: {
  at: [number, number, number];
  screen: THREE.Texture;
  stand?: number;
  children?: ReactNode;
}) {
  const body = useMemo(() => rounded(1.55, 0.14, 3.1, 0.2), []);
  return (
    <group
      position={[at[0], at[1] + stand * 1.9, at[2] - stand * 0.6]}
      rotation={[stand * (Math.PI / 2 - 0.25), 0, 0]}
    >
      <mesh geometry={body} castShadow receiveShadow>
        <meshStandardMaterial color="#1a1a1c" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.072, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.42, 2.95]} />
        <meshStandardMaterial
          map={screen}
          emissive="#ffffff"
          emissiveMap={screen}
          emissiveIntensity={0.55}
          roughness={0.2}
        />
      </mesh>
      {children}
    </group>
  );
}

// A card of the TikMaker pipeline rising out of the phone's screen.
function RisingCard({
  text,
  rise,
  level,
}: {
  text: string;
  rise: number;
  level: number;
}) {
  const tag = useMemo(
    () =>
      textTexture(["AI"], {
        bg: colors.accent,
        fg: "#171717",
        font: `700 150px "${fontFamilies.clashBold}"`,
        w: 256,
        h: 128,
      }),
    [],
  );
  const tex = useMemo(
    () =>
      textTexture([text], {
        bg: "#222222",
        fg: "#ffffff",
        font: `600 120px "${fontFamilies.clashSemibold}"`,
        w: 768,
        h: 256,
        border: colors.accent,
      }),
    [text],
  );
  return (
    <group
      position={[0, 0.1 + rise * (0.45 + level * 0.42), 1.0 - level * 0.62]}
      rotation={[-Math.PI / 2 + rise * 0.5, 0, 0]}
      scale={rise > 0.01 ? 1 : 0}
    >
      <mesh castShadow>
        <planeGeometry args={[1.5, 0.5]} />
        <meshStandardMaterial map={tex} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.62, 0.22, 0.01]} scale={rise}>
        <planeGeometry args={[0.36, 0.18]} />
        <meshStandardMaterial
          map={tag}
          emissive={colors.accent}
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

// An answer card on the desk, with the stamp's mark once pressed.
function AnswerCard({
  at,
  show,
  mark,
  ok,
  back,
}: {
  at: [number, number, number];
  show: number;
  mark: number;
  ok: boolean;
  back: number;
}) {
  const paper = useMemo(
    () =>
      textTexture(["answer"], {
        bg: "#f3f0e8",
        fg: "#9a948a",
        font: `600 70px "${fontFamilies.clashSemibold}"`,
        h: 384,
      }),
    [],
  );
  const stampTex = useMemo(
    () =>
      textTexture([ok ? "APPROVED" : "REJECTED"], {
        bg: "rgba(0,0,0,0)",
        fg: ok ? OK : NO,
        font: `400 110px "${fontFamilies.tanker}"`,
        w: 768,
        h: 256,
        border: ok ? OK : NO,
      }),
    [ok],
  );
  return (
    <group
      // A rejected answer slides back off the line, towards the robot.
      position={[at[0], at[1], at[2] + back * 1.9]}
      rotation={[0, back * 0.4, 0]}
      scale={show > 0.01 ? 1.25 * (1 - back * 0.4) : 0}
    >
      <mesh
        position={[0, 0.02 + (1 - show) * 1.5, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow
        receiveShadow
      >
        <planeGeometry args={[1.3, 0.95]} />
        <meshStandardMaterial map={paper} roughness={0.9} />
      </mesh>
      {mark > 0 ? (
        <mesh
          position={[0, 0.04, 0.22]}
          rotation={[-Math.PI / 2, 0, -0.12]}
          scale={0.6 + mark * 0.4}
        >
          <planeGeometry args={[1.2, 0.4]} />
          <meshStandardMaterial map={stampTex} transparent opacity={mark} />
        </mesh>
      ) : null}
    </group>
  );
}

// ── the desk with everything on it ──────────────────────────────────────

const ROBOT: [number, number, number][] = [
  [0, 0, 0.4],
  [-5.2, 0, -1.6],
  [2.6, 0, -1.0],
  [3.4, 0, 3.8],
  [-6.4, 0, 2.2],
  [2.8, 0, -1.2],
  [-1.9, 0, 6.6],
  [4.3, 0, 8.6],
  [-1.4, 0, 6.8],
];

function Desk({ now, ready }: { now: number; ready: boolean }) {
  const frame = useCurrentFrame();
  // No text on the mat, so it does not wait for the fonts.
  const mat = useMemo(() => matTexture(), []);
  const wood = useMemo(() => woodTexture(), []);
  const tickTex = useMemo(
    () =>
      canvasTexture(256, 256, (g) => {
        g.fillStyle = OK;
        g.beginPath();
        g.arc(128, 128, 120, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = "#ffffff";
        g.lineWidth = 26;
        g.lineCap = "round";
        g.lineJoin = "round";
        g.beginPath();
        g.moveTo(70, 132);
        g.lineTo(112, 174);
        g.lineTo(190, 88);
        g.stroke();
      }),
    [],
  );
  const chatScreen = useMemo(
    () =>
      textTexture(["Make me a video", "", "Here’s one idea…"], {
        bg: "#f2f2f2",
        fg: "#222",
        font: `600 46px "${fontFamilies.clashSemibold}"`,
        w: 512,
        h: 1024,
      }),
    [ready],
  );
  const tmScreen = useMemo(
    () =>
      textTexture(["✦ TikMaker"], {
        bg: "#171717",
        fg: colors.accent,
        font: `700 70px "${fontFamilies.clashBold}"`,
        w: 512,
        h: 1024,
      }),
    [ready],
  );
  const videoScreen = useMemo(
    () =>
      canvasTexture(512, 1024, (g) => {
        const grad = g.createLinearGradient(0, 0, 512, 1024);
        grad.addColorStop(0, colors.accent);
        grad.addColorStop(1, "#3a1a08");
        g.fillStyle = grad;
        g.fillRect(0, 0, 512, 1024);
        g.fillStyle = "#ffffff";
        g.font = `400 96px "${fontFamilies.tanker}"`;
        g.textAlign = "center";
        g.fillText("AI AGENTS", 256, 430);
        g.fillText("EXPLAINED", 256, 540);
      }),
    [ready],
  );

  // where the robot is: it hops from spot to spot as the camera flies
  const hop =
    now === 0
      ? 1
      : interpolate(frame, [4, MOVE + 6], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: smooth,
        });
  const from = ROBOT[Math.max(0, now - 1)];
  const to = ROBOT[now];
  const drop = useBeat(now, 0, 0, 9);
  const robotPos: [number, number, number] = [
    from[0] + (to[0] - from[0]) * hop,
    Math.sin(hop * Math.PI) * 1.2 + (now === 0 ? (1 - drop) * 5 : 0),
    from[2] + (to[2] - from[2]) * hop,
  ];

  const badge = useBeat(now, 1, word(7), 10);
  const day = useBeat(now, 1, word(11), 12);
  const stampIn = useBeat(now, 2, word(14), 16);
  const goal = useBeat(now, 4, word(5), 12);
  const plan = useBeat(now, 4, word(9), 12);
  const string1 = useRamp(now, 4, word(8), 14);
  const string2 = useRamp(now, 4, word(13), 22);
  const steps = [0, 1, 2].map((i) => useBeat(now, 4, word(14) + i * 6, 12));
  const picked = useRamp(now, 5, word(6), 12);
  const output = useBeat(now, 5, word(9), 12);
  const tick = useRamp(now, 5, word(10), 10);
  const cards = [word(8), word(13), word(15), word(17)].map((at) =>
    useRamp(now, 6, at, 16),
  );
  const answers = [0, 1, 2].map((i) => useBeat(now, 7, 4 + i * 5, 14));
  const pressAt = [word(6), word(8), word(10)];
  const marks = pressAt.map((at) => useRamp(now, 7, at + 6, 4));
  const sentBack = useRamp(now, 7, word(10) + 22, 18);
  const stand = useRamp(now, 8, word(9), 40);
  const fill = useRamp(now, 8, word(10), 40);

  // the stamp: hovers over the tray in scene 3, then works the answers
  const pressIndex =
    now === 7
      ? pressAt.findIndex(
          (at, i) =>
            frame >= at - 10 && (i === 2 || frame < pressAt[i + 1] - 10),
        )
      : -1;
  const pressT =
    pressIndex >= 0
      ? interpolate(frame - pressAt[pressIndex], [-8, 0, 8], [0, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;
  const stampHome: [number, number, number] =
    now >= 7 ? [5.6 + Math.max(0, pressIndex) * 1.8, 0, 8.2] : [7.6, 0, -1.4];

  return (
    <>
      {/* the wooden desk and the mat on it */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.03, 0]}
        receiveShadow
      >
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial map={wood} roughness={0.75} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 2.2]}
        receiveShadow
      >
        <planeGeometry args={[19.2, 14.4]} />
        {mat ? (
          <meshStandardMaterial map={mat} roughness={0.9} />
        ) : (
          <meshStandardMaterial color="#0f5a43" />
        )}
      </mesh>

      {/* 2 · the new employee's tiny desk and monitor */}
      <group position={[-4.2, 0, -2.6]}>
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.4, 0.08, 1.2]} />
          <meshStandardMaterial color="#e8e4dc" roughness={0.6} />
        </mesh>
        {[-1.05, 1.05].map((x) => (
          <mesh key={x} position={[x, 0.25, 0]} castShadow>
            <boxGeometry args={[0.08, 0.5, 1.0]} />
            <meshStandardMaterial color="#bdb8ae" />
          </mesh>
        ))}
        <mesh position={[0, 1.05, -0.2]} castShadow>
          <boxGeometry args={[1.2, 0.75, 0.06]} />
          <meshStandardMaterial color="#1a1a1c" />
        </mesh>
        <mesh position={[0, 1.05, -0.165]}>
          <planeGeometry args={[1.08, 0.63]} />
          <meshStandardMaterial
            color={colors.accent}
            emissive={colors.accent}
            emissiveIntensity={now >= 1 ? 0.5 : 0.1}
          />
        </mesh>
      </group>
      <Note
        text="DAY 1"
        drop={day}
        at={[-2.4, 0, -1.4]}
        size={1.1}
        turn={-0.2}
      />

      {/* 3 · the tool tray and the big stamp */}
      <ToolTray picked={picked} />
      <group position={stampHome}>
        <BigStamp press={pressT} hover={stampIn} />
      </group>

      {/* 4 · the chatbot phone */}
      <Phone at={[5.0, 0.07, 3.2]} screen={chatScreen} />

      {/* 5 · goal, plan and steps on a string */}
      <Note
        text="MAKE A VIDEO"
        drop={goal}
        at={[-4.4, 0, 1.4]}
        size={1.9}
        turn={0.05}
      />
      <Note
        text="PLAN"
        drop={plan}
        at={[-4.4, 0, 3.7]}
        size={1.3}
        turn={-0.1}
        color="#ffffff"
      />
      {["TEMPLATE", "SCRIPT", "LAYOUT"].map((s, i) => (
        <Note
          key={s}
          text={s}
          drop={steps[i]}
          at={[-6.6 + i * 2.2, 0, 5.9]}
          size={1.25}
          turn={(i - 1) * 0.12}
          color={i === 0 ? colors.accent : "#ffd84d"}
        />
      ))}
      <StringPath
        points={[
          [-4.4, 0.05, 2.35],
          [-4.3, 0.05, 3.0],
          [-4.4, 0.05, 3.1],
        ]}
        grow={string1}
      />
      {[-6.6, -4.4, -2.2].map((x, i) => (
        <StringPath
          key={x}
          points={[
            [-4.4, 0.05, 4.35],
            [(x - 4.4) / 2, 0.05, 4.9],
            [x, 0.05, 5.3],
          ]}
          grow={Math.min(1, Math.max(0, string2 * 3 - i))}
        />
      ))}

      {/* 6 · the output card the pencil wrote, and its tick */}
      <group position={[5.4, 0, -0.4]} scale={output > 0.01 ? 1 : 0}>
        <mesh
          position={[0, 0.02 + (1 - output) * 1.2, 0]}
          rotation={[-Math.PI / 2, 0, 0.1]}
          castShadow
          receiveShadow
        >
          <planeGeometry args={[1.4, 1.0]} />
          <meshStandardMaterial color="#f3f0e8" roughness={0.9} />
        </mesh>
        <mesh
          position={[0.05, 0.05, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={tick}
        >
          <planeGeometry args={[0.7, 0.7]} />
          <meshStandardMaterial map={tickTex} transparent />
        </mesh>
      </group>

      {/* 7–9 · the TikMaker phone; its cards rise, at the end it stands up */}
      <Phone
        at={[0, 0.07, 6.2]}
        screen={now >= 8 ? videoScreen : tmScreen}
        stand={stand}
      >
        {now < 8
          ? ["TOPIC", "TEMPLATE", "HOOKS", "SCRIPT"].map((s, i) => (
              <RisingCard key={s} text={s} rise={cards[i]} level={i} />
            ))
          : null}
        {now >= 8 ? (
          <mesh
            position={[-0.7 + fill * 0.7, 0.08, 1.25]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[Math.max(0.001, fill), 1, 1]}
          >
            <planeGeometry args={[1.4, 0.06]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={0.8}
            />
          </mesh>
        ) : null}
      </Phone>

      {/* 8 · the answers the stamp checks */}
      {[0, 1, 2].map((i) => (
        <AnswerCard
          key={i}
          at={[5.6 + i * 1.8, 0, 8.2]}
          show={answers[i]}
          mark={marks[i]}
          ok={i < 2}
          back={i === 2 ? sentBack : 0}
        />
      ))}

      {/* the agent */}
      <group
        position={robotPos}
        rotation={[
          0,
          now === 0
            ? 0
            : Math.atan2(to[0] - from[0], to[2] - from[2]) * (1 - hop),
          0,
        ]}
      >
        <Robot
          badge={now > 1 ? 1 : badge}
          carry={now === 5 && picked > 0.99 ? 1 : 0}
        />
      </group>
    </>
  );
}

// Labels for the four tools in scene 3, on leader lines, the way a product
// teardown labels its parts.
function ToolLabels({ pose, now }: { pose: Pose; now: number }) {
  const frame = useCurrentFrame();
  if (now !== 2) return null;
  const tools = [
    { n: "01", name: "search", x: -1.3 },
    { n: "02", name: "write", x: -0.35 },
    { n: "03", name: "lay out", x: 0.6 },
    { n: "04", name: "check", x: 1.35 },
  ];
  return (
    <>
      {tools.map((t, i) => {
        const at = word(5) + i * 6;
        const k = interpolate(frame, [at, at + 12], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const [x, y] = toScreen(pose, [4.6 + t.x, 0.6, -2.6]);
        const ly = 620 + i * 120;
        return (
          <div key={t.n} style={{ position: "absolute", inset: 0, opacity: k }}>
            <svg
              width={W}
              height={H}
              style={{ position: "absolute", inset: 0 }}
            >
              <circle cx={x} cy={y} r={9} fill="#ffffff" />
              <polyline
                points={`${x},${y} ${x},${ly} ${x + (150 - x) * 0 + 40},${ly}`}
                fill="none"
                stroke="#ffffff"
                strokeWidth={3}
                opacity={0.8}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                left: x + 52,
                top: ly,
                transform: "translateY(-50%)",
                fontFamily: fontFamilies.clashSemibold,
                fontSize: 46,
                color: "#ffffff",
                whiteSpace: "nowrap",
                textShadow: "0 4px 18px rgba(0,0,0,.6)",
              }}
            >
              <span
                style={{
                  fontFamily: MONO_FONT,
                  fontSize: 34,
                  color: colors.accent,
                  marginRight: 12,
                }}
              >
                {t.n}
              </span>
              {t.name}
            </div>
          </div>
        );
      })}
    </>
  );
}

// Scene 4 inside the phone: the chat, in 2D, after the camera dives in.
function ChatScreen({ now }: { now: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inside =
    now === 3
      ? interpolate(frame, [MOVE + 16, MOVE + 24], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : now === 4
        ? interpolate(frame, [0, 10], [1, 0], { extrapolateRight: "clamp" })
        : 0;
  if (inside <= 0) return null;
  const a =
    now === 3
      ? spring({ frame: frame - (MOVE + 22), fps, config: { damping: 14 } })
      : 1;
  const b =
    now === 3
      ? spring({ frame: frame - word(4), fps, config: { damping: 14 } })
      : 1;
  const stop =
    now === 3
      ? spring({ frame: frame - word(7), fps, config: { damping: 10 } })
      : 1;
  const bubble = (mine: boolean, text: string, t: number) => (
    <div
      style={{
        alignSelf: mine ? "flex-end" : "flex-start",
        padding: "30px 40px",
        borderRadius: 44,
        borderBottomRightRadius: mine ? 10 : 44,
        borderBottomLeftRadius: mine ? 44 : 10,
        background: mine ? colors.accent : "#2a2a2d",
        color: "#ffffff",
        fontFamily: fontFamilies.clashSemibold,
        fontSize: fontSizes.body,
        transform: `scale(${t}) translateY(${(1 - t) * 40}px)`,
        opacity: t,
      }}
    >
      {text}
    </div>
  );
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#111113",
        opacity: inside,
        display: "flex",
        flexDirection: "column",
        gap: 34,
        padding: "520px 150px 0",
        boxSizing: "border-box",
      }}
    >
      {bubble(true, "Make me a video", a)}
      {bubble(false, "Here’s one idea…", b)}
      <div
        style={{
          alignSelf: "center",
          marginTop: 90,
          display: "flex",
          alignItems: "center",
          gap: 24,
          padding: "26px 46px",
          borderRadius: 999,
          background: "#1b1b1b",
          color: "#ffffff",
          fontFamily: fontFamilies.clashSemibold,
          fontSize: fontSizes.bodyLarge,
          transform: `scale(${stop})`,
        }}
      >
        <svg width="56" height="56" viewBox="0 0 70 70">
          <rect
            x="14"
            y="10"
            width="14"
            height="50"
            rx="5"
            fill={colors.accent}
          />
          <rect
            x="42"
            y="10"
            width="14"
            height="50"
            rx="5"
            fill={colors.accent}
          />
        </svg>
        waiting…
      </div>
    </div>
  );
}

// ── one scene ───────────────────────────────────────────────────────────

function DeskScene({
  now,
  title,
  highlight,
  step,
  children,
}: {
  now: number;
  title: string;
  highlight: string;
  step?: number;
  children?: ReactNode;
}) {
  const frame = useCurrentFrame();
  const ready = useFontsReady();
  const pose = poseAt(now, frame);
  const titleStart = now === 0 ? 0 : MOVE - 10;
  return (
    <div style={{ position: "absolute", inset: 0, background: "#3a2616" }}>
      <ThreeCanvas width={W} height={H} shadows>
        <CameraRig pose={pose} />
        {/* a dark room around the desk, so low shots have a horizon */}
        <color attach="background" args={["#140d08"]} />
        <fog attach="fog" args={["#140d08", 22, 48]} />
        <ambientLight intensity={0.55} />
        <hemisphereLight args={["#fff5e6", "#2a1a10", 0.5]} />
        <directionalLight
          position={[6, 18, 8]}
          intensity={2.4}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-14}
          shadow-camera-right={14}
          shadow-camera-top={14}
          shadow-camera-bottom={-14}
          shadow-bias={-0.0004}
        />
        <Desk now={now} ready={ready} />
      </ThreeCanvas>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 45%, transparent 55%, rgba(0,0,0,.55) 100%)",
          pointerEvents: "none",
        }}
      />
      <ToolLabels pose={pose} now={now} />
      <ChatScreen now={now} />
      {step ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "10%",
            transform: "translate(-50%,-50%)",
          }}
        >
          <StepNumber n={step} start={titleStart} />
        </div>
      ) : null}
      <div style={{ textShadow: "0 6px 26px rgba(0,0,0,.55)" }}>
        <Title
          text={title}
          highlight={highlight}
          y={step ? 20 : 14}
          start={titleStart}
          size={step ? fontSizes.title : fontSizes.headline}
        />
      </div>
      {children}
    </div>
  );
}

export const deskScenes = {
  "ai-agent-explained/hook": () => (
    <DeskScene now={0} title="AI AGENTS, EXPLAINED" highlight="AGENTS">
      <Sfx at={8} id="d-pop" />
    </DeskScene>
  ),
  "ai-agent-explained/new-employee": () => (
    <DeskScene now={1} title="A NEW EMPLOYEE" highlight="NEW" />
  ),
  "ai-agent-explained/tools-and-manager": () => (
    <DeskScene now={2} title="A MENU AND A MANAGER" highlight="MANAGER" />
  ),
  "ai-agent-explained/chatbot-stops": () => (
    <DeskScene now={3} title="A CHATBOT JUST STOPS" highlight="STOPS">
      <Sfx at={MOVE + 10} id="soft-whoosh" />
    </DeskScene>
  ),
  "ai-agent-explained/goal-plan-steps": () => (
    <DeskScene now={4} title="ONE GOAL, MANY STEPS" highlight="GOAL" />
  ),
  "ai-agent-explained/pick-and-check": () => (
    <DeskScene now={5} title="PICK A TOOL, CHECK IT" highlight="CHECK" step={1}>
      <Sfx at={word(10)} id="check" />
    </DeskScene>
  ),
  "ai-agent-explained/inside-tikmaker": () => (
    <DeskScene now={6} title="INSIDE TIKMAKER" highlight="TIKMAKER" />
  ),
  "ai-agent-explained/code-checks": () => (
    <DeskScene now={7} title="CODE CHECKS EVERYTHING" highlight="CODE" step={2}>
      <Sfx at={word(10)} id="d-break" />
    </DeskScene>
  ),
  "ai-agent-explained/finished-work": () => (
    <DeskScene now={8} title="FINISHED WORK" highlight="FINISHED" step={3}>
      <Sfx at={word(10) + 30} id="d-done" />
    </DeskScene>
  ),
};
