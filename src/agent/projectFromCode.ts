import type { VideoProject } from "../schema/project";
import type { Scene } from "../schema/scene";
import { withAgentVoice } from "./agentVoice";
import { withSoundCues } from "./soundCues";
import type { AgentRun } from "./run/run";

// The agent's pictures (run.code) become the project's scenes: every scene a
// code scene pointing at its file, on the stage backdrop, with the kinetic
// captions (the key words bold) and the agent's voice under it.
//
// `only`: rebuild just the scene with that number (the agent rewrote it);
// every other scene stays exactly as it is in the project. The fields the
// creator filled (scene.code.params) stay as long as the file is the same.
export function projectFromCode(
  project: VideoProject,
  run: AgentRun,
  only?: number,
): VideoProject {
  if (!run.code || !run.script) return project;
  const ids = run.script.scenes.map((_, n) => `scene-${run.id}-${n + 1}`);
  const scenes = project.scenes.map((scene): Scene => {
    const n = ids.indexOf(scene.id);
    if (n === -1 || (only !== undefined && n !== only)) return scene;
    const code = run.code?.scenes[n];
    if (!code) return scene;
    const params =
      scene.code?.file === code.file ? scene.code.params : undefined;
    return {
      ...scene,
      type: "code",
      vo: run.script?.scenes[n]?.voiceover ?? scene.vo,
      stage: code.stage ?? "top",
      background: "stage",
      layout: undefined,
      // a rebuilt scene keeps the layers the creator put on top of it
      content: scene.type === "code" ? scene.content : {},
      // the first scene has nothing to come in from
      motion: { transition: n > 0 ? (code.transition ?? "cut") : "cut", entrance: "none" },
      code: { file: code.file, ...(params ? { params } : {}) },
      plan: scene.plan
        ? { ...scene.plan, visualBrief: code.description }
        : scene.plan,
    };
  });
  // the voice first: it sets how long the scenes are, and the sounds sit on
  // its words
  const voiced = withAgentVoice(
    {
      ...project,
      scenes,
      captions: {
        ...project.captions,
        style: "kinetic",
        keywords: run.code.keywords,
      },
    },
    run,
  );
  return withSoundCues(voiced, run, only);
}
