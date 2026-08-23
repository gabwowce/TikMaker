import type { VideoProject } from "../schema/project";

export function projectDurationInFrames(project: VideoProject): number {
  const totalSeconds = project.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);
  return Math.max(1, Math.round(totalSeconds * project.fps));
}
