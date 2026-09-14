import type { VideoProject } from "../../schema/project";
import {
  projectDurationInFrames,
  type SceneTiming,
} from "../../utils/duration";

export function sceneTimelineEnd(project: VideoProject, timing: SceneTiming) {
  const { scene, from, durationInFrames } = timing;
  let end = Math.max(
    durationInFrames * 2,
    projectDurationInFrames(project) - from,
    scene.motion?.exitAt ?? durationInFrames,
  );
  const objects = [
    ...(scene.content.richHeadline ?? []),
    ...(scene.content.blocks ?? []),
    ...(scene.content.items ?? []),
    ...(scene.content.visuals ?? []),
  ];
  for (const object of objects) {
    end = Math.max(end, object.exitAt ?? durationInFrames);
  }
  for (const entry of scene.content.visuals ?? []) {
    if (entry.visual.type !== "checklist") continue;
    for (const item of entry.visual.items) {
      end = Math.max(end, item.exitAt ?? entry.exitAt ?? durationInFrames);
    }
  }
  return end;
}
