import { videoProjectSchema, type VideoProject } from "../schema/project";
import type {
  PositionedVisualEntry,
  RichHeadlineLine,
  Scene,
  ScenePlanRole,
} from "../schema/scene";
import { autoScale, layoutPresets } from "../video/layout/layoutPresets";
import { naturalVisualSize } from "../video/layout/visualMetrics";
import { colors } from "../video/typography/tokens";
import { withOnScreenText } from "./projectStoryPlan";
export function planRoleFor(type: Scene["type"]): ScenePlanRole {
  if (type === "screen-demo") return "demo";
  if (type === "takeaway") return "payoff";
  if (type === "hook-centered") return "hook";
  if (type === "hook-visual") return "reveal";
  return "benefit";
}
const CORNER_SLOTS = {
  tl: { x: (150 / 1080) * 100, y: (340 / 1920) * 100 },
  tr: { x: ((1080 - 150) / 1080) * 100, y: (340 / 1920) * 100 },
  bl: { x: (150 / 1080) * 100, y: ((1920 - 380) / 1920) * 100 },
  br: { x: ((1080 - 150) / 1080) * 100, y: ((1920 - 380) / 1920) * 100 },
} as const;
const CORNER_PAIRS = { tlbr: ["tl", "br"], trbl: ["tr", "bl"] } as const;
export function splitCornerProps(
  entry: PositionedVisualEntry,
): PositionedVisualEntry[] {
  const visual = entry.visual;
  if (visual.type !== "corner-props") return [entry];
  const size = visual.size ?? 480;
  const assets =
    visual.assets.length === 1
      ? [visual.assets[0], visual.assets[0]]
      : visual.assets.slice(0, 2);
  const corners = CORNER_PAIRS[visual.diagonal ?? "tlbr"];
  return assets.map((asset, index) => {
    const override = visual.offsets?.[index];
    const slot = override ?? CORNER_SLOTS[corners[index] ?? corners[0]];
    return {
      ...entry,
      id: `${entry.id}-corner-${index}`,
      visual: asset,
      x: slot.x,
      y: slot.y,
      scale: Number((size / naturalVisualSize(asset).width).toFixed(3)),
      entrance: entry.entrance ?? "pop",
      kenBurns: "float",
      link: index === 0 ? entry.link : undefined,
    };
  });
}
const LEGACY_HEADLINE_SIZE: Record<string, RichHeadlineLine["size"]> = {
  "hook-centered": "hero",
  "hook-visual": "headline",
  takeaway: "headline",
  "visual-explainer": "title",
  "screen-demo": "title",
  comparison: "title",
  steps: "title",
};
export function legacyTextAsLines(scene: Scene): Scene {
  const { eyebrow, headline, highlights, ...content } = scene.content;
  if (!eyebrow && !headline) return scene;
  if ((scene.content.richHeadline?.length ?? 0) > 0) {
    return {
      ...scene,
      content: { ...content, richHeadline: scene.content.richHeadline },
    };
  }
  const lines: RichHeadlineLine[] = [];
  if (eyebrow) {
    lines.push({
      text: eyebrow,
      size: "label",
      color: colors.accent,
      letterSpacing: 4,
    });
  }
  if (headline) {
    lines.push({
      text: headline,
      size: LEGACY_HEADLINE_SIZE[scene.type] ?? "headline",
      ...(highlights?.length ? { highlights } : {}),
    });
  }
  return { ...scene, content: { ...content, richHeadline: lines } };
}
export function normalizeScene(rawScene: Scene): Scene {
  const scene = legacyTextAsLines(rawScene);
  const existing = scene.content.visuals ?? [];
  const split = existing.flatMap(splitCornerProps);
  if (split.length === existing.length) return scene;
  return { ...scene, content: { ...scene.content, visuals: split } };
}
export function normalizeProject(project: VideoProject): VideoProject {
  return {
    ...project,
    scenes: project.scenes.map((raw) => {
      const scene = normalizeScene(raw);
      if (scene.plan) return scene;
      return { ...scene, plan: { role: planRoleFor(scene.type) } };
    }),
  };
}
function clampPositions(json: unknown): unknown {
  if (!json || typeof json !== "object") return json;
  const project = json as {
    scenes?: unknown[];
  };
  if (!Array.isArray(project.scenes)) return json;
  function clamp(value: unknown) {
    return typeof value === "number" && Number.isFinite(value)
      ? Math.min(100, Math.max(0, value))
      : value;
  }
  function clampEntry(entry: unknown) {
    if (!entry || typeof entry !== "object") return entry;
    const positioned = entry as {
      x?: unknown;
      y?: unknown;
    };
    if (typeof positioned.x === "number") positioned.x = clamp(positioned.x);
    if (typeof positioned.y === "number") positioned.y = clamp(positioned.y);
    return entry;
  }
  for (const scene of project.scenes) {
    const content = (
      scene as {
        content?: {
          visuals?: unknown[];
          blocks?: unknown[];
          richHeadline?: unknown[];
        };
      }
    )?.content;
    if (!content) continue;
    for (const list of [
      content.visuals,
      content.blocks,
      content.richHeadline,
    ]) {
      if (Array.isArray(list)) list.forEach(clampEntry);
    }
  }
  return json;
}
export function parseProject(json: unknown): VideoProject {
  return normalizeProject(videoProjectSchema.parse(clampPositions(json)));
}
