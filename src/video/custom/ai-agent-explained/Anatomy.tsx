import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { MONO_FONT } from "../../visuals/dev/devText";
import { colors, fontFamilies, fontSizes } from "../../typography/tokens";
import { OK, Sfx, Title } from "./kit";

// "Anatomy of an AI agent": an exploded 3D stack, one layer per part of the
// agent, each lifting off the one below with a numbered label on a leader
// line – the product-teardown look, in this video's colours.
//
// Bottom to top: 04 Output (the tray the work lands in), 03 Checks (a plate
// of green check cells – plain code), 02 Tools (a fixed menu of keys, one of
// them picked), 01 Model (the glowing chip that chooses).

const W = 1080;
const H = 1920;
// The stack sits left of centre so the labels have the right-hand column.
const STACK_X = -0.3;

const LAYERS = [
  { n: "04", name: "Output", note: "finished work", rest: 0.0 },
  { n: "03", name: "Checks", note: "plain code", rest: 0.55 },
  { n: "02", name: "Tools", note: "a fixed menu", rest: 1.0 },
  { n: "01", name: "Model", note: "it chooses", rest: 1.55 },
];
const GAP = 1.25; // how far each layer lifts when the stack opens

const camera = {
  position: [13.2, 11.4, 17.2] as const,
  target: [0.4, 2.7, 0] as const,
  fov: 30,
};

// When each layer lifts, in frames: one after another, top first.
const liftAt = (i: number) => 18 + (3 - i) * 9;

function useLift(i: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - liftAt(i),
    fps,
    config: { damping: 200, mass: 1.2 },
  });
}

function layerY(i: number, lift: number) {
  return LAYERS[i].rest + lift * GAP * i;
}

// The same camera three.js uses, to find where a layer's edge lands on
// screen, so each label's leader line ends exactly on its layer.
function project(point: THREE.Vector3): [number, number] {
  const cam = new THREE.PerspectiveCamera(camera.fov, W / H, 0.1, 100);
  cam.position.set(...camera.position);
  cam.lookAt(new THREE.Vector3(...camera.target));
  cam.updateMatrixWorld();
  const p = point.clone().project(cam);
  return [((p.x + 1) / 2) * W, ((1 - p.y) / 2) * H];
}

// Puts three.js's own camera exactly where `project` assumes it is.
function CameraRig() {
  const cam = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    cam.fov = camera.fov;
    cam.aspect = W / H;
    cam.position.set(...camera.position);
    cam.lookAt(new THREE.Vector3(...camera.target));
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  });
  return null;
}

function useRounded(w: number, h: number, d: number, r: number) {
  return useMemo(() => new RoundedBoxGeometry(w, h, d, 4, r), [w, h, d, r]);
}

function Assembly({ turn }: { turn: number }) {
  const lifts = [useLift(0), useLift(1), useLift(2), useLift(3)];
  const frame = useCurrentFrame();
  const tray = useRounded(5.2, 0.42, 3.6, 0.12);
  const plate = useRounded(4.8, 0.14, 3.2, 0.06);
  const cell = useRounded(0.62, 0.08, 0.62, 0.03);
  const key = useRounded(0.82, 0.46, 0.82, 0.1);
  const chip = useRounded(2.0, 0.5, 2.0, 0.14);
  // Which tool gets picked: the orange key lights up once the stack is open.
  const picked = interpolate(frame, [liftAt(0) + 30, liftAt(0) + 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glow = 0.6 + 0.4 * Math.sin(frame / 10);

  return (
    <group position={[STACK_X, 0, 0]} rotation={[0, turn, 0]}>
      {/* 04 Output: a dark tray with a lighter inner floor */}
      <group position={[0, layerY(0, lifts[0]), 0]}>
        <mesh geometry={tray} castShadow receiveShadow>
          <meshStandardMaterial
            color="#1c1c1c"
            roughness={0.55}
            metalness={0.2}
          />
        </mesh>
        <mesh
          position={[0, 0.215, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[4.6, 3.0]} />
          <meshStandardMaterial color="#2b2b2b" roughness={0.8} />
        </mesh>
      </group>

      {/* 03 Checks: an aluminium plate with green check cells */}
      <group position={[0, layerY(1, lifts[1]), 0]}>
        <mesh geometry={plate} castShadow receiveShadow>
          <meshStandardMaterial
            color="#3a3a3c"
            roughness={0.35}
            metalness={0.75}
          />
        </mesh>
        {Array.from({ length: 12 }, (_, k) => {
          const x = (k % 4) * 1.0 - 1.5;
          const z = Math.floor(k / 4) * 0.95 - 0.95;
          const on = interpolate(
            frame,
            [liftAt(1) + 14 + k * 2, liftAt(1) + 20 + k * 2],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          return (
            <mesh key={k} geometry={cell} position={[x, 0.1, z]} castShadow>
              <meshStandardMaterial
                color={OK}
                emissive={OK}
                emissiveIntensity={on * 0.9}
                roughness={0.4}
              />
            </mesh>
          );
        })}
      </group>

      {/* 02 Tools: a menu of keys; one is the tool the model picks */}
      <group position={[0, layerY(2, lifts[2]), 0]}>
        {Array.from({ length: 12 }, (_, k) => {
          const x = (k % 4) * 1.0 - 1.5;
          const z = Math.floor(k / 4) * 0.95 - 0.95;
          const isPicked = k === 6;
          const color = isPicked
            ? colors.accent
            : k % 3 === 0
              ? "#9a9aa0"
              : "#e9e7e2";
          return (
            <mesh
              key={k}
              geometry={key}
              position={[x, isPicked ? picked * 0.25 : 0, z]}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial
                color={color}
                roughness={0.45}
                emissive={isPicked ? colors.accent : "#000000"}
                emissiveIntensity={isPicked ? picked * 0.6 : 0}
              />
            </mesh>
          );
        })}
      </group>

      {/* 01 Model: the glowing chip that chooses */}
      <group position={[0, layerY(3, lifts[3]), 0]}>
        <mesh geometry={chip} castShadow>
          <meshStandardMaterial
            color="#141414"
            roughness={0.3}
            metalness={0.6}
          />
        </mesh>
        <mesh position={[0, 0.27, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.2, 1.2]} />
          <meshStandardMaterial
            color={colors.accent}
            emissive={colors.accent}
            emissiveIntensity={1.2 * glow}
          />
        </mesh>
        <pointLight
          position={[0, 0.9, 0]}
          color={colors.accent}
          intensity={6 * glow}
          distance={4}
        />
        {Array.from({ length: 8 }, (_, k) => {
          const side = k < 4 ? 1 : -1;
          const along = (k % 4) * 0.42 - 0.63;
          return (
            <mesh key={k} position={[side * 1.08, -0.05, along]}>
              <boxGeometry args={[0.18, 0.08, 0.16]} />
              <meshStandardMaterial
                color="#c9a227"
                metalness={0.9}
                roughness={0.25}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function Label({ i, turn, lift }: { i: number; turn: number; lift: number }) {
  const frame = useCurrentFrame();
  const layer = LAYERS[i];
  // The layer's right-hand edge, turned with the stack, then onto the screen.
  const edge = new THREE.Vector3(2.3, layerY(i, lift) + 0.2, 0)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), turn)
    .add(new THREE.Vector3(STACK_X, 0, 0));
  const [ex, ey] = project(edge);
  const start = liftAt(i) + 16;
  const t = interpolate(frame, [start, start + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  // Just right of the layer, so the leader line always reads left to right.
  const labelX = ex + 70;
  const lineEnd = ex + (labelX - 24 - ex) * t;
  return (
    <>
      <svg
        style={{ position: "absolute", left: 0, top: 0 }}
        width={W}
        height={H}
      >
        <circle cx={ex} cy={ey} r={9} fill={colors.textPrimary} opacity={t} />
        <line
          x1={ex}
          y1={ey}
          x2={lineEnd}
          y2={ey}
          stroke={colors.textSecondary}
          strokeWidth={3}
          opacity={t}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: labelX,
          top: ey,
          transform: `translateY(-50%) translateX(${(1 - t) * 30}px)`,
          opacity: t,
          whiteSpace: "nowrap",
        }}
      >
        <div
          style={{
            fontFamily: fontFamilies.clashSemibold,
            fontSize: 52,
            color: colors.textPrimary,
            lineHeight: 1.1,
          }}
        >
          <span
            style={{
              color: colors.accent,
              fontFamily: MONO_FONT,
              fontSize: 40,
              marginRight: 14,
            }}
          >
            {layer.n}
          </span>
          {layer.name}
        </div>
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 30,
            color: colors.textSecondary,
            marginTop: 6,
          }}
        >
          {layer.note}
        </div>
      </div>
    </>
  );
}

export function Anatomy() {
  const frame = useCurrentFrame();
  // A slow turntable, eased in at the start so the stack settles.
  const turn = -0.62 + interpolate(frame, [0, 240], [0, 0.32]);
  const lifts = [useLift(0), useLift(1), useLift(2), useLift(3)];
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(circle at 42% 48%, #262626 0%, ${colors.background} 62%)`,
      }}
    >
      <ThreeCanvas width={W} height={H} shadows>
        <CameraRig />
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[5, 10, 6]}
          intensity={2.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={8}
          shadow-camera-bottom={-6}
        />
        <directionalLight
          position={[-6, 4, -4]}
          intensity={0.6}
          color="#9fb4ff"
        />
        <Assembly turn={turn} />
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.25, 0]}
          receiveShadow
        >
          <planeGeometry args={[40, 40]} />
          <shadowMaterial opacity={0.45} />
        </mesh>
      </ThreeCanvas>
      {LAYERS.map((_, i) => (
        <Label key={i} i={i} turn={turn} lift={lifts[i]} />
      ))}
      <Title
        text="ANATOMY OF AN AI AGENT"
        highlight="AGENT"
        y={12}
        size={fontSizes.title}
      />
      <Sfx at={liftAt(3)} id="soft-whoosh" />
      <Sfx at={liftAt(0) + 30} id="d-pop" />
    </div>
  );
}
