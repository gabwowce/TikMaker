import type { IdeaFromUser } from "../../../src/agent/run/1-idea.js";
import {
  storyFromAi,
  type ScriptProblem,
  type SceneFromAi,
  type StoryFromAi,
} from "../../../src/agent/run/3-script.js";
import { callStructured, type StructuredResult } from "../llm.js";

// Step 3, after the script is written: read it back the way a viewer hears it
// – once, voice first, with no idea of what the creator meant – and say where
// the thread breaks. checkScript counts seconds and words; nothing else reads
// the script for sense, and a script can pass every rule and still be a heap
// of unconnected lines (a hook about ONE job followed by a list of three, a
// "People person?" scene nobody set up, new numbers as the ending).

const SYSTEM = `You hear a short vertical video (TikTok, Reels, Shorts) once, the way a viewer does:
the voice first, the few words on screen, the picture. You know nothing about it beyond what
it says. Your job is to say what it is about and where a viewer loses the thread. You do not
rewrite it.

Check, in this order:
1. summary – in one sentence, what would a viewer say this video is about? If you cannot say
   it in one sentence, the scene where it stops making sense is a break.
2. promise and kept – what does the FIRST scene make the viewer expect (an answer to its
   question, one thing it names, a result, a list it announces)? kept = the rest of the video
   gives exactly that. A hook about ONE thing followed by several things, a question the video
   never answers, or a number the video never explains is not kept.
3. Every scene follows from the one before it: a viewer hearing it next knows why it is there
   and how it relates to what was just said. A scene that starts something nobody set up – a
   label or a type of person never introduced ("People person?"), a "Second" with no list
   announced, a jump to another topic – is a break.
4. Every name, term or number is explained the first time it is heard, in plain words, in that
   scene or the one right before ("forward-deployed engineer" – what is that?).
5. The ending pays off the promise (the answer, the result, what to do now); new facts or
   numbers in the last scene that answer nothing are a break.

Report only real breaks – where an ordinary viewer would be lost or would feel the video jumped –
each with its scene number (counted from 1) and, in one or two plain sentences, what is wrong
and what would connect it. A script that reads as one clear story has breaks: [] and kept: true.`;

function userPrompt(
  input: IdeaFromUser,
  hook: { text: string; firstFrame?: string },
  scenes: SceneFromAi[],
): string {
  const lines = scenes.map(
    (scene, index) =>
      `${index + 1}. [${scene.role}] Voice: ${scene.voiceover}\n   On screen: ${scene.onScreen}\n   Shows: ${scene.visual}`,
  );
  return `What the creator wanted (the viewer does NOT know this – use it only to see what the
video is meant to say): ${input.idea}

The opening line: ${hook.text}

The script, scene by scene:
${lines.join("\n")}`;
}

export async function checkStory(
  input: IdeaFromUser,
  hook: { text: string; firstFrame?: string },
  scenes: SceneFromAi[],
  model?: Parameters<typeof callStructured>[2],
): Promise<StructuredResult<StoryFromAi>> {
  return callStructured(
    storyFromAi,
    { system: SYSTEM, user: userPrompt(input, hook, scenes) },
    model,
  );
}

// The story check as script problems: the same list the rule check fills, so
// the one automatic rewrite gets them and the script card shows what is left.
export function storyProblems(story: StoryFromAi | undefined): ScriptProblem[] {
  if (!story) return [];
  const problems: ScriptProblem[] = [];
  if (!story.kept)
    problems.push({
      sceneIndex: 0,
      message: `Scene 1 promises: ${story.promise} – the rest of the video does not give exactly that. Make the opening promise what the video delivers, or the video deliver what it promises.`,
    });
  for (const item of story.breaks)
    problems.push({
      sceneIndex: item.scene - 1,
      message: `Scene ${item.scene}: ${item.problem}`,
    });
  return problems;
}
