import type { Scene } from "../../schema/scene";
import { computeSceneTimings, projectDurationInFrames } from "../../utils/duration";
import type { RuleCheck } from "./types";

// Something new on screen: a scene starting, a layer or text block arriving or
// leaving, a layer reaching a keyframe. Ken Burns drift is not a change: it is
// meant to be barely noticed.
function changeFrames(scene: Scene, from: number, length: number): number[] {
  const content = scene.content;
  const layers = content.visuals ?? [];
  // Frames are scene-relative (the same clock as delay and exitAt).
  return [
    0,
    ...layers.flatMap((layer) => [
      layer.delay,
      layer.exitAt,
      ...(layer.keyframes ?? []).map((keyframe) => keyframe.frame),
    ]),
    ...(content.blocks ?? []).flatMap((block) => [block.delay, block.exitAt]),
    ...(content.items ?? []).flatMap((item) => [item.delay, item.exitAt]),
  ]
    .filter((frame): frame is number => frame !== undefined && frame <= length)
    .map((frame) => from + frame);
}

// A recording or a video background changes all the time on its own.
function playsVideo(scene: Scene): boolean {
  const background = scene.background;
  const videoBackground =
    typeof background === "object" && background.fill.kind === "video";
  return videoBackground || (scene.content.visuals ?? []).some((l) => l.visual.type === "recording");
}

// The longest stretch with nothing new on screen, per gap over the limit.
export const secondsWithoutChange: RuleCheck = (project, rule) => {
  const timings = computeSceneTimings(project);
  const end = projectDurationInFrames(project);
  const moving = timings.filter(({ scene }) => playsVideo(scene));
  const frames = [
    ...timings.flatMap(({ scene, from, durationInFrames }) =>
      changeFrames(scene, from, durationInFrames),
    ),
    end,
  ]
    .filter((frame) => frame <= end)
    .sort((a, b) => a - b);

  const violations = [];
  for (let i = 1; i < frames.length; i++) {
    const start = frames[i - 1];
    const seconds = (frames[i] - start) / project.fps;
    if (rule.max === undefined || seconds <= rule.max) continue;
    const covered = moving.some(
      ({ from, durationInFrames }) => start >= from && frames[i] <= from + durationInFrames,
    );
    if (covered) continue;
    const timing = timings.find(
      ({ from, durationInFrames }) => start >= from && start < from + durationInFrames,
    );
    const index = timing ? timings.indexOf(timing) + 1 : undefined;
    violations.push({
      ruleId: rule.id,
      sceneId: timing?.scene.id,
      level: rule.level,
      message: `Scene ${index}: nothing changes on screen for ${seconds.toFixed(1)} s, the limit is ${rule.max} s. Add a visual or split the scene.`,
    });
  }
  return violations;
};
