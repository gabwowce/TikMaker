import { type CSSProperties } from "react";
import {
  Audio,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { getSfx } from "../../registries/sfxRegistry";
import type {
  EntrancePreset,
  ExitPreset,
  KenBurnsPreset,
} from "../../schema/scene";
import type { VisualConfig } from "../../schema/visual";
import type { VisualPose } from "../../utils/visualLinks";
import { standardEasing } from "../motion/easing";
import { enter } from "../motion/entrances";
import { exitStyle as computeExitStyle } from "../motion/exits";
import { kenBurns as computeKenBurns } from "../motion/kenBurns";
import { SFX_VOLUME } from "../motion/sfxDefaults";
import { VisualRenderer } from "../visuals/VisualRenderer";
type AnimatedVisualProps = {
  visual: VisualConfig;
  entrance?: EntrancePreset;
  entranceDelay?: number;
  entranceDuration?: number;
  exit?: ExitPreset;
  exitDuration?: number;
  exitAt?: number;
  entranceDistance?: number;
  exitDistance?: number;
  kenBurns?: KenBurnsPreset;
  kenBurnsSpeed?: number;
  durationSeconds: number;
  style?: CSSProperties;
  ownScale?: number;
  ownPosition?: {
    x: number;
    y: number;
  };
  linkFrom?: VisualPose;
  linkTo?: VisualPose;
  sfx?: string;
  exitSfx?: string;
  sfxAt?: number;
  exitSfxAt?: number;
  sfxStartFrom?: number;
  sfxDuration?: number;
  exitSfxStartFrom?: number;
  exitSfxDuration?: number;
  driftSeed?: number;
};
const CUE_WINDOW_FRAMES = 30;
const LINK_BLEND_FRAMES = 18;
type Pose2D = {
  x: number;
  y: number;
};
function poseOffsetPx(pose: VisualPose, own: Pose2D): Pose2D {
  return {
    x: ((pose.x - own.x) / 100) * 1080,
    y: ((pose.y - own.y) / 100) * 1920,
  };
}
function resolveEntrance(args: {
  frame: number;
  fps: number;
  delay: number;
  entrance?: EntrancePreset;
  entranceDuration?: number;
  distance?: number;
  linkFrom?: VisualPose;
  ownPosition: Pose2D;
  ownScale: number;
}): {
  transform: string;
  opacity: number;
} {
  const {
    frame,
    fps,
    delay,
    entrance,
    entranceDuration,
    distance,
    linkFrom,
    ownPosition,
    ownScale,
  } = args;
  if (linkFrom) {
    const localFrame = frame - delay;
    const t = interpolate(localFrame, [0, LINK_BLEND_FRAMES], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: standardEasing,
    });
    const off = poseOffsetPx(linkFrom, ownPosition);
    const x = interpolate(t, [0, 1], [off.x, 0]);
    const y = interpolate(t, [0, 1], [off.y, 0]);
    const relativeScale = interpolate(
      t,
      [0, 1],
      [linkFrom.scale / ownScale, 1],
    );
    return {
      transform: `translate(${x}px, ${y}px) scale(${relativeScale})`,
      opacity: 1,
    };
  }
  const enterStyle = enter(entrance ?? "scaleIn", {
    frame,
    fps,
    delay,
    distance,
    durationInFrames: entranceDuration,
  });
  return {
    transform: enterStyle.transform ?? "",
    opacity: typeof enterStyle.opacity === "number" ? enterStyle.opacity : 1,
  };
}
function resolveExit(args: {
  frame: number;
  durationInFrames: number;
  exit?: ExitPreset;
  exitDuration?: number;
  distance?: number;
  linkTo?: VisualPose;
}): {
  transform: string;
  opacity: number;
} {
  const { frame, durationInFrames, exit, exitDuration, distance, linkTo } =
    args;
  if (linkTo) {
    return { transform: "", opacity: 1 };
  }
  const exitResult = computeExitStyle(exit, {
    frame,
    durationInFrames,
    exitDuration,
    distance,
  });
  return {
    transform: exitResult.transform ?? "",
    opacity: typeof exitResult.opacity === "number" ? exitResult.opacity : 1,
  };
}
export function AnimatedVisual({
  visual,
  entrance,
  entranceDelay = 0,
  entranceDuration,
  exit,
  exitDuration,
  exitAt,
  entranceDistance,
  exitDistance,
  kenBurns,
  kenBurnsSpeed,
  durationSeconds,
  style,
  ownScale = 1,
  ownPosition = { x: 50, y: 50 },
  linkFrom,
  linkTo,
  sfx,
  exitSfx,
  sfxAt,
  exitSfxAt,
  sfxStartFrom,
  sfxDuration,
  exitSfxStartFrom,
  exitSfxDuration,
  driftSeed,
}: AnimatedVisualProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sceneDurationInFrames = durationSeconds * fps;
  const durationInFrames = Math.min(
    sceneDurationInFrames,
    exitAt ?? sceneDurationInFrames,
  );
  const enterResult = resolveEntrance({
    frame,
    fps,
    delay: entranceDelay,
    entrance,
    entranceDuration,
    distance: entranceDistance,
    linkFrom,
    ownPosition,
    ownScale,
  });
  const exitResult = resolveExit({
    frame,
    durationInFrames,
    exit,
    exitDuration,
    distance: exitDistance,
    linkTo,
  });
  const kenBurnsStyle = computeKenBurns(kenBurns, {
    frame,
    durationInFrames,
    seed: driftSeed,
    speed: kenBurnsSpeed,
  });
  const transform =
    `${enterResult.transform} ${kenBurnsStyle.transform ?? ""} ${exitResult.transform} scale(${ownScale})`.trim();
  const sfxSrc = sfx ? getSfx(sfx)?.src : undefined;
  const exitSfxSrc = exit && exitSfx ? getSfx(exitSfx)?.src : undefined;
  const entranceSfxFrame = Math.max(0, sfxAt ?? entranceDelay);
  const exitFrame = Math.max(
    0,
    exitSfxAt ?? durationInFrames - (exitDuration ?? 18),
  );
  const entranceAudioDuration = Math.min(
    sfxDuration ?? CUE_WINDOW_FRAMES,
    Math.max(1, sceneDurationInFrames - entranceSfxFrame),
  );
  const exitAudioDuration = Math.min(
    exitSfxDuration ?? CUE_WINDOW_FRAMES,
    Math.max(1, sceneDurationInFrames - exitFrame),
  );
  return (
    <div
      style={{
        ...style,
        opacity: enterResult.opacity * exitResult.opacity,
        transform: transform || undefined,
      }}
    >
      <VisualRenderer visual={visual} />
      {sfxSrc ? (
        <Sequence
          from={entranceSfxFrame}
          durationInFrames={entranceAudioDuration}
          layout="none"
        >
          <Audio
            src={sfxSrc}
            volume={SFX_VOLUME}
            startFrom={sfxStartFrom ?? 0}
            endAt={(sfxStartFrom ?? 0) + entranceAudioDuration}
          />
        </Sequence>
      ) : null}
      {exitSfxSrc ? (
        <Sequence
          from={exitFrame}
          durationInFrames={exitAudioDuration}
          layout="none"
        >
          <Audio
            src={exitSfxSrc}
            volume={SFX_VOLUME}
            startFrom={exitSfxStartFrom ?? 0}
            endAt={(exitSfxStartFrom ?? 0) + exitAudioDuration}
          />
        </Sequence>
      ) : null}
    </div>
  );
}
