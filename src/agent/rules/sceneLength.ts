import { computeSceneTimings } from "../../utils/duration";
import type { RuleCheck } from "./types";

// Seconds each scene is on screen, the same timing the video renders with.
export const sceneSeconds: RuleCheck = (project, rule) =>
  computeSceneTimings(project).flatMap(({ scene, durationSeconds }, index) => {
    if (rule.max === undefined || durationSeconds <= rule.max) return [];
    return [
      {
        ruleId: rule.id,
        sceneId: scene.id,
        level: rule.level,
        message: `Scene ${index + 1}: ${durationSeconds.toFixed(1)} s, the limit is ${rule.max} s.`,
      },
    ];
  });

// The hook is the scene planned as "hook"; without plans, the first scene.
export const hookSeconds: RuleCheck = (project, rule) => {
  const timings = computeSceneTimings(project);
  const planned = timings.filter(({ scene }) => scene.plan?.role === "hook");
  const hooks = planned.length ? planned : timings.slice(0, 1);
  return hooks.flatMap(({ scene, durationSeconds }) => {
    if (rule.max === undefined || durationSeconds <= rule.max) return [];
    return [
      {
        ruleId: rule.id,
        sceneId: scene.id,
        level: rule.level,
        message: `The hook is ${durationSeconds.toFixed(1)} s, the limit is ${rule.max} s.`,
      },
    ];
  });
};
