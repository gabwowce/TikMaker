import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { getSfx } from "../../registries/sfxRegistry";
import type { HoistedLinkGroup, VisualPose } from "../../utils/visualLinks";
import { standardEasing } from "../motion/easing";
import { enter } from "../motion/entrances";
import { exitStyle as computeExitStyle } from "../motion/exits";
import { kenBurns as computeKenBurns } from "../motion/kenBurns";
import { SFX_VOLUME, resolveEntranceSfx } from "../motion/sfxDefaults";
import { VisualRenderer } from "../visuals/VisualRenderer";
const GLIDE_FRAMES = 18;
const CUE_WINDOW_FRAMES = 30;
function lerpPose(from: VisualPose, to: VisualPose, t: number): VisualPose {
  return {
    x: interpolate(t, [0, 1], [from.x, to.x]),
    y: interpolate(t, [0, 1], [from.y, to.y]),
    scale: interpolate(t, [0, 1], [from.scale, to.scale]),
  };
}
function poseAt(group: HoistedLinkGroup, frame: number): VisualPose {
  let pose = group.keyframes[0].pose;
  for (let i = 1; i < group.keyframes.length; i += 1) {
    const key = group.keyframes[i];
    const start = key.at - (key.lead ?? 0);
    const t = interpolate(
      frame,
      [start, start + (key.duration ?? GLIDE_FRAMES)],
      [0, 1],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: standardEasing,
      },
    );
    pose = lerpPose(pose, key.pose, t);
  }
  return pose;
}
type LinkedVisualProps = {
  group: HoistedLinkGroup;
};
export function LinkedVisual({ group }: LinkedVisualProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { durationInFrames, motion, visual } = group;
  const pose = poseAt(group, frame);
  const entranceStyle = enter(motion.entrance ?? "fade", {
    frame,
    fps,
    distance: motion.entranceDistance,
  });
  const exitResult = computeExitStyle(motion.exit, {
    frame,
    durationInFrames,
    exitDuration: motion.exitDuration,
    distance: motion.exitDistance,
  });
  const drift = computeKenBurns(motion.kenBurns, {
    frame,
    durationInFrames,
    speed: motion.kenBurnsSpeed,
  });
  const opacity =
    (typeof entranceStyle.opacity === "number" ? entranceStyle.opacity : 1) *
    (typeof exitResult.opacity === "number" ? exitResult.opacity : 1);
  const sfxSrc = (() => {
    const id = resolveEntranceSfx({
      override: motion.sfx,
      entrance: motion.entrance,
      kind: "visual",
    });
    return id ? getSfx(id)?.src : undefined;
  })();
  return (
    <AbsoluteFill className="pointer-events-none">
      <div
        className={`absolute`}
        style={{
          left: `${pose.x}%`,
          top: `${pose.y}%`,
          opacity,
          transform: [
            "translate(-50%, -50%)",
            entranceStyle.transform ?? "",
            drift.transform ?? "",
            exitResult.transform ?? "",
            `scale(${pose.scale})`,
          ]
            .filter(Boolean)
            .join(" "),
        }}
      >
        <VisualRenderer visual={visual} />
      </div>
      {sfxSrc ? (
        <Sequence
          from={0}
          durationInFrames={Math.min(CUE_WINDOW_FRAMES, durationInFrames)}
          layout="none"
        >
          <Audio src={sfxSrc} volume={SFX_VOLUME} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
}
