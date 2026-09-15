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
  const repairClaudeFlow =
    project.id === "project-mtii3v8d" &&
    !project.storyPlan &&
    (project.scenes.length === 7 || project.scenes.length === 11);
  const sourceScenes =
    repairClaudeFlow && project.scenes.length === 11
      ? project.scenes.filter((scene) =>
          [
            "scene-odn7i8z",
            "scene-01-hook",
            "scene-1gkt5f9",
            "scene-03-reveal",
            "scene-04-solution",
            "scene-05-step",
            "scene-10-cta",
          ].includes(scene.id),
        )
      : project.scenes;
  const acceptedClaudeFlow = repairClaudeFlow
    ? ([
        [
          "hook",
          "Stop the scroll with a familiar manual-testing pain.",
          "Claude Code marks on a dynamic background.",
          "Tired of testing apps manually?",
          "Tired of testing apps\nmanually?",
        ],
        [
          "reveal",
          "Reveal the new capability in one clear promise.",
          "Claude Code with a real app open in Chrome.",
          "Claude Code can now test your app like a real user.",
          "Claude Code\ncan now test your app\nlike a real user.",
        ],
        [
          "benefit",
          "Turn the feature into two concrete developer benefits.",
          "Clock changes to a bug: less wasted time, fewer missed bugs.",
          "So you waste less time and catch more bugs.",
          "DON'T WASTE TIME\nDON'T MISS BUGS",
        ],
        [
          "mechanism",
          "Explain how Claude gains access to the app.",
          "Claude Code and Google Chrome connect visually.",
          "It connects directly to Google Chrome.",
          "Claude Code\n+\nGoogle Chrome",
        ],
        [
          "setup",
          "Show the extension being installed and added to Chrome.",
          "Install the Chrome extension and finish on the Add extension confirmation.",
          "First, install the extension, and add it to Chrome.",
          "INSTALL EXTENSION\nADD TO CHROME",
        ],
        [
          "proof",
          "Show the prompt being sent and Claude testing through the extension.",
          "Open the extension panel, send the prompt, then show Claude navigating the website by itself.",
          "Open it, send your prompt, and watch Claude test the app.",
          "OPEN & SEND PROMPT\nWATCH CLAUDE TEST",
        ],
        [
          "cta",
          "End with one clear next action.",
          "Clean end card with an arrow and Claude mark.",
          "Follow for more practical AI building tips.",
          "FOLLOW FOR MORE\nAI BUILDING TIPS",
        ],
      ] as const)
    : null;
  return {
    ...project,
    storyPlan:
      project.storyPlan ??
      (acceptedClaudeFlow
        ? {
            targetDuration: 30,
            premise:
              "Claude Code can test a web app like a real user through Google Chrome.",
            audience: "Developers and AI app builders",
          }
        : undefined),
    scenes: sourceScenes.map((raw, index) => {
      let scene = normalizeScene(raw);
      if (
        project.id === "project-mtii3v8d" &&
        scene.id === "scene-04-solution" &&
        scene.content.richHeadline?.[0]?.text ===
          "INSTALL EXTENSION\nADD TO CHROME"
      ) {
        scene = {
          ...scene,
          content: {
            ...scene.content,
            richHeadline: [
              {
                text: "INSTALL THE EXTENSION",
                size: "title",
                lane: 0,
                delay: 18,
                exitAt: 57,
                exit: "fade",
                x: 50,
                y: 21.992481203007518,
                splitDuration: 30,
                exitDuration: 3,
                color: "#d97757",
              },
              ...scene.content.richHeadline.slice(1),
            ],
          },
        };
      }
      const accepted = acceptedClaudeFlow?.[index];
      if (accepted)
        return {
          ...withOnScreenText(scene, accepted[4]),
          vo: accepted[3],
          plan: {
            role: accepted[0],
            purpose: accepted[1],
            visualBrief: accepted[2],
          },
        };
      if (scene.plan) return scene;
      const role: ScenePlanRole =
        scene.type === "screen-demo"
          ? "demo"
          : scene.type === "takeaway"
            ? "payoff"
            : scene.type === "hook-centered"
              ? "hook"
              : scene.type === "hook-visual"
                ? "reveal"
                : "benefit";
      return {
        ...scene,
        plan: {
          role,
          purpose: undefined,
          visualBrief: undefined,
        },
      };
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
