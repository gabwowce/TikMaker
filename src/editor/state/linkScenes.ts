import type { VideoProject } from "../../schema/project";

export function linkVisualToNextScene(
  project: VideoProject,
  id: string,
): VideoProject {
  const index = project.scenes.findIndex((s) => s.id === id);
  const scene = project.scenes[index];
  const next = project.scenes[index + 1];
  if (!scene?.visual || !next) return project;
  const groupId = scene.visualLink?.groupId ?? `${scene.id}-glide`;
  const fromPosition = scene.visualPosition ?? { x: 50, y: 55 };
  const fromScale = scene.visualScale ?? 1;
  const toPosition = { x: 50, y: fromPosition.y > 40 ? 20 : 80 };
  const toScale = Math.max(0.2, Number((fromScale * 0.5).toFixed(2)));
  const scenes = [...project.scenes];
  scenes[index] = {
    ...scene,
    visualPosition: fromPosition,
    visualScale: fromScale,
    visualLink: { groupId },
    visualExit: undefined,
    visualExitDuration: undefined,
    visualExitDistance: undefined,
  };
  scenes[index + 1] = {
    ...next,
    visual: scene.visual,
    visualPosition: toPosition,
    visualScale: toScale,
    visualLink: { groupId },
    visualEntrance: undefined,
    visualEntranceDistance: undefined,
    motion: {
      ...next.motion,
      transition: "cut",
    },
  };
  return { ...project, scenes };
}

export function linkLayerToNextScene(
  project: VideoProject,
  sceneId: string,
  entryId: string,
): VideoProject {
  const index = project.scenes.findIndex((s) => s.id === sceneId);
  const scene = project.scenes[index];
  const next = project.scenes[index + 1];
  const entry = scene?.content.visuals?.find((v) => v.id === entryId);
  if (!scene || !next || !entry) return project;
  const groupId = entry.link?.groupId ?? `${scene.id}-${entry.id}-glide`;
  const toScale = Math.max(0.2, Number(((entry.scale ?? 1) * 0.6).toFixed(2)));
  const otherLayers = (next.content.visuals ?? []).filter(
    (v) => v.link?.groupId !== groupId,
  );
  if (otherLayers.length >= 6) return project;
  const linkedEntry = {
    ...entry,
    link: { groupId },
    exit: undefined,
    exitDuration: undefined,
    exitDistance: undefined,
    exitSfx: undefined,
  };
  const nextEntry = {
    ...linkedEntry,
    id: `${entry.id}-${next.id}`,
    y: entry.y > 50 ? 20 : 80,
    scale: toScale,
    entrance: undefined,
  };
  const scenes = [...project.scenes];
  scenes[index] = {
    ...scene,
    content: {
      ...scene.content,
      visuals: scene.content.visuals?.map((v) =>
        v.id === entry.id ? linkedEntry : v,
      ),
    },
  };
  scenes[index + 1] = {
    ...next,
    content: {
      ...next.content,
      visuals: [...otherLayers, nextEntry],
    },
    motion: { ...next.motion, transition: "cut" },
  };
  return { ...project, scenes };
}
