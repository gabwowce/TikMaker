import type { VideoProject } from "../schema/project";
import type { Scene } from "../schema/scene";
import type { RichTextSize } from "../schema/scene";
import type { VisualConfig } from "../schema/visual";
import { generatedLogos } from "../registries/assets.generated";
import { SAFE_CONTENT_WIDTH } from "../video/layout/layoutPresets";
import { fitScale, naturalVisualSize } from "../video/layout/visualMetrics";
import { fontSizes } from "../video/typography/tokens";
import type { LayoutElement, LayoutExample, WorkspaceStyle } from "./knowledge";
import type { AgentRun } from "./run/run";

// 4 Building without AI: a layout example + the model's fills → a scene that
// looks like the example. The same input always gives the same scene
// (NFR-04). Boxes in an example are percent of the 1080x1920 canvas.
const CANVAS = { width: 1080, height: 1920 };
const logoIds = generatedLogos.map((asset) => asset.id);

// What goes into one picture of the example. A logo or a prop is a library
// file (the fill is its id); anything else is the user's own material, so it
// becomes a "REC" placeholder saying what to put there (FR-13) – the same
// placeholder npm run video:check reports.
function visualFor(element: LayoutElement, fill: string): VisualConfig {
  // A logo or a prop picture takes any icon from the library; which one it
  // is decides how it is drawn.
  if (element.kind === "logo" || element.kind === "prop")
    return logoIds.includes(fill)
      ? { type: "logo", logo: fill }
      : { type: "prop", asset: fill };
  const ratio =
    (element.w * CANVAS.width) / 100 / ((element.h * CANVAS.height) / 100);
  return {
    type: "screen",
    aspect: ratio < 0.8 ? "9:16" : ratio < 1.2 ? "1:1" : "16:10",
    content: { type: "checkpoint", label: "REC", detail: fill },
  };
}

// One scene laid out like the example: every picture in its box (scaled to
// fit, never past the side margins TikTok draws over), and the on-screen text
// where the example has its first text block. An example without text keeps
// the frame clean: the words are still said and shown as captions.
export function compileScene(
  scene: Scene,
  example: LayoutExample,
  fills: string[],
): Scene {
  const visuals = example.elements.map((element, index) => {
    const visual = visualFor(element, fills[index]);
    const box = {
      width: Math.min((element.w * CANVAS.width) / 100, SAFE_CONTENT_WIDTH),
      height: (element.h * CANVAS.height) / 100,
    };
    const library = element.kind === "logo" || element.kind === "prop";
    return {
      id: `${scene.id}-v${index + 1}`,
      visual,
      x: element.x,
      y: element.y,
      scale: fitScale(naturalVisualSize(visual), box),
      // The user's own material moves slowly the whole time it is on
      // screen, so even a still screenshot or photo looks alive.
      ...(library ? {} : { kenBurns: "zoomIn" as const }),
    };
  });

  const text =
    scene.content.richHeadline?.map((l) => l.text).join(" ") ??
    scene.content.headline ??
    "";
  // The text goes where the example has it. An example that splits its text
  // over two places (half above a picture, half below) gets it split the
  // same way; each part is sized down until it fits its box.
  const blocks = example.textBlocks;
  const parts = text ? splitWords(text, Math.max(blocks.length, 1)) : [];
  const richHeadline = blocks.length
    ? parts.map((part, index) => {
        const block = blocks[index];
        return {
          text: part,
          size: fittingSize(part, block),
          pill: block.pill,
          x: block.x,
          y: Math.min(Math.max(block.y, TEXT_TOP), TEXT_BOTTOM),
        };
      })
    : undefined;

  return {
    ...scene,
    layoutExampleId: example.id,
    content: {
      ...scene.content,
      headline: undefined,
      richHeadline,
      visuals,
      textOnTop: true,
    },
  };
}

// Where text may sit, in % of the height: below TikTok's top bar and above
// its caption and buttons area (y 170–1500 px of 1920).
const TEXT_TOP = 9;
const TEXT_BOTTOM = 78;
// Text sizes from the biggest down, and roughly how wide one character is.
const SIZES: RichTextSize[] = [
  "hero",
  "headline",
  "title",
  "bodyLarge",
  "body",
  "label",
];
const CHAR_WIDTH = 0.58; // × font size, for the bold display fonts

// The words split into n parts of about the same length, in order.
function splitWords(text: string, n: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const parts = Math.min(n, words.length);
  const per = Math.ceil(words.length / parts);
  return Array.from({ length: parts }, (_, i) =>
    words.slice(i * per, (i + 1) * per).join(" "),
  ).filter(Boolean);
}

// The example's size, or the next smaller one until the text wraps into no
// more lines than the box allows (at least two) – so it never runs over the
// picture below it.
function fittingSize(text: string, block: LayoutExample["textBlocks"][number]) {
  const width = Math.min((block.w * CANVAS.width) / 100, SAFE_CONTENT_WIDTH);
  const allowed = Math.max(block.lines, 2);
  const start = SIZES.indexOf(block.size);
  for (const size of SIZES.slice(start))
    if (lineCount(text, width, fontSizes[size]) <= allowed) return size;
  return SIZES[SIZES.length - 1];
}

function lineCount(text: string, width: number, fontSize: number): number {
  const perLine = Math.max(1, Math.floor(width / (fontSize * CHAR_WIDTH)));
  let lines = 1;
  let used = 0;
  for (const word of text.split(/\s+/)) {
    const needed = (used ? 1 : 0) + word.length;
    if (used + needed > perLine && used) {
      lines++;
      used = word.length;
    } else used += needed;
  }
  return lines;
}

// The whole video: every scene the agent wrote is laid out like the example
// the model chose for it. Scenes the user added by hand are left as they are.
// On top, what makes the scenes one video: the channel's background, one
// slide direction (CLAUDE.md, motion discipline) and one caption height.
export function compileProject(
  project: VideoProject,
  run: AgentRun,
  examples: LayoutExample[],
  style: WorkspaceStyle,
): VideoProject {
  const used: LayoutExample[] = [];
  const scenes = project.scenes.map((scene, index) => {
    // The agent's scene n has the id projectFromScript gave it.
    const choice = run.layout?.scenes.find(
      (_, n) => scene.id === `scene-${run.id}-${n + 1}`,
    );
    const example = examples.find((e) => e.id === choice?.layoutExampleId);
    if (!choice || !example) return scene;
    used.push(example);
    const first = index === 0;
    return {
      ...compileScene(scene, example, choice.fills),
      background: style.backgrounds[0],
      motion: {
        // The opening frame cuts in; every other scene slides in from the
        // same side, and its content rides the slide (entrance "none").
        transition: first ? "cut" : "slideLeft",
        entrance: first ? "fade" : "none",
        stagger: scene.plan?.role === "hook" ? 4 : 6,
      },
    } satisfies Scene;
  });
  return {
    ...project,
    scenes,
    captions: { ...project.captions, y: median(used.map((e) => e.captionsY)) },
  };
}

// The middle of the examples' caption heights, so the captions sit where most
// of them have it and stay there for the whole video.
function median(values: (number | undefined)[]): number | undefined {
  const sorted = values
    .filter((v): v is number => v !== undefined)
    .sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : undefined;
}
