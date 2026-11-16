import { z } from "zod";
import type { Workspace } from "../../../src/agent/knowledge.js";
import type { IdeaFromUser } from "../../../src/agent/run/1-idea.js";
import type { SceneFromAi } from "../../../src/agent/run/3-script.js";
import { callStructured, type StructuredResult } from "../ai/llm.js";
import { creatorFacts, productScreens } from "./productScreens.js";

// 7 The conversation, target "words": one scene's voiceover written again
// with the creator's instruction, after the video is built. Only that scene –
// the scenes around it are given so the new words still lead on from the one
// before and into the one after. Its voice and its pictures are then made
// again on the new words (steps/7-chat.ts).

export const sceneWordsFromAi = z.object({
  voiceover: z.string().trim().min(3).max(400),
  onScreen: z.string().trim().min(1).max(120),
});
export type SceneWordsFromAi = z.infer<typeof sceneWordsFromAi>;

const SYSTEM = `You rewrite the words of ONE scene of a short vertical video that is already made.
Write what the creator asks for that scene and nothing else: keep it natural spoken
English, about as long as before unless asked otherwise, and make it still follow from the
scene before and lead into the scene after. Never invent a fact, a number or a result the
idea does not give. voiceover: what is said; onScreen: the key words shown big.`;

export async function rewriteScene(
  input: IdeaFromUser,
  workspace: Workspace,
  scenes: SceneFromAi[],
  sceneIndex: number,
  instruction: string,
  model?: Parameters<typeof callStructured>[2],
): Promise<StructuredResult<SceneWordsFromAi>> {
  const list = scenes
    .map(
      (scene, n) =>
        `${n === sceneIndex ? "→ " : "  "}Scene ${n + 1} (${scene.role}): ${scene.voiceover}`,
    )
    .join("\n");
  const user = `Channel: ${workspace.name}. ${workspace.brief}${productScreens(workspace)}${creatorFacts(workspace)}
Idea: ${input.idea}

The video's scenes (→ the one to rewrite):
${list}

Rewrite scene ${sceneIndex + 1}: ${instruction}`;
  return callStructured(sceneWordsFromAi, { system: SYSTEM, user }, model);
}
