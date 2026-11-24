import type {
  ChatMessage,
  ChatTarget,
  ChatTargetKind,
} from "../../../src/agent/run/7-chat.js";
import type { AgentRun } from "../../../src/agent/run/run.js";
import type { RunStatus } from "../../../src/agent/run/status.js";
import { generateVoice } from "../../voice.js";
import type { Job } from "../job.js";
import { closeWork, updateMessage } from "../messages.js";
import { rewriteScene } from "../prompts/rewriteScene.js";
import { routeMessage } from "../prompts/routeMessage.js";
import { writeHooks } from "../prompts/writeHooks.js";
import { findTemplate } from "./angle.js";
import { rewriteCodeScenes } from "../codeScenes.js";
import { voiceAround } from "./voice.js";

// 7 The conversation (docs/pokalbis-planas.md, docs/pokalbis-kodas.md).
//
// 1. The user's message is saved at once, whatever the agent is doing
//    (answers.ts) – it waits in the run until the agent stops at a point
//    where it can be taken up (TALK_STATUSES). Several can wait: they form
//    a queue and are taken up one by one, oldest first (messages.ts nextWork).
// 2. agent.ts takes it up: routeMessage (Sonnet) decides what it changes
//    (route). Not clear → the agent asks back. Several parts → the agent
//    proposes and waits for the "Do it" button (answers.ts).
// 3. agent.ts does the work target by target with the functions below and
//    the agent answers with what it did (messages.ts finishWork / failWork).

// What a message may change at each point where the agent waits.
const ALLOWED: Partial<Record<RunStatus, ChatTargetKind[]>> = {
  awaiting_hook: ["hook"],
  awaiting_approval: ["script", "hook"],
  done: ["pictures", "motion", "words", "review"],
};
// Where a waiting message is taken up.
export const TALK_STATUSES = Object.keys(ALLOWED) as RunStatus[];

// ── 2. What it changes ─────────────────────────────────────────────────────

// The router's answer, checked: only what is allowed now, a scene that
// exists, a layer only with its own scene. Returns the targets to do now, or
// nothing when the agent asked back or proposed instead.
export async function route(
  job: Job,
  message: ChatMessage,
  waitedIn: RunStatus, // where the agent waited when the message came
): Promise<{ targets: ChatTarget[]; reply: string } | undefined> {
  const allowed = ALLOWED[waitedIn] ?? [];
  const scenes = job.run.script?.scenes ?? [];
  const routed = await job.ai(
    routeMessage(message, {
      status: waitedIn,
      allowed,
      hook: job.run.hook?.text,
      scenes,
      code: job.run.code,
    }),
  );
  const targets = validTargets(routed.targets, allowed, scenes.length, message);

  if (!targets.length) {
    // not clear, or not possible now: the agent's reply asks or explains
    await closeWork(
      job,
      message.id,
      { status: "done" },
      routed.reply,
      {},
      waitedIn,
    );
    return undefined;
  }
  // decision 3: a change that reaches several parts is proposed first – the
  // code holds to that even when the router did not ask for it
  if (routed.confirm || reachesFar(job.run, targets)) {
    await closeWork(
      job,
      message.id,
      { status: "done" },
      routed.reply,
      { proposal: { targets } },
      waitedIn,
    );
    return undefined;
  }
  await updateMessage(job, message.id, { targets, status: "working" });
  return { targets, reply: routed.reply };
}

function validTargets(
  targets: ChatTarget[],
  allowed: ChatTargetKind[],
  sceneCount: number,
  message: ChatMessage,
): ChatTarget[] {
  const attachedScenes = [
    ...new Set((message.attachments ?? []).map((a) => a.sceneIndex)),
  ];
  return targets.flatMap((target): ChatTarget[] => {
    if (!allowed.includes(target.kind)) return [];
    // a scene the router left out: the one attached, if there is just one
    const sceneIndex =
      target.sceneIndex ??
      (attachedScenes.length === 1 ? attachedScenes[0] : undefined);
    const needsScene = target.kind === "pictures" || target.kind === "words";
    if (needsScene && sceneIndex === undefined) return [];
    if (
      sceneIndex !== undefined &&
      (sceneIndex < 0 || sceneIndex >= sceneCount)
    )
      return [];
    const layer = message.attachments?.find(
      (a) => a.sceneIndex === sceneIndex && a.objectId,
    )?.objectId;
    return [
      {
        ...target,
        ...(sceneIndex !== undefined ? { sceneIndex } : {}),
        ...(layer && target.kind === "pictures" ? { objectId: layer } : {}),
      },
    ];
  });
}

// What the code always asks about first: several targets, the whole video's
// motion, a hook when a script already exists (the script goes with it).
function reachesFar(run: AgentRun, targets: ChatTarget[]): boolean {
  if (targets.length > 1) return true;
  const [target] = targets;
  if (target.kind === "motion" && target.sceneIndex === undefined) return true;
  if (target.kind === "hook" && run.script) return true;
  return false;
}

// ── 3. The work, target by target (agent.ts sets the statuses) ────────────

// hook: three new hooks with the instruction; the hook and the script picked
// so far are dropped – the user picks again, and the script follows.
export async function rewriteHooks(
  job: Job,
  instruction: string,
): Promise<void> {
  const chosen = job.run.template;
  if (!chosen) throw new Error("There is no template yet");
  const template = findTemplate(job, chosen.videoTemplateId);
  const hooks = await job.ai(
    writeHooks(
      job.run.input,
      job.workspace,
      template,
      job.knowledge.hookFormulas,
      undefined,
      { previous: job.run.hooks ?? [], instruction },
      job.run.value,
    ),
  );
  await job.save({
    hooks,
    hooksFor: template.id,
    hook: undefined,
    script: undefined,
  });
}

// script: the instruction becomes the script's comment; agent.ts then writes
// the script again (step 3), exactly as a comment always did.
export async function commentScript(
  job: Job,
  instruction: string,
): Promise<void> {
  const script = job.run.script;
  if (!script) throw new Error("There is no script to change yet");
  await job.save({ script: { ...script, comment: instruction } });
}

// pictures / motion / words: after the build. Returns notes for the reply.
// The pictures are code (docs/tikmaker-kryptis.md): "pictures" and "motion"
// both write the scene's code again with the instruction – the earlier code
// is kept as a version (Undo); "motion" for the whole video writes every
// scene again.
export async function change(job: Job, target: ChatTarget): Promise<string[]> {
  const notes = await changeCode(job, target);
  // the earlier code is kept: the creator can go back
  return target.kind === "pictures" ||
    target.kind === "motion" ||
    target.kind === "words"
    ? [...notes, "(Undo in the Inspector brings the earlier version back.)"]
    : notes;
}

async function changeCode(job: Job, target: ChatTarget): Promise<string[]> {
  const instruction = target.instruction ?? "";
  const n = target.sceneIndex;
  const count = job.run.script?.scenes.length ?? 0;
  if (target.kind === "pictures" && n !== undefined) {
    const comment = target.objectId
      ? `${instruction} (about the layer "${target.objectId}" the creator put on top)`
      : instruction;
    return rewriteCodeScenes(job, [n], comment);
  }
  if (target.kind === "motion")
    return n === undefined
      ? rewriteCodeScenes(
          job,
          [...Array(count).keys()],
          `How it moves: ${instruction}`,
        )
      : rewriteCodeScenes(job, [n], `How it moves: ${instruction}`);
  if (target.kind === "words" && n !== undefined)
    return rewriteWords(job, n, instruction);
  throw new Error(`I can't change "${target.kind}" now`);
}

// words: the scene's voiceover written again; its voice made again (when the
// video has one); its picture written again on the new words.
async function rewriteWords(
  job: Job,
  n: number,
  instruction: string,
): Promise<string[]> {
  const script = job.run.script;
  if (!script) throw new Error("There is no script");
  const words = await job.ai(
    rewriteScene(job.run.input, job.workspace, script.scenes, n, instruction),
  );
  await job.save({
    script: {
      ...script,
      scenes: script.scenes.map((scene, i) =>
        i === n ? { ...scene, ...words } : scene,
      ),
    },
  });
  const voice = job.run.voice;
  if (voice?.scenes[n]) {
    const clip = await generateVoice(
      words.voiceover,
      `${job.run.id} scene ${n + 1}`,
      {},
      voiceAround(job.run.script?.scenes ?? [], n),
    );
    await job.save({
      voice: {
        scenes: voice.scenes.map((scene, i) =>
          i === n ? { sfxId: clip.id, words: clip.words } : scene,
        ),
      },
    });
  }
  return rewriteCodeScenes(
    job,
    [n],
    `The words of this scene were just rewritten – fit the picture to the new words. ${instruction}`,
  );
}
