import type { BlocksFromAi } from "../../../src/agent/run/4-blocks.js";
import type { SceneFromAi } from "../../../src/agent/run/3-script.js";
import {
  routeFromAi,
  type ChatMessage,
  type ChatTargetKind,
  type RouteFromAi,
} from "../../../src/agent/run/7-chat.js";
import { callStructured, type StructuredResult } from "../llm.js";

// 7 The conversation: what a user's message changes. A small call on Sonnet
// (docs/pokalbis-planas.md, decision 2): it reads the message, what was
// selected in the editor and a short picture of the video, and answers with
// a reply to the user, the targets (one per thing to change, each with its
// own instruction) and whether to ask before doing it. It never does the
// work – the step each target belongs to does.

// What each kind of target does, as the model is told.
const KINDS: Record<ChatTargetKind, string> = {
  hook: "write the three hooks again with the instruction (the user picks one again; a script that exists is written again after that)",
  script: "write the script again with the instruction",
  pictures:
    "pick one scene's pictures (blocks) again – needs sceneIndex; the words stay",
  motion:
    "plan the motion again – one scene (sceneIndex) or, without sceneIndex, the whole video",
  words:
    "write one scene's voiceover again – needs sceneIndex; then its voice and its pictures are made again on the new words",
  review:
    "look at frames of the built video and propose what to fix – when the creator asks how it looks, to check it, or to find what is wrong; no sceneIndex",
};

const SYSTEM = `You read a creator's message to the AI agent that is making their short video,
and decide what the message asks to change. You do not make the change.

Answer with:
- targets: one per thing to change, of the kinds allowed now (listed). Split a message
  that asks for several things into several targets, each with its own instruction –
  the instruction is what to do, in plain words, taken from the message. A scene is
  given by sceneIndex (scene 1 = 0); when the creator had something selected in the
  editor (Attached), a message about "this" or "here" means that.
- confirm: true when the change reaches several parts (more than one target, the motion
  of the whole video, a hook while a script already exists) – the creator then sees your
  proposal and decides; false for one clear change.
- reply: what you say back, in the language of the message, one or two short sentences:
  what you will change (or propose to change). If the message is not clear enough to act
  on – which scene? what exactly? – give no targets and ask in reply. If it asks for
  something not allowed now, give no targets and say in reply what can be changed now.`;

export async function routeMessage(
  message: ChatMessage,
  context: {
    status: string;
    allowed: ChatTargetKind[];
    hook?: string;
    scenes: SceneFromAi[];
    blocks?: BlocksFromAi;
  },
  model?: Parameters<typeof callStructured>[2],
): Promise<StructuredResult<RouteFromAi>> {
  const allowed = context.allowed
    .map((kind) => `- ${kind}: ${KINDS[kind]}`)
    .join("\n");
  const scenes = context.scenes
    .map((scene, n) => {
      const picked = context.blocks?.scenes[n];
      const pictures = picked
        ? ` | pictures: ${picked.stage ?? "top"} – ${picked.blocks.map((b) => b.kind).join(", ") || "words only"}`
        : "";
      return `Scene ${n + 1} (${scene.role}): ${scene.voiceover}${pictures}`;
    })
    .join("\n");
  const attached = message.attachments?.length
    ? message.attachments.map((a) => `- ${a.label}`).join("\n")
    : "- nothing";
  const user = `Where the video is: ${context.status}
Allowed now:
${allowed || "- nothing (the agent is busy; say the message will be taken up when it stops)"}

Hook: ${context.hook ?? "(not picked yet)"}
${scenes || "(no script yet)"}

Attached (selected in the editor):
${attached}

Message: ${message.text}`;
  return callStructured(routeFromAi, { system: SYSTEM, user }, model);
}
