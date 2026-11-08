import type { Workspace } from "../../../src/agent/knowledge.js";
import type { IdeaFromUser } from "../../../src/agent/run/1-idea.js";
import type { SceneFromAi } from "../../../src/agent/run/3-script.js";
import { codeFromAi, type CodeFromAi } from "../../../src/agent/run/4-code.js";
import { SOUND_USES } from "../../../src/agent/soundCues.js";
import {
  VISUAL_STYLES,
  type VisualStyle,
  type VisualStyleId,
} from "../../../src/agent/visualStyles.js";
import type { SceneWord } from "../../../src/video/code/types.js";
import { callClaudeCodeAgent, WrongShapeError } from "../claudeCode.js";
import { claudeModel } from "../models.js";
import {
  StructuredCallError,
  type CallLog,
  type StructuredResult,
  type TokenCount,
} from "../llm.js";

// 4 Building: the pictures as code (docs/tikmaker-kryptis.md). Claude Code,
// in the project's folder, writes every scene's picture as a Remotion
// component by three layers of skills – the official Remotion skill (how to
// write it right), the TikMaker explainer skill (our genre) and the channel's
// brand kit (src/video/brand) – checks that it compiles and renders, looks at
// its own frames, and answers what it made.

// One scene as Claude Code gets it: what is said and when, how long it is,
// what the script wanted, and where its file goes.
export type CodeBriefScene = {
  scene: SceneFromAi;
  file: string; // under src/generated/
  durationInFrames: number;
  // global frames of the scene in the props file (for `remotion still`)
  from: number;
  words: SceneWord[];
  // the code there now, when the scene is being rewritten
  current?: string;
};

// A saved visual of the channel ("Mano vizualai"): the agent may reuse it.
export type SavedVisualBrief = {
  id: string;
  title: string;
  description: string;
  file: string; // its code, to Read
  frame?: string; // a PNG of it
};

export type CodeJob = {
  input: IdeaFromUser;
  workspace: Workspace;
  folder: string; // src/generated/<folder>/
  scenes: CodeBriefScene[];
  // the scenes to write now (all of them on the first build)
  write: number[];
  // what to change (a message, the review) – for a rewrite
  instruction?: string;
  // compile errors from the last try, to fix
  errors?: string[];
  // the props file `remotion still` renders the video from
  propsFile: string;
  visuals: SavedVisualBrief[];
  // the look of the pictures (src/agent/visualStyles.ts); unset – "clear"
  style?: VisualStyleId;
};

const system = (style: VisualStyle) => `You are the motion designer of TikMaker: you write the pictures of a short
vertical video (1080x1920, 30 fps) as Remotion code – one file per scene. The voice,
the captions and the backdrop are already in the video; you write the pictures.

This video's visual style is "${style.id}": ${style.description}.

Before writing, read with the Read tool:
1. .claude/skills/tikmaker-scene/SKILL.md – how a scene file is written: the picture
   zone, the brand kit, the editable fields, sound, the technical limits.
2. .claude/skills/${style.skill}/SKILL.md – the LOOK of this style – and the example
   frames and notes it points to (.claude/skills/${style.skill}/references/). Also the
   COMPOSITION sheet knowledge/shared/reference-frames/insiderforce.png – how a vertical
   frame is laid out: one dominant thing, big, calm space. Follow the style exactly; do
   not mix in another style.
3. .claude/skills/remotion-best-practices/remotion-markup/REFERENCE.md – how to write
   Remotion markup right (open the pages it points to that you need: timing,
   sequencing, transitions, text-highlights). Ignore anything about starting Studio,
   creating projects or installing packages.
4. src/video/brand/kit.tsx, src/video/brand/fields.ts and src/video/code/types.ts.

Rules:
- Write ONLY in the folder you are given (src/generated/<folder>/). Never touch other
  files. Shared helpers for several scenes go in <folder>/shared.tsx.
- Time everything by the \`words\` prop (wordFrame) and \`durationInFrames\`, never by the
  frame numbers in the brief – they are only there for you to plan.
- Check your work: run \`npx tsc --noEmit -p .\` until nothing in your folder fails.
  Then render a frame or two of every scene you wrote with the command in the brief
  and look at the PNG with Read, next to the style's example frames: does it look like
  this style, can it be taken in at a glance (one focal thing, no small text to read),
  is the main object big, does nothing overlap, is nothing under the captions band?
  Fix it and look again.
- Do not ask questions – nobody is there to answer. Decide.
- At the end answer with JSON: for every scene you wrote its sceneIndex (from 0), one
  sentence of what the viewer sees, and its stage ("top" unless the scene is a
  full-screen recording); the voiceover words the captions should draw bold
  (keywords, 1–2 per scene); and wishes – what the kit or the logo library lacked.
- Sound: for every scene, 0–2 sound effects on its key moments (sounds: the spoken
  word the moment lands on, and the kind). Never play sound in the code – the video
  puts these on the timeline from its library. Only moments the picture makes: the
  main move, the payoff. At most ~3 per 10 seconds in the whole video; a calm scene
  gets none. Kinds:
${Object.entries(SOUND_USES)
  .map(([kind, use]) => `  - ${kind}: ${use}`)
  .join("\n")}`;

export function writeCodePrompt(job: CodeJob): { system: string; user: string } {
  const channel = [
    `Channel: ${job.workspace.name}`,
    `What it is about: ${job.workspace.brief}`,
    `Audience: ${job.workspace.audience}`,
    `Tone: ${job.workspace.tone}`,
    ...(job.workspace.screens ?? []).map(
      (screen) => `Product screen "${screen.name}": ${screen.shows}`,
    ),
    ...(job.workspace.facts ?? []).map((fact) => `Fact: ${fact}`),
  ]
    .filter(Boolean)
    .join("\n");
  const scenes = job.scenes
    .map(({ scene, file, durationInFrames, from, words, current }, n) => {
      const writing = job.write.includes(n);
      const still = `npx remotion still TikTokVideo out/agent/${job.folder}/scene-${n + 1}.png --props=${job.propsFile} --frame=${from + Math.round(durationInFrames * 0.7)} --scale=0.5`;
      return `## Scene ${n + 1} (${scene.role}) – ${writing ? "WRITE" : "already written, keep"} src/generated/${file}
${durationInFrames} frames (${(durationInFrames / 30).toFixed(1)} s); global frames ${from}–${from + durationInFrames - 1}
Voiceover: ${scene.voiceover}
Words (word@frame from the scene's start): ${words.map((w) => `${w.text}@${w.frame}`).join(" ")}
On screen (the script's words): ${scene.onScreen || "–"}
The script's idea for the picture: ${scene.visual}
${scene.needsRecording ? `The creator's own screen recording belongs here (a RecordingSlot – say exactly what to record)\n` : ""}${writing ? `Render a frame: ${still}` : ""}${current ? `\nIts code now:\n\`\`\`tsx\n${current}\n\`\`\`` : ""}`;
    })
    .join("\n\n");
  const visuals = job.visuals.length
    ? `\n\nThe channel's saved visuals ("my visuals") – reuse one (copy and adapt its code) where it fits, or when asked:\n${job.visuals
        .map(
          (v) =>
            `- ${v.title}: ${v.description} (code: ${v.file}${v.frame ? `, frame: ${v.frame}` : ""})`,
        )
        .join("\n")}`
    : "";
  const task = job.instruction
    ? `Rewrite scene(s) ${job.write.map((n) => n + 1).join(", ")} – the change asked for: ${job.instruction}
Keep what was not asked to change. Keep the file name, keep the schema's field names where they still fit.`
    : `Write every scene's file (${job.write.map((n) => n + 1).join(", ")}).`;
  const errors = job.errors?.length
    ? `\n\nThe last try did not compile – fix these first:\n${job.errors.join("\n")}`
    : "";
  return {
    system: system(VISUAL_STYLES[job.style ?? "clear"]),
    user: `${channel}

The video: ${job.input.idea}
Folder: src/generated/${job.folder}/

${task}${errors}${visuals}

${scenes}`,
  };
}

// One run of Claude Code; a JSON answer in the wrong shape is asked for once
// more (the files are written by then – the second try only answers).
export async function writeCode(
  job: CodeJob,
  cwd: string,
): Promise<StructuredResult<CodeFromAi>> {
  const prompt = writeCodePrompt(job);
  const started = Date.now();
  const usage: TokenCount = {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    thinkingTokens: 0,
    turns: 0,
  };
  let model = `claude-code:${claudeModel()}`;
  const log = (attempts: number): CallLog => ({
    model,
    prompt,
    attempts,
    usage,
    ms: Date.now() - started,
  });
  const options = {
    cwd,
    tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash"],
    allow: [
      "Read",
      "Glob",
      "Grep",
      `Edit(src/generated/${job.folder}/**)`,
      "Bash(npx tsc:*)",
      "Bash(npx remotion still:*)",
    ],
    timeoutMs: (job.write.length > 1 ? 45 : 20) * 60_000,
  };
  for (let attempt = 1; ; attempt++) {
    try {
      const answer = await callClaudeCodeAgent(codeFromAi, prompt, options);
      model = answer.model;
      add(usage, answer.usage);
      return { ...log(attempt), data: answer.data };
    } catch (error) {
      if (error instanceof WrongShapeError) {
        add(usage, error.usage);
        if (attempt < 2) continue;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new StructuredCallError(message, log(attempt));
    }
  }
}

function add(total: TokenCount, more: TokenCount) {
  total.inputTokens += more.inputTokens;
  total.cachedInputTokens += more.cachedInputTokens;
  total.outputTokens += more.outputTokens;
  total.thinkingTokens += more.thinkingTokens;
  total.turns = (total.turns ?? 0) + (more.turns ?? 0);
}
