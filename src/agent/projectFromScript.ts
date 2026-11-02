import type { VideoProject } from "../schema/project";
import type { Scene, ScenePlanRole, SceneType } from "../schema/scene";
import type { AgentRun } from "./run/run";

// After "Approve": the script becomes the open project's scenes, so it shows
// in Storyboard and can be edited by hand. Only words for now – what each
// scene is for, what is said, written and shown; 4 Building adds the layout.

// Which TikMaker scene draws the role until 4 Building picks a layout.
function sceneTypeFor(role: ScenePlanRole): SceneType {
  if (role === "hook") return "hook-centered";
  if (role === "cta") return "takeaway";
  return "visual-explainer";
}

export function projectFromScript(
  project: VideoProject,
  run: AgentRun,
): VideoProject {
  if (!run.script) return project;
  const scenes = run.script.scenes.map(
    (scene, index): Scene => ({
      id: `scene-${run.id}-${index + 1}`,
      type: sceneTypeFor(scene.role),
      plan: { role: scene.role, visualBrief: scene.visual },
      vo: scene.voiceover,
      notes: scene.needsRecording ? "🎥 Your own recording" : undefined,
      background: "solid-dark",
      content: { headline: scene.onScreen },
    }),
  );
  return {
    ...project,
    workspaceId: run.input.workspaceId,
    videoTemplateId: run.template?.videoTemplateId,
    storyPlan: { ...project.storyPlan, premise: run.input.idea },
    scenes,
  };
}
