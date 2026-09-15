import type { VideoProject } from "../schema/project";
import type { RichHeadlineLine, Scene } from "../schema/scene";
export function sceneOnScreenText(scene: Scene): string {
  return (scene.content.richHeadline ?? [])
    .map((line) => line.text)
    .join("\n");
}
export function withOnScreenText(scene: Scene, value: string): Scene {
  const existing = scene.content.richHeadline ?? [];
  // Nauja eilutė paveldi paskutinės stilių, todėl teksto redagavimas
  // paprastame lauke nesunaikina eilučių apipavidalinimo.
  const fallback: RichHeadlineLine = existing[existing.length - 1] ?? {
    text: "",
    size: "headline",
  };
  const richHeadline = value
    .split("\n")
    .map((text, index) => ({ ...(existing[index] ?? fallback), text }));
  return { ...scene, content: { ...scene.content, richHeadline } };
}
export function projectPlanJson(project: VideoProject): string {
  return JSON.stringify(
    {
      format: "tikmaker-story-plan-v1",
      project: {
        title: project.title,
        targetDuration: project.storyPlan?.targetDuration,
        premise: project.storyPlan?.premise,
        audience: project.storyPlan?.audience,
      },
      instructions:
        "Review the whole flow. Fill missing voiceover, on-screen text, visual brief, or missing scenes. Keep suggestions concise and return the same JSON shape.",
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
    },
    null,
    2,
  );
}
