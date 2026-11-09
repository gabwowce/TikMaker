import { useFrame, useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  random,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Bulb, Shockwave } from "./Bulb";
import { Buildings } from "./Buildings";
import { Flare, Rays, Sparks } from "./Burst";
import { BULB_Y, clamp, nightAt, T } from "./kit";
import { nightGlow, Street } from "./Street";
import { Cars, Clouds, ParkedCars } from "./Traffic";

export { BULB_CITY_FRAMES } from "./kit";

// "A glowing light bulb cracks open and a tiny 3D city builds itself out of
// it, block by block, then day turns to night." A standalone showcase clip –
// a resource a video drops into a recording slot, not a scene of the design
// system.

const ease = { ...clamp, easing: Easing.inOut(Easing.cubic) };

// ── Sky: a vertical gradient through the day, drawn as the scene's
// background so the glow is computed over it ─────────────────────────────

type Stops = [string, string];
const SKY: { at: number; stops: Stops }[] = [
  { at: 0, stops: ["#211a14", "#0b0907"] },
  { at: T.CRACK, stops: ["#241c16", "#0c0a08"] },
  { at: T.LAND, stops: ["#22324f", "#0d1526"] },
  { at: 152, stops: ["#93d8e4", "#2b88a8"] },
  { at: T.DUSK, stops: ["#93d8e4", "#2b88a8"] },
  { at: T.DUSK + 24, stops: ["#ffc08c", "#c46a7c"] },
  { at: T.NIGHT + 14, stops: ["#24366e", "#0a1230"] },
];

function skyAt(frame: number): Stops {
  let i = 0;
  while (i < SKY.length - 2 && frame > SKY[i + 1].at) i++;
  const a = SKY[i];
  const b = SKY[i + 1];
  const t = interpolate(frame, [a.at, b.at], [0, 1], ease);
  return [0, 1].map((k) =>
    `#${new THREE.Color(a.stops[k]).lerp(new THREE.Color(b.stops[k]), t).getHexString()}`,
  ) as Stops;
}

function Sky({ frame }: { frame: number }) {
  const scene = useThree((state) => state.scene);
  const paint = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 512;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return { ctx: canvas.getContext("2d")!, texture };
  }, []);
  const [top, bottom] = skyAt(frame);
  const gradient = paint.ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  paint.ctx.fillStyle = gradient;
  paint.ctx.fillRect(0, 0, 4, 512);
  paint.texture.needsUpdate = true;
  scene.background = paint.texture;
  return null;
}

// ── Glow: the frame rendered through a bloom pass ─────────────────────────

function Bloom({ frame }: { frame: number }) {
  const { gl, scene, camera, size } = useThree();
  const pipeline = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(size.width, size.height, {
      type: THREE.HalfFloatType,
      samples: 4,
    });
    const composer = new EffectComposer(gl, target);
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(size.width, size.height);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 1, 0.5, 1);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    return { composer, bloom };
  }, [gl, scene, camera, size.width, size.height]);
  // strong while the bulb burns and bursts, soft by day, back for the night
  pipeline.bloom.strength = interpolate(
    frame,
    [0, T.CRACK, 115, 160, T.DUSK, T.NIGHT],
    [0.6, 0.9, 0.7, 0.3, 0.3, 0.6],
    clamp,
  );
  pipeline.bloom.threshold = interpolate(
    frame,
    [0, T.CRACK, 120, 160, T.DUSK, T.NIGHT + 10],
    [2.2, 1.6, 1.6, 2.3, 2.0, 1.15],
    clamp,
  );
  // priority 1: this replaces the canvas's own render
  useFrame(() => pipeline.composer.render(), 1);
  return null;
}

// ── Camera: close on the bulb, out as the city bursts from it ────────────

function CameraRig({ frame }: { frame: number }) {
  const camera = useThree((state) => state.camera);
  const dist = interpolate(
    frame,
    [0, T.CRACK - 4, T.CRACK + 18, 125, 200, 360],
    [7.6, 6.7, 10, 26, 34, 34.5],
    ease,
  );
  const elev = interpolate(frame, [0, T.CRACK, 110, 170, 360], [0.1, 0.1, 0.4, 0.54, 0.56], ease);
  const targetY = interpolate(
    frame,
    [0, T.CRACK, 110, 200],
    [BULB_Y - 0.35, BULB_Y - 0.35, 1.6, 1.6],
    ease,
  );
  const angle = 0.62 + frame * 0.0034;
  camera.position.set(
    Math.sin(angle) * Math.cos(elev) * dist,
    targetY + Math.sin(elev) * dist,
    Math.cos(angle) * Math.cos(elev) * dist,
  );
  camera.lookAt(0, targetY, 0);
  return null;
}

// A dark studio with a few big soft windows: what the bulb's glass reflects
// (long clean highlights, like a product shot), before the city exists.
function studio(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(24, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0x060504, side: THREE.BackSide }),
    ),
  );
  const panel = (
    w: number,
    h: number,
    position: [number, number, number],
    rotation: [number, number, number],
    power: number,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(power, power * 0.96, power * 0.9),
        side: THREE.DoubleSide,
      }),
    );
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    scene.add(mesh);
  };
  panel(3.2, 9, [-7, 1, 2.5], [0, Math.PI / 2, 0], 7);
  panel(1.6, 7, [6.5, 1.5, 1], [0, -Math.PI / 2, 0], 3.5);
  panel(7, 2.2, [0, 8, 1], [Math.PI / 2, 0, 0], 2.2);
  return scene;
}

// Reflections for glass and metal: the studio while the bulb is on screen,
// then a bright room for the city.
function Environment({ frame, intensity }: { frame: number; intensity: number }) {
  const { gl, scene } = useThree();
  const envs = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const bulb = pmrem.fromScene(studio(), 0.02).texture;
    pmrem.dispose();
    return { room, bulb };
  }, [gl]);
  scene.environment = frame < T.CRACK + 24 ? envs.bulb : envs.room;
  scene.environmentIntensity = intensity;
  return null;
}

const STARS = (() => {
  const positions = new Float32Array(1200 * 3);
  for (let i = 0; i < 1200; i++) {
    const theta = random(`st-${i}`) * Math.PI * 2;
    const y = random(`sy-${i}`) * 2 - 1;
    const r = Math.sqrt(1 - y * y);
    positions[i * 3] = Math.cos(theta) * r * 80;
    positions[i * 3 + 1] = y * 80;
    positions[i * 3 + 2] = Math.sin(theta) * r * 80;
  }
  return positions;
})();

function Stars({ frame }: { frame: number }) {
  const opacity = interpolate(frame, [T.NIGHT - 20, T.NIGHT + 30], [0, 0.9], clamp);
  if (opacity <= 0) return null;
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[STARS, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.32} transparent opacity={opacity} depthWrite={false} />
    </points>
  );
}

function World() {
  const frame = useCurrentFrame();
  const night = nightAt(frame);
  const lamps = nightGlow(frame);
  const sun = interpolate(frame, [T.CRACK + 20, 130, T.DUSK, T.NIGHT], [0, 2.8, 2.2, 0.15], clamp);
  const sunColor = frame > T.DUSK - 10 ? "#ffb07a" : "#fff4e2";
  const hemi = interpolate(frame, [0, T.CRACK, 135, T.DUSK, T.NIGHT], [0.25, 0.3, 1.0, 0.8, 0.35], clamp);
  const envIntensity = interpolate(frame, [0, 130, T.DUSK, T.NIGHT], [0.9, 0.8, 0.6, 0.25], clamp);
  return (
    <>
      <Sky frame={frame} />
      <Bloom frame={frame} />
      <CameraRig frame={frame} />
      <Environment frame={frame} intensity={envIntensity} />
      <hemisphereLight args={[night > 0.5 ? "#3c4f9a" : "#cdeee8", "#6b5a4a", hemi]} />
      <directionalLight
        position={[-7, 13, 6]}
        intensity={sun}
        color={sunColor}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      {/* a cool moon fill at night, warm street light at the crossroads */}
      <directionalLight position={[6, 9, -5]} intensity={night * 0.6} color="#8ea6ff" />
      <pointLight position={[0, 1.4, 0]} intensity={lamps * 9} distance={6} decay={1.6} color="#ffcf87" />
      <pointLight position={[2.9, 1.2, 2.9]} intensity={lamps * 6} distance={5} decay={1.6} color="#ffcf87" />
      <pointLight position={[-2.6, 1.2, 0.9]} intensity={lamps * 6} distance={5} decay={1.6} color="#ffcf87" />
      <pointLight position={[2.6, 1.2, -0.9]} intensity={lamps * 6} distance={5} decay={1.6} color="#ffcf87" />

      <Stars frame={frame} />
      <Rays frame={frame} />
      <Bulb frame={frame} />
      <Flare frame={frame} />
      <Sparks frame={frame} />
      <Street frame={frame} />
      <Shockwave frame={frame} />
      <Buildings frame={frame} />
      <Cars frame={frame} />
      <ParkedCars frame={frame} />
      <Clouds frame={frame} />
    </>
  );
}

export function BulbCity() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const flash = interpolate(frame, [T.CRACK, T.CRACK + 2, T.CRACK + 14], [0, 0.45, 0], clamp);
  const landFlash = interpolate(frame, [T.LAND - 2, T.LAND + 1, T.LAND + 12], [0, 0.22, 0], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0907" }}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        gl={{ antialias: true }}
        camera={{ fov: 35, near: 0.1, far: 400 }}
      >
        <World />
      </ThreeCanvas>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.38) 100%)",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{ backgroundColor: "#fff6df", opacity: flash + landFlash, pointerEvents: "none" }}
      />
    </AbsoluteFill>
  );
}
