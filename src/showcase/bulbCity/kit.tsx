import { useLayoutEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { interpolate, random, spring } from "remotion";

// Shared by every piece of the bulb → city clip: the timeline, small helpers
// for instanced detail, and the canvas textures.

export const FPS = 30;
export const BULB_CITY_FRAMES = 360;

// The story, in frames.
export const T = {
  SHAKE: 34, // the bulb burns brighter and cracks start to run
  CRACK: 62, // the glass bursts
  SLAB: 64, // the diorama's base grows out of the light
  BUILD: 68, // buildings rise, glowing gold
  LAND: 100, // the bulb's base lands on the crossroads
  PROPS: 112, // trees, lamps, lights pop in
  CLOUDS: 96, // clouds puff out around the city
  DUSK: 236, // the sun goes down
  NIGHT: 276, // windows and lamps on
} as const;

export const BULB_Y = 2.6;

export const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

// A springy 0 → 1 (with a little overshoot) from `start`.
export function pop(
  frame: number,
  start: number,
  config: { damping?: number; stiffness?: number; mass?: number } = {},
): number {
  return spring({
    frame: frame - start,
    fps: FPS,
    config: { damping: 12, stiffness: 150, mass: 0.6, ...config },
  });
}

// 0 by day, 1 at night.
export const nightAt = (frame: number) =>
  interpolate(frame, [T.DUSK + 10, T.NIGHT + 10], [0, 1], clamp);

// ── Instanced detail ─────────────────────────────────────────────────────

const helper = new THREE.Object3D();
export function mat(
  x: number,
  y: number,
  z: number,
  ry = 0,
  sx = 1,
  sy = 1,
  sz = 1,
  rx = 0,
  rz = 0,
): THREE.Matrix4 {
  helper.position.set(x, y, z);
  helper.rotation.set(rx, ry, rz);
  helper.scale.set(sx, sy, sz);
  helper.updateMatrix();
  return helper.matrix.clone();
}

// Many copies of one small mesh (windows, sills, dashes, fins…).
export function Instances({
  matrices,
  children,
  castShadow = false,
}: {
  matrices: THREE.Matrix4[];
  children: ReactNode;
  castShadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
  }, [matrices]);
  if (!matrices.length) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, matrices.length]}
      castShadow={castShadow}
      receiveShadow
      frustumCulled={false}
    >
      {children}
    </instancedMesh>
  );
}

// ── Textures (made once, in the browser that renders) ────────────────────

const cache = new Map<string, THREE.Texture>();
function cached<T extends THREE.Texture>(key: string, make: () => T): T {
  const hit = cache.get(key);
  if (hit) return hit as T;
  const made = make();
  cache.set(key, made);
  return made;
}

function canvas(size: number) {
  const el = document.createElement("canvas");
  el.width = size;
  el.height = size;
  return { el, ctx: el.getContext("2d")! };
}

// Bricks in running bond, each a slightly different shade of `base`.
export function brickTexture(base: string): THREE.CanvasTexture {
  return cached(`brick-${base}`, () => {
    const { el, ctx } = canvas(256);
    ctx.fillStyle = "#d9cfc0";
    ctx.fillRect(0, 0, 256, 256);
    const bw = 32;
    const bh = 14;
    const gap = 3;
    const color = new THREE.Color(base);
    for (let row = 0; row * (bh + gap) < 256; row++) {
      const offset = row % 2 ? bw / 2 : 0;
      for (let col = -1; col * (bw + gap) < 256; col++) {
        const shade = color
          .clone()
          .offsetHSL(0, 0, (random(`b-${base}-${row}-${col}`) - 0.5) * 0.12);
        ctx.fillStyle = `#${shade.getHexString()}`;
        ctx.fillRect(col * (bw + gap) + offset, row * (bh + gap), bw, bh);
      }
    }
    const texture = new THREE.CanvasTexture(el);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    return texture;
  });
}

// A copy of a texture tiled over a face of the given size (units per tile).
export function tiled(
  texture: THREE.Texture,
  width: number,
  height: number,
  tile = 1.1,
): THREE.Texture {
  const copy = texture.clone();
  copy.needsUpdate = true;
  copy.repeat.set(width / tile, height / tile);
  return copy;
}

// Office windows for the glass tower's night: random lit cells, black between.
export function officeLightsTexture(): THREE.CanvasTexture {
  return cached("office", () => {
    const { el, ctx } = canvas(256);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 8; row++)
      for (let col = 0; col < 8; col++) {
        if (random(`o-${row}-${col}`) < 0.38) continue;
        const warm = random(`ow-${row}-${col}`) < 0.7;
        ctx.fillStyle = warm ? "#ffffff" : "#bcd6ff";
        ctx.fillRect(col * 32 + 3, row * 32 + 6, 26, 20);
      }
    const texture = new THREE.CanvasTexture(el);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  });
}

// Square paving slabs, each a touch lighter or darker, with joints between.
export function pavingTexture(): THREE.CanvasTexture {
  return cached("paving", () => {
    const { el, ctx } = canvas(256);
    ctx.fillStyle = "#a9a397";
    ctx.fillRect(0, 0, 256, 256);
    const base = new THREE.Color("#cdc8bd");
    for (let row = 0; row < 8; row++)
      for (let col = 0; col < 8; col++) {
        const shade = base
          .clone()
          .offsetHSL(0, 0, (random(`pv-${row}-${col}`) - 0.5) * 0.06);
        ctx.fillStyle = `#${shade.getHexString()}`;
        ctx.fillRect(col * 32 + 1.5, row * 32 + 1.5, 29, 29);
      }
    const texture = new THREE.CanvasTexture(el);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    return texture;
  });
}

// A soft vertical beam of light, brightest at the top.
export function rayTexture(): THREE.CanvasTexture {
  return cached("ray", () => {
    const el = document.createElement("canvas");
    el.width = 64;
    el.height = 512;
    const ctx = el.getContext("2d")!;
    const image = ctx.createImageData(64, 512);
    for (let y = 0; y < 512; y++)
      for (let x = 0; x < 64; x++) {
        const across = Math.exp(-(((x - 32) / 11) ** 2));
        const down = Math.pow(1 - y / 512, 1.4);
        const i = (y * 64 + x) * 4;
        image.data[i] = 255;
        image.data[i + 1] = 236;
        image.data[i + 2] = 200;
        image.data[i + 3] = Math.round(255 * across * down);
      }
    ctx.putImageData(image, 0, 0);
    return new THREE.CanvasTexture(el);
  });
}

// How golden a thing still is after it rose out of the light: bright as it
// appears, cooling to its own colours.
export function goldAt(frame: number, start: number): number {
  return interpolate(frame, [start, start + 5, start + 26, start + 56], [0, 1, 0.5, 0], clamp);
}

// Red-and-white awning stripes.
export function stripesTexture(color: string): THREE.CanvasTexture {
  return cached(`stripes-${color}`, () => {
    const { el, ctx } = canvas(64);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? "#f6f1e7" : color;
      ctx.fillRect(i * 8, 0, 8, 64);
    }
    const texture = new THREE.CanvasTexture(el);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    return texture;
  });
}

// A soft round glow for sprites.
export function glowTexture(): THREE.CanvasTexture {
  return cached("glow", () => {
    const { el, ctx } = canvas(128);
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,244,214,1)");
    g.addColorStop(0.22, "rgba(255,206,128,0.55)");
    g.addColorStop(1, "rgba(255,170,80,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(el);
  });
}

export function Glow({
  scale,
  opacity = 1,
  position,
}: {
  scale: number;
  opacity?: number;
  position?: [number, number, number];
}) {
  if (scale <= 0 || opacity <= 0) return null;
  return (
    <sprite position={position} scale={scale}>
      <spriteMaterial
        map={glowTexture()}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={opacity}
        toneMapped={false}
      />
    </sprite>
  );
}

// A leafy blob: an icosphere pushed in and out by a few waves, so a tree's
// crown reads as foliage, not a ball. A handful of variants, shared.
export function foliageGeometry(variant: number): THREE.BufferGeometry {
  const key = `foliage-${variant}`;
  const hit = geometries.get(key);
  if (hit) return hit;
  const geometry = new THREE.IcosahedronGeometry(1, 4);
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const bump =
      Math.sin(v.x * 7 + variant) * Math.sin(v.y * 6 + variant * 2) * 0.08 +
      Math.sin(v.z * 11 + variant * 3) * 0.05 +
      Math.sin((v.x + v.y) * 17 + variant) * 0.025;
    v.multiplyScalar(1 + bump);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  geometries.set(key, geometry);
  return geometry;
}
const geometries = new Map<string, THREE.BufferGeometry>();
