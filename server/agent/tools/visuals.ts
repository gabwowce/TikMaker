import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { VideoProject } from "../../../src/schema/project.js";
import { computeSceneTimings } from "../../../src/utils/duration.js";
import { KNOWLEDGE_DIR, ROOT } from "../../config.js";
import type { SavedVisualBrief } from "../prompts/writeCode.js";

// "Mano vizualai" (docs/tikmaker-kryptis.md, "Pakartotinis naudojimas"): a
// code scene the creator liked, saved for the channel – its code, a frame of
// it and what it shows – in knowledge/workspaces/<id>/visuals/<visual>/:
//   visual.json   id, title, description, where it came from, the fields
//   scene.tsx     the scene's code (and shared.tsx when it uses one)
//   frame.png     how it looks
// The agent sees the list when it writes pictures (prompts/writeCode.ts) and
// may reuse one – by itself where it fits, or when the creator asks ("use the
// fuel gauge from last video").

export const savedVisual = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string(),
  savedAt: z.number(),
  from: z.object({ projectId: z.string(), file: z.string() }),
  // the fields as the creator had filled them
  params: z.record(z.unknown()).optional(),
  hasFrame: z.boolean(),
});
export type SavedVisual = z.infer<typeof savedVisual>;

const visualsDir = (workspaceId: string) =>
  path.join(KNOWLEDGE_DIR, "workspaces", safe(workspaceId), "visuals");
const safe = (id: string) => id.replace(/[^\w-]/g, "-");

export function listVisuals(workspaceId: string): SavedVisual[] {
  const dir = visualsDir(workspaceId);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .flatMap((id) => {
      const file = path.join(dir, id, "visual.json");
      if (!fs.existsSync(file)) return [];
      const parsed = savedVisual.safeParse(JSON.parse(fs.readFileSync(file, "utf-8")));
      return parsed.success ? [parsed.data] : [];
    })
    .sort((a, b) => b.savedAt - a.savedAt);
}

export function visualFramePath(workspaceId: string, id: string): string {
  return path.join(visualsDir(workspaceId), safe(id), "frame.png");
}

// Saves a code scene of `project` as a visual of the channel. `renderFrame`
// makes its PNG (Remotion; the tests pass a fake). Returns the saved visual.
export async function saveVisual(
  input: {
    workspaceId: string;
    project: VideoProject;
    sceneId: string;
    title: string;
    description?: string;
  },
  renderFrame: (project: VideoProject, frame: number, file: string) => Promise<void>,
): Promise<SavedVisual> {
  const timing = computeSceneTimings(input.project).find(
    (t) => t.scene.id === input.sceneId,
  );
  const code = timing?.scene.code;
  if (!timing || timing.scene.type !== "code" || !code)
    throw new Error("Only a code scene can be saved as a visual");
  const source = path.join(ROOT, "src", "generated", code.file);
  if (!fs.existsSync(source)) throw new Error(`${code.file} is not there`);
  const text = fs.readFileSync(source, "utf-8");
  const id = `${slug(input.title)}-${Date.now().toString(36)}`;
  const dir = path.join(visualsDir(input.workspaceId), id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "scene.tsx"), text);
  // the shared helpers it imports go with it
  const shared = path.join(path.dirname(source), "shared.tsx");
  if (/from\s+["']\.\/shared["']/.test(text) && fs.existsSync(shared))
    fs.copyFileSync(shared, path.join(dir, "shared.tsx"));
  let hasFrame = false;
  try {
    // at its fullest: near the end of the scene
    const frame = timing.from + Math.max(0, timing.durationInFrames - 20);
    await renderFrame(input.project, frame, path.join(dir, "frame.png"));
    hasFrame = fs.existsSync(path.join(dir, "frame.png"));
  } catch {
    // saved without a frame – the code is what matters
  }
  const visual: SavedVisual = {
    id,
    title: input.title.trim(),
    description:
      input.description?.trim() ||
      /export const description\s*=\s*"([^"]*)"/.exec(text)?.[1] ||
      timing.scene.plan?.visualBrief ||
      "",
    savedAt: Date.now(),
    from: { projectId: input.project.id, file: code.file },
    ...(code.params ? { params: code.params } : {}),
    hasFrame,
  };
  fs.writeFileSync(path.join(dir, "visual.json"), JSON.stringify(visual, null, 2) + "\n");
  return visual;
}

export function deleteVisual(workspaceId: string, id: string): void {
  fs.rmSync(path.join(visualsDir(workspaceId), safe(id)), { recursive: true, force: true });
}

// The list as the code step gets it: paths relative to the project's folder,
// so Claude Code's Read opens them.
export function savedVisualsBrief(workspaceId: string): SavedVisualBrief[] {
  return listVisuals(workspaceId).map((visual) => {
    const dir = path.relative(ROOT, path.join(visualsDir(workspaceId), visual.id));
    const rel = (file: string) => path.join(dir, file).replace(/\\/g, "/");
    return {
      id: visual.id,
      title: visual.title,
      description: visual.description,
      file: rel("scene.tsx"),
      ...(visual.hasFrame ? { frame: rel("frame.png") } : {}),
    };
  });
}

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "visual";
