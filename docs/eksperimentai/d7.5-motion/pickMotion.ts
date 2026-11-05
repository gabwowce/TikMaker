import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type {
  LayoutExample,
  VideoTemplate,
  Workspace,
} from "../../../src/agent/knowledge.js";
import type { IdeaFromUser } from "../../../src/agent/run/1-idea.js";
import type { SceneFromAi } from "../../../src/agent/run/3-script.js";
import {
  ALIVE,
  motionFromAi,
  SOUNDS,
  TEXT_IN,
  TRANSITIONS,
  VISUAL_IN,
  type MotionFromAi,
} from "../../../src/agent/run/4-building.js";
import { callStructured, type StructuredResult } from "../llm.js";

// Step 4b (D7.5, an experiment): the motion and sound of the whole video,
// planned at once so it has a rhythm, picked only from what TikMaker plays.
// Two sources of taste are compared on the same video:
//   "rules"  – the editing rules of an open short-video skill (A)
//   "videos" – the successful videos the template was built from (B)

export type MotionSource = "rules" | "videos";

const SYSTEM = `You plan the motion and sound of a short vertical video (TikTok, Reels, Shorts).
The scenes are written and laid out; you decide, for the WHOLE video at once, how each
scene feels: how it is entered, how its text and pictures arrive, which word stands out,
and where a sound plays. Plan the rhythm of the video, not each scene on its own.

Choose only from these lists:
- transition: ${TRANSITIONS.join(", ")}
- textIn (how the text arrives): ${TEXT_IN.join(", ")}; textSplit: word (one word at a
  time) or line
- highlight: one word of the scene's on-screen text, shown in a box, or null
- visualIn (how the pictures arrive): ${VISUAL_IN.join(", ")}
- visualAlive (what keeps a picture moving while on screen): ${ALIVE.join(", ")}
- sound: null, or { type: ${Object.keys(SOUNDS).join(" | ")}, on: cut | text | visual }
  – "on" is the moment it marks: the cut into the scene, the text, or the picture.

Answer with one entry per scene, in order. Follow the guidance below.`;

// A: the editing rules of Melvynx/video-agent-skills, short-editing
// (references/style.md and sfx.md, MIT, https://github.com/Melvynx/video-agent-skills),
// put in this step's words.
const RULES = `Editing rules (from an open short-video editing skill):
- Sound only on real payoffs: a number or a result landing, the key reveal, the big
  moment. No movement noise on every entrance – no whoosh, slide or click on each
  scene. A typical short has 2 to 4 sounds in all.
- impact: THE payoff or a hook verdict. riser: the build-up right before a reveal.
  pop: a real arrival – the logo or the result that matters. whoosh: at most once or
  twice, on the cut from the hook into the content. ding: a success, a check.
- A new picture every 2 to 4 seconds, arriving on the word it illustrates; never three
  text-only scenes in a row.
- The hook is readable on its first frame and something in it already moves; one accent
  word, at most six words.
- No wobbling or slanted text; keep movement purposeful and calm.`;

// B: the successful videos the template was built from, scene by scene, in
// the same words as the lists above.
const MOTION_WORDS: Record<string, string> = {
  "pop-in": "pop",
  "slide-in": "slideUp",
  "zoom-in": "zoomIn",
  "fade-in": "fade",
  static: "none",
  float: "float",
};

type Analysis = {
  title?: string;
  durationSeconds?: number;
  beats: {
    role: string;
    transitionIn: string;
    soundEffects: { type: string; syncedTo?: string }[];
    elements: { kind: string; motion: string; appearsOnWord?: string }[];
    composition?: { textBlocks?: { emphasizedWords?: string[] }[] };
  }[];
};

export async function referenceVideos(
  template: VideoTemplate,
  analysesDir: string,
): Promise<string> {
  const videos: string[] = [];
  for (const id of template.basedOnAnalysisIds.slice(0, 3)) {
    const file = path.join(analysesDir, `${id}.json`);
    const analysis = JSON.parse(await fs.readFile(file, "utf8")) as Analysis;
    const beats = analysis.beats.map((beat, index) => {
      const pictures = beat.elements
        .map(
          (e) =>
            `${e.kind} ${MOTION_WORDS[e.motion] ?? e.motion}` +
            (e.appearsOnWord ? ` on "${e.appearsOnWord}"` : ""),
        )
        .join(", ");
      const sounds = beat.soundEffects
        .map((s) => `${s.type}${s.syncedTo ? ` (${s.syncedTo})` : ""}`)
        .join(", ");
      const accent = beat.composition?.textBlocks
        ?.flatMap((t) => t.emphasizedWords ?? [])
        .join(", ");
      return (
        `  ${index + 1} ${beat.role}: in ${beat.transitionIn === "cut" ? "cut" : "slide"}` +
        `; pictures: ${pictures || "none"}; sound: ${sounds || "none"}` +
        (accent ? `; accent: ${accent}` : "")
      );
    });
    videos.push(
      `- "${analysis.title || id}" (${analysis.durationSeconds ?? "?"} s):\n${beats.join("\n")}`,
    );
  }
  return `Successful videos made with this template, scene by scene – match their rhythm:
how often they cut or slide, how pictures arrive, how many sounds and on which moments:
${videos.join("\n")}`;
}

function userPrompt(
  input: IdeaFromUser,
  workspace: Workspace,
  scenes: SceneFromAi[],
  layouts: LayoutExample[],
  guidance: string,
): string {
  const list = scenes
    .map((scene, index) => {
      const pictures = layouts[index].elements.map((e) => e.kind).join(", ");
      return `Scene ${index + 1} (${scene.role}): "${scene.onScreen}"
  Voiceover: ${scene.voiceover}
  Pictures: ${pictures || "none"}`;
    })
    .join("\n");
  return `Channel: ${workspace.name}. ${workspace.brief}
Idea: ${input.idea}

${guidance}

Scenes:
${list}`;
}

export async function pickMotion(
  input: IdeaFromUser,
  workspace: Workspace,
  scenes: SceneFromAi[],
  layouts: LayoutExample[],
  guidance: string,
  model?: Parameters<typeof callStructured>[2],
): Promise<StructuredResult<MotionFromAi>> {
  // One entry per scene. A highlight that is not on screen is not an error:
  // applyMotion highlights only words the line really shows.
  const schema = motionFromAi.extend({
    scenes: motionFromAi.shape.scenes.length(scenes.length),
  });
  return callStructured(
    schema,
    {
      system: SYSTEM,
      user: userPrompt(input, workspace, scenes, layouts, guidance),
    },
    model,
  );
}

export const motionGuidance = {
  rules: async () => RULES,
  videos: referenceVideos,
};
