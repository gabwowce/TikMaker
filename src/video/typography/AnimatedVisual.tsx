import React from "react";
import { Audio, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { enter } from "../motion/entrances";
import { exitStyle as computeExitStyle } from "../motion/exits";
import { kenBurns as computeKenBurns } from "../motion/kenBurns";
import { standardEasing } from "../motion/easing";
import { VisualRenderer } from "../visuals/VisualRenderer";
import { getSfx } from "../../registries/sfxRegistry";
import { SFX_VOLUME } from "../motion/sfxDefaults";
import type { VisualConfig } from "../../schema/visual";
import type { EntrancePreset, ExitPreset, KenBurnsPreset } from "../../schema/scene";
import type { VisualPose } from "../../utils/visualLinks";

type AnimatedVisualProps = {
  visual: VisualConfig;
  entrance?: EntrancePreset;
  entranceDelay?: number;
  /** How long the entrance takes, in frames — mirror of `exitDuration`. Unset
   * = the preset's natural pace. Ignored while a link glide is active, which
   * runs on `LINK_BLEND_FRAMES` instead. */
  entranceDuration?: number;
  exit?: ExitPreset;
  exitDuration?: number;
  /** Absolute scene frame at which the exit completes. */
  exitAt?: number;
  /** Travel distance (px) for a slide/zoomSettle entrance or exit — see
   * `enter`/`exitStyle` in `motion/`. Ignored while a link glide is active. */
  entranceDistance?: number;
  exitDistance?: number;
  /** Continuous slow zoom/pan for the whole time this visual is visible —
   * layered on top of, not instead of, `entrance`/`exit`. */
  kenBurns?: KenBurnsPreset;
  /** Rate multiplier for a cyclic `kenBurns` preset (`float`/`rotateCW`/
   * `rotateCCW`) — see `motion/kenBurns.ts`. No effect on the others. */
  kenBurnsSpeed?: number;
  durationSeconds: number;
  style?: React.CSSProperties;
  /** Resting scale multiplier for THIS scene (1 = natural size) — layered on
   * top of whatever the entrance/exit/link math produces, so one asset can be
   * authored "big here, small there" without a size-specific preset. */
  ownScale?: number;
  /** This scene's own `visualPosition` (percent of canvas). Only meaningful
   * when `linkFrom`/`linkTo` is set — it's the anchor the glide measures
   * distance from. */
  ownPosition?: { x: number; y: number };
  /** When set, REPLACES the normal entrance: the visual glides in from this
   * pose (the previous linked scene's position/scale) to its own resting pose
   * instead of flying in from off-screen. See `src/utils/visualLinks.ts`. */
  linkFrom?: VisualPose;
  /** Set when the NEXT scene picks this visual up (same `visualLink.groupId`).
   * It suppresses this scene's exit entirely — the visual simply holds its pose
   * until the cut, and the whole move is played by the next scene's glide-in.
   * See `resolveExit` for why the outgoing side must not animate. */
  linkTo?: VisualPose;
  /** Sound effect id (see `sfxRegistry`) already resolved by the caller — this
   * component just plays whatever it's given, at its own entrance/exit frame.
   * Callers decide auto-default vs explicit vs silent (see `sfxDefaults.ts`). */
  sfx?: string;
  exitSfx?: string;
  sfxAt?: number;
  exitSfxAt?: number;
  sfxStartFrom?: number;
  sfxDuration?: number;
  exitSfxStartFrom?: number;
  exitSfxDuration?: number;
  /** Phase offset for the cyclic "float" Ken Burns preset, so two visuals using
   * it don't drift in perfect unison. Ignored by the other presets. */
  driftSeed?: number;
};

const CUE_WINDOW_FRAMES = 30;
/** Frames the linked glide takes at the START of the scene the visual lands in.
 * The whole move happens here (the outgoing scene just holds its pose — see
 * `resolveExit`), so this is long enough to read as a deliberate travel rather
 * than a snap, and short enough that the scene's own content isn't left waiting. */
const LINK_BLEND_FRAMES = 18;

type Pose2D = { x: number; y: number };

function poseOffsetPx(pose: VisualPose, own: Pose2D): Pose2D {
  return {
    x: ((pose.x - own.x) / 100) * 1080,
    y: ((pose.y - own.y) / 100) * 1920,
  };
}

/** Entrance: normal preset curve, or — when `linkFrom` is set — a glide in
 * from the previous linked scene's pose to this scene's resting pose. Returns
 * a relative transform (composed with `ownScale` by the caller) and opacity. */
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
}): { transform: string; opacity: number } {
  const { frame, fps, delay, entrance, entranceDuration, distance, linkFrom, ownPosition, ownScale } = args;

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
    const relativeScale = interpolate(t, [0, 1], [linkFrom.scale / ownScale, 1]);
    // No opacity fade here on purpose — a linked visual should read as ONE
    // element gliding to its new pose, not fading in partway through the move.
    return { transform: `translate(${x}px, ${y}px) scale(${relativeScale})`, opacity: 1 };
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

/** Exit: normal preset curve, or — when `linkTo` is set — a glide from this
 * scene's resting pose toward the next linked scene's pose. */
function resolveExit(args: {
  frame: number;
  durationInFrames: number;
  exit?: ExitPreset;
  exitDuration?: number;
  distance?: number;
  linkTo?: VisualPose;
}): { transform: string; opacity: number } {
  const { frame, durationInFrames, exit, exitDuration, distance, linkTo } = args;

  if (linkTo) {
    // Deliberately NO animation on the outgoing side. Playing the move here
    // too meant the viewer saw it twice — once as this scene glided toward the
    // next pose, then again as the next scene glided in from the old one — and
    // with a slide transition the two copies travelled in opposite directions
    // as their frames pushed past each other. The move belongs to ONE scene:
    // the one the visual ends up in.
    return { transform: "", opacity: 1 };
  }

  const exitResult = computeExitStyle(exit, { frame, durationInFrames, exitDuration, distance });
  return {
    transform: exitResult.transform ?? "",
    opacity: typeof exitResult.opacity === "number" ? exitResult.opacity : 1,
  };
}

/** Wraps a scene's visual with its OWN in/out animation, independent of the
 * rest of the scene's `motion.entrance`/`motion.exit` — every visual gets an
 * explicit, individually configurable entrance and exit. When `linkFrom`/
 * `linkTo` are set (via `scene.visualLink`, resolved in `SceneRenderer`), the
 * normal entrance/exit presets are bypassed in favor of a direct glide
 * between this scene's pose and the adjacent linked scene's pose — see
 * `resolveEntrance`/`resolveExit` above. */
export const AnimatedVisual: React.FC<AnimatedVisualProps> = ({
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
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sceneDurationInFrames = durationSeconds * fps;
  const durationInFrames = Math.min(sceneDurationInFrames, exitAt ?? sceneDurationInFrames);

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
  const kenBurnsStyle = computeKenBurns(kenBurns, { frame, durationInFrames, seed: driftSeed, speed: kenBurnsSpeed });

  const transform =
    `${enterResult.transform} ${kenBurnsStyle.transform ?? ""} ${exitResult.transform} scale(${ownScale})`.trim();

  const sfxSrc = sfx ? getSfx(sfx)?.src : undefined;
  const exitSfxSrc = exit && exitSfx ? getSfx(exitSfx)?.src : undefined;
  const entranceSfxFrame = Math.max(0, sfxAt ?? entranceDelay);
  const exitFrame = Math.max(0, exitSfxAt ?? (durationInFrames - (exitDuration ?? 18)));
  const entranceAudioDuration = Math.min(sfxDuration ?? CUE_WINDOW_FRAMES, Math.max(1, sceneDurationInFrames - entranceSfxFrame));
  const exitAudioDuration = Math.min(exitSfxDuration ?? CUE_WINDOW_FRAMES, Math.max(1, sceneDurationInFrames - exitFrame));

  return (
    <div style={{ ...style, opacity: enterResult.opacity * exitResult.opacity, transform: transform || undefined }}>
      <VisualRenderer visual={visual} />
      {sfxSrc ? (
        <Sequence
          from={entranceSfxFrame}
          durationInFrames={entranceAudioDuration}
          layout="none"
        >
          <Audio src={sfxSrc} volume={SFX_VOLUME} startFrom={sfxStartFrom ?? 0} endAt={(sfxStartFrom ?? 0) + entranceAudioDuration} />
        </Sequence>
      ) : null}
      {exitSfxSrc ? (
        <Sequence
          from={exitFrame}
          durationInFrames={exitAudioDuration}
          layout="none"
        >
          <Audio src={exitSfxSrc} volume={SFX_VOLUME} startFrom={exitSfxStartFrom ?? 0} endAt={(exitSfxStartFrom ?? 0) + exitAudioDuration} />
        </Sequence>
      ) : null}
    </div>
  );
};
