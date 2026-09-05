import type { VideoProject } from "../schema/project";
import type { RichHeadlineLine, Scene } from "../schema/scene";

export function sceneOnScreenText(scene: Scene): string {
  if (scene.content.richHeadline?.length) return scene.content.richHeadline.map((line) => line.text).join("\n");
  return scene.content.headline ?? "";
}

/** Write the visible text itself, preserving style/motion by position. New
 * lines inherit the nearest existing line; removed lines disappear. */
export function withOnScreenText(scene: Scene, value: string): Scene {
  const lines = value.split("\n");
  const existing = scene.content.richHeadline;
  if (existing?.length) {
    const fallback: RichHeadlineLine = existing[existing.length - 1];
    // Keep one empty styled line while the user clears/retypes the field. If
    // clearing produced `[]`, the very next keystroke would fall back to the
    // legacy headline field and silently lose all typography/motion settings.
    const richHeadline = lines.map((text, index) => ({ ...(existing[index] ?? fallback), text }));
    return { ...scene, content: { ...scene.content, headline: undefined, richHeadline } };
  }
  return { ...scene, content: { ...scene.content, headline: value || undefined } };
}

/** Compact, implementation-free context meant to be pasted into any chat AI.
 * It contains what each moment must do, not keyframes and pixel positions. */
export function projectPlanJson(project: VideoProject): string {
  return JSON.stringify({
    format: "tikmaker-story-plan-v1",
    project: {
      title: project.title,
      targetDuration: project.storyPlan?.targetDuration,
      premise: project.storyPlan?.premise,
      audience: project.storyPlan?.audience,
    },
    instructions: "Review the whole flow. Fill missing voiceover, on-screen text, visual brief, or missing scenes. Keep suggestions concise and return the same JSON shape.",
    scenes: project.scenes.map((scene, index) => ({
      position: index + 1,
      id: scene.id,
      role: scene.plan?.role,
      purpose: scene.plan?.purpose,
      voiceover: scene.vo,
      onScreenText: sceneOnScreenText(scene),
      visualBrief: scene.plan?.visualBrief,
      notes: scene.notes,
      durationSeconds: scene.durationSeconds,
      hasVisual: Boolean(scene.content.visuals?.length),
    })),
  }, null, 2);
}
