import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { enter } from "../motion/entrances";
import { exitStyle as computeExitStyle } from "../motion/exits";
import { kenBurns as computeKenBurns } from "../motion/kenBurns";
import { standardEasing } from "../motion/easing";
import { VisualRenderer } from "../visuals/VisualRenderer";
import { getSfx } from "../../registries/sfxRegistry";
import { SFX_VOLUME, resolveEntranceSfx } from "../motion/sfxDefaults";
import type { HoistedLinkGroup, VisualPose } from "../../utils/visualLinks";

/** Frames one pose-to-pose move takes, starting at the cut it belongs to. */
const GLIDE_FRAMES = 18;
const CUE_WINDOW_FRAMES = 30;

function lerpPose(from: VisualPose, to: VisualPose, t: number): VisualPose {
  return {
    x: interpolate(t, [0, 1], [from.x, to.x]),
    y: interpolate(t, [0, 1], [from.y, to.y]),
    scale: interpolate(t, [0, 1], [from.scale, to.scale]),
  };
}

/** Walks the chain's keyframes and blends toward each one as its cut arrives.
 * Keyframes later than the current frame contribute nothing (their `t` is 0),
 * so a single accumulating pass handles a chain of any length. */
function poseAt(group: HoistedLinkGroup, frame: number): VisualPose {
  let pose = group.keyframes[0].pose;
  for (let i = 1; i < group.keyframes.length; i += 1) {
    const key = group.keyframes[i];
    const t = interpolate(frame, [key.at, key.at + GLIDE_FRAMES], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: standardEasing,
    });
    pose = lerpPose(pose, key.pose, t);
  }
  return pose;
}

/**
 * ONE mounted element for a whole link chain (see
 * `resolveHoistedLinkGroups`) — a scene's primary visual or a freeform layer,
 * they carry the same way. Because it lives in a single `<Sequence>` spanning
 * every scene in the chain, the asset is never remounted at a cut: a
 * `recording` keeps playing straight through, nothing flashes, and the pose
 * simply animates to whatever each scene declares. The chain's first member
 * supplies the entrance and drift, the last supplies the exit; everything in
 * between is pure position/scale interpolation with no opacity change.
 */
export const LinkedVisual: React.FC<{ group: HoistedLinkGroup }> = ({ group }) => {
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
  const drift = computeKenBurns(motion.kenBurns, { frame, durationInFrames, speed: motion.kenBurnsSpeed });

  const opacity =
    (typeof entranceStyle.opacity === "number" ? entranceStyle.opacity : 1) *
    (typeof exitResult.opacity === "number" ? exitResult.opacity : 1);

  const sfxSrc = (() => {
    const id = resolveEntranceSfx({ override: motion.sfx, entrance: motion.entrance, kind: "visual" });
    return id ? getSfx(id)?.src : undefined;
  })();

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
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
        <Sequence from={0} durationInFrames={Math.min(CUE_WINDOW_FRAMES, durationInFrames)} layout="none">
          <Audio src={sfxSrc} volume={SFX_VOLUME} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
