import type { ComponentType, ReactNode } from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import type { FreeScene, FreeVideoProps } from "../FreeVideo";
import { Captions } from "./Captions";
import { C, CL, easeOut } from "./kit";
import { Scene1, Scene2, Scene3, Scene4, Scene5 } from "./scenesA";
import { Scene6, Scene7, Scene8, Scene9 } from "./scenesB";

// Written by Claude Code (variant "official"): the whole video as one component.

const SCENES: ComponentType<{ s: FreeScene }>[] = [
  Scene1,
  Scene2,
  Scene3,
  Scene4,
  Scene5,
  Scene6,
  Scene7,
  Scene8,
  Scene9,
];
// Glow tint per scene: red while tokens burn, green once they're saved.
const TINT = [C.burn, C.amber, C.burn, C.good, C.burn, C.good, C.burn, C.good, C.good];

function Background({ scenes }: { scenes: FreeScene[] }) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      {scenes.map((s, i) => {
        const o = interpolate(
          frame,
          [s.from - 10, s.from + 6, s.from + s.durationInFrames - 4, s.from + s.durationInFrames + 10],
          [0, 1, 1, 0],
          CL,
        );
        if (o <= 0) return null;
        return (
          <AbsoluteFill
            key={i}
            style={{
              opacity: o * 0.55,
              background: `radial-gradient(900px 900px at 50% ${36 + Math.sin(frame / 40) * 4}%, ${TINT[i]}55, transparent 70%)`,
            }}
          />
        );
      })}
      <AbsoluteFill
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.09) 2px, transparent 2.5px)",
          backgroundSize: "54px 54px",
          backgroundPosition: `0px ${(frame * 0.6) % 54}px`,
          WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 45%, #000 30%, transparent 85%)",
        }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.7))" }} />
    </AbsoluteFill>
  );
}

// Every cut: the new scene punches in from slightly big and blurred,
// the old one sinks back for the last few frames.
function Shell({ children }: { children: ReactNode }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const inP = interpolate(frame, [0, 9], [0, 1], { ...CL, easing: easeOut });
  const outP = interpolate(frame, [durationInFrames - 6, durationInFrames], [0, 1], CL);
  return (
    <AbsoluteFill
      style={{
        opacity: inP * (1 - outP),
        scale: String(interpolate(inP, [0, 1], [1.08, 1]) - outP * 0.05),
        filter: inP < 1 || outP > 0 ? `blur(${(1 - inP) * 12 + outP * 8}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

// Thin progress line across the top – where we are in the 45 seconds.
function Progress({ total }: { total: number }) {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top: 0, left: 0, height: 8, width: `${(frame / total) * 100}%`, background: C.yellow, opacity: 0.85 }} />
  );
}

export function OfficialVideo({ scenes, durationInFrames }: FreeVideoProps) {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Background scenes={scenes} />
      {scenes.map((s, i) => {
        const Scene = SCENES[i];
        if (!Scene) return null;
        return (
          <Sequence key={i} name={`Scene ${i + 1}`} from={s.from} durationInFrames={s.durationInFrames}>
            <Shell>
              <Scene s={s} />
            </Shell>
          </Sequence>
        );
      })}
      <Captions scenes={scenes} />
      <Progress total={durationInFrames} />
    </AbsoluteFill>
  );
}
