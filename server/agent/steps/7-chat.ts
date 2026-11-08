import type {
  ChatMessage,
  ChatTarget,
  ChatTargetKind,
  DecideFromUser,
  SendMessageFromUser,
} from "../../../src/agent/run/7-chat.js";
import type { AgentRun } from "../../../src/agent/run/run.js";
import type { RunStatus } from "../../../src/agent/run/status.js";
import { generateVoice } from "../../voice.js";
import { openJob, type Job } from "../job.js";
import { rewriteScene } from "../prompts/rewriteScene.js";
import { routeMessage } from "../prompts/routeMessage.js";
import { writeHooks } from "../prompts/writeHooks.js";
import { findTemplate } from "./2-angle.js";
import { rewriteCodeScenes } from "../codeScenes.js";
import { voiceAround } from "./5-voice.js";

// 7 The conversation (docs/pokalbis-planas.md, docs/pokalbis-kodas.md).
//
// 1. The user's message is saved at once, whatever the agent is doing
//    (step7Message) – it waits in the run until the agent stops at a point
//    where it can be taken up (TALK_STATUSES). Several can wait: they form
//    a queue and are taken up one by one, oldest first (nextWork).
// 2. agent.ts takes it up: routeMessage (Sonnet) decides what it changes
//    (step7Route). Not clear → the agent asks back. Several parts → the agent
//    proposes and waits for the "Do it" button (step7Decide).
// 3. agent.ts does the work target by target with the step functions below
//    and the agent answers with what it did (finishWork / failWork).

// What a message may change at each point where the agent waits.
const ALLOWED: Partial<Record<RunStatus, ChatTargetKind[]>> = {
  awaiting_hook: ["hook"],
  awaiting_approval: ["script", "hook"],
  done: ["pictures", "motion", "words", "review"],
};
// Where a waiting message is taken up.
export const TALK_STATUSES = Object.keys(ALLOWED) as RunStatus[];

const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ── 1. The message ─────────────────────────────────────────────────────────

export async function step7Message(
  run: AgentRun,
  input: SendMessageFromUser,
): Promise<void> {
  if (run.status === "error" || run.status === "cancelled")
    throw new Error(`The run has stopped (${run.status}) – start a new one`);
  const job = await openJob(run);
  const message: ChatMessage = {
    id: newId("msg"),
    at: Date.now(),
    from: "user",
    text: input.text,
    ...(input.attachments?.length ? { attachments: input.attachments } : {}),
    status: "waiting",
  };
  await job.save({ messages: [...(run.messages ?? []), message] });
}

// The next piece of work: the user's message not taken up yet, or a proposal
// the user accepted. Oldest first.
export function nextWork(run: AgentRun): ChatMessage | undefined {
  return run.messages?.find(
    (message) =>
      message.status === "waiting" &&
      (message.from === "user" || message.proposal?.decision === "yes"),
  );
}

// The user's answer to a proposal – the buttons, never a message.
export async function step7Decide(
  run: AgentRun,
  input: DecideFromUser,
): Promise<void> {
  const proposal = run.messages?.find(
    (message) => message.id === input.messageId && message.proposal,
  );
  if (!proposal?.proposal) throw new Error("There is no such proposal");
  if (proposal.proposal.decision)
    throw new Error("This proposal has been answered already");
  const job = await openJob(run);
  await updateMessage(job, proposal.id, {
    proposal: {
      ...proposal.proposal,
      decision: input.accept ? "yes" : "no",
    },
    // accepted → it is work waiting for the agent, like a message
    ...(input.accept ? { status: "waiting" as const } : {}),
  });
  if (!input.accept) await agentSays(job, "OK, I left it as it is.");
}

// ── 2. What it changes ─────────────────────────────────────────────────────

// The router's answer, checked: only what is allowed now, a scene that
// exists, a layer only with its own scene. Returns the targets to do now, or
// nothing when the agent asked back or proposed instead.
export async function step7Route(
  job: Job,
  message: ChatMessage,
): Promise<{ targets: ChatTarget[]; reply: string } | undefined> {
  const allowed = ALLOWED[job.run.status] ?? [];
  const scenes = job.run.script?.scenes ?? [];
  const routed = await job.ai("routeMessage", () =>
    routeMessage(message, {
      status: job.run.status,
      allowed,
      hook: job.run.hook?.text,
      scenes,
      code: job.run.code,
    }),
  );
  const targets = validTargets(routed.targets, allowed, scenes.length, message);

  if (!targets.length) {
    // not clear, or not possible now: the agent's reply asks or explains
    await closeWork(job, message.id, { status: "done" }, routed.reply);
    return undefined;
  }
  // decision 3: a change that reaches several parts is proposed first – the
  // code holds to that even when the router did not ask for it
  if (routed.confirm || reachesFar(job.run, targets)) {
    await closeWork(job, message.id, { status: "done" }, routed.reply, {
      proposal: { targets },
    });
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
export async function step7Hooks(job: Job, instruction: string): Promise<void> {
  const chosen = job.run.template;
  if (!chosen) throw new Error("There is no template yet");
  const template = findTemplate(job, chosen.videoTemplateId);
  const hooks = await job.ai("writeHooks", () =>
    writeHooks(
      job.run.input,
      job.workspace,
      template,
      job.knowledge.hookFormulas,
      undefined,
      { previous: job.run.hooks ?? [], instruction },
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
export async function step7ToScript(
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
export async function step7Change(
  job: Job,
  target: ChatTarget,
): Promise<string[]> {
  const notes = await changeCode(job, target);
  // the earlier code is kept: the creator can go back
  return target.kind === "pictures" || target.kind === "motion" || target.kind === "words"
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
      ? rewriteCodeScenes(job, [...Array(count).keys()], `How it moves: ${instruction}`)
      : rewriteCodeScenes(job, [n], `How it moves: ${instruction}`);
  if (target.kind === "words" && n !== undefined)
    return step7Words(job, n, instruction);
  throw new Error(`I can't change "${target.kind}" now`);
}

// words: the scene's voiceover written again; its voice made again (when the
// video has one); its picture written again on the new words.
async function step7Words(
  job: Job,
  n: number,
  instruction: string,
): Promise<string[]> {
  const script = job.run.script;
  if (!script) throw new Error("There is no script");
  const words = await job.ai("rewriteScene", () =>
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

// ── Messages ───────────────────────────────────────────────────────────────

export async function updateMessage(
  job: Job,
  id: string,
  changes: Partial<ChatMessage>,
): Promise<void> {
  await job.save({
    messages: (job.run.messages ?? []).map((message) =>
      message.id === id ? { ...message, ...changes } : message,
    ),
  });
}

// The agent proposes changes on its own (the review): a proposal like the
// router's, answered by the same buttons.
export async function agentProposes(
  job: Job,
  text: string,
  targets: ChatTarget[],
  extra: Partial<ChatMessage> = {},
): Promise<void> {
  await agentSays(job, text, { ...extra, proposal: { targets } });
}

// `extra`: what else the message carries (a proposal, a review).
export async function agentSays(
  job: Job,
  text: string,
  extra: Partial<ChatMessage> = {},
): Promise<void> {
  await job.save({
    messages: [
      ...(job.run.messages ?? []),
      { id: newId("msg"), at: Date.now(), from: "agent", text, ...extra },
    ],
  });
}

// The work is done: its message (or proposal) "done" and the agent's answer,
// in one write – the panel never sees the one without the other.
export async function finishWork(
  job: Job,
  id: string,
  targets: ChatTarget[],
  reply: string,
  notes: string[],
): Promise<void> {
  await closeWork(
    job,
    id,
    { status: "done", targets },
    ["✓ " + reply, ...notes].join(" "),
  );
}

// It failed: the message is marked, the run is not – the user can write again.
export async function failWork(
  job: Job,
  id: string,
  error: unknown,
): Promise<void> {
  const text = error instanceof Error ? error.message : String(error);
  await closeWork(
    job,
    id,
    { status: "error", error: text },
    `That didn't work: ${text}`,
  );
}

// The work's message changed and the agent's answer (with a proposal, when
// it proposes) added, in one write.
async function closeWork(
  job: Job,
  id: string,
  changes: Partial<ChatMessage>,
  answer: string,
  extra: Partial<ChatMessage> = {},
): Promise<void> {
  await job.save({
    messages: [
      ...(job.run.messages ?? []).map((message) =>
        message.id === id ? { ...message, ...changes } : message,
      ),
      {
        id: newId("msg"),
        at: Date.now(),
        from: "agent",
        text: answer,
        ...extra,
      },
    ],
  });
}
