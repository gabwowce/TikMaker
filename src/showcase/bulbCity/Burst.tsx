import * as THREE from "three";
import { interpolate, random } from "remotion";
import { BULB_Y, clamp, Glow, glowTexture, rayTexture, T } from "./kit";

// The moment the bulb bursts: a blinding core that lights the rising city,
// sparks flying out, and beams of light falling from above while the city
// grows out of it.

export function Flare({ frame }: { frame: number }) {
  const t = frame - T.CRACK;
  if (t < -8 || t > 92) return null;
  const halo = interpolate(t, [-8, 0, 6, 40, 92], [2.5, 6.5, 5, 3.4, 0], clamp);
  const core = interpolate(t, [-8, 0, 4, 34, 92], [0.12, 0.3, 0.26, 0.2, 0], clamp);
  const light = interpolate(t, [-8, 0, 10, 60, 92], [20, 60, 45, 18, 0], clamp);
  return (
    <group position={[0, BULB_Y, 0]}>
      <Glow scale={halo} opacity={0.75} />
      <Glow scale={halo * 0.38} opacity={0.9} />
      {core > 0 ? (
        <mesh scale={core}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial color={[3.2, 2.5, 1.5]} />
        </mesh>
      ) : null}
      <pointLight color="#ffb04a" intensity={light} distance={22} decay={2} />
    </group>
  );
}

const SPARKS = Array.from({ length: 220 }, (_, i) => {
  const y = random(`spy-${i}`) * 2 - 1;
  const r = Math.sqrt(1 - y * y);
  const theta = random(`spt-${i}`) * Math.PI * 2;
  return {
    dir: new THREE.Vector3(Math.cos(theta) * r, y * 0.8 + 0.25, Math.sin(theta) * r),
    speed: 0.05 + random(`sps-${i}`) * 0.17,
    life: 26 + random(`spl-${i}`) * 50,
  };
});

export function Sparks({ frame }: { frame: number }) {
  const t = frame - T.CRACK;
  if (t < 0 || t > 80) return null;
  const positions = new Float32Array(SPARKS.length * 3);
  SPARKS.forEach((spark, i) => {
    const alive = t < spark.life;
    const p = spark.dir.clone().multiplyScalar(spark.speed * t);
    p.y -= 0.0018 * t * t;
    positions[i * 3] = alive ? p.x : 0;
    positions[i * 3 + 1] = alive ? p.y : -999;
    positions[i * 3 + 2] = alive ? p.z : 0;
  });
  return (
    <points position={[0, BULB_Y, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={glowTexture()}
        color={[3, 2.1, 1.1]}
        size={0.16}
        transparent
        opacity={interpolate(t, [0, 50, 80], [1, 0.8, 0], clamp)}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

const BEAMS = [
  { x: -0.9, width: 1.2, tilt: 0.22, strength: 0.7 },
  { x: -0.35, width: 0.7, tilt: 0.1, strength: 1 },
  { x: 0.05, width: 1.6, tilt: 0, strength: 0.85 },
  { x: 0.5, width: 0.8, tilt: -0.12, strength: 1 },
  { x: 1.0, width: 1.3, tilt: -0.24, strength: 0.65 },
];

export function Rays({ frame }: { frame: number }) {
  const o = interpolate(frame, [T.CRACK - 4, T.CRACK + 10, 150, 205], [0, 0.55, 0.32, 0], clamp);
  if (o <= 0) return null;
  return (
    <group position={[0, BULB_Y + 5, 0]}>
      {BEAMS.map((beam, i) => (
        <sprite key={i} position={[beam.x, 0, 0]} scale={[beam.width, 14, 1]}>
          <spriteMaterial
            map={rayTexture()}
            rotation={beam.tilt + Math.sin(frame / 45 + i) * 0.025}
            color={[1.4, 1.2, 0.95]}
            transparent
            opacity={o * beam.strength}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
      ))}
    </group>
  );
}
