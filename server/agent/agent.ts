import type { IdeaFromUser } from "../../src/agent/run/1-idea.js";
import type { ChatMessage, ChatTarget } from "../../src/agent/run/7-chat.js";
import type { AgentRun } from "../../src/agent/run/run.js";
import type { RunStatus } from "../../src/agent/run/status.js";
import { newId } from "../ids.js";
import { saveAnswer, type UserAnswer } from "./answers.js";
import { undoCodeScene, writeCodeScenes } from "./codeScenes.js";
import { openJob, type Job } from "./job.js";
import {
  agentProposes,
  agentSays,
  failWork,
  finishWork,
  nextWork,
  updateMessage,
} from "./messages.js";
import { getRun, saveRun } from "./runs.js";
import * as angle from "./steps/angle.js";
import * as chat from "./steps/chat.js";
import * as review from "./steps/review.js";
import * as script from "./steps/script.js";
import * as voice from "./steps/voice.js";
import { stopRun } from "./worker.js";

export type { UserAnswer };

// ── The user ───────────────────────────────────────────────────────────────

export async function start(projectId: string, input: IdeaFromUser): Promise<AgentRun> {
  const run: AgentRun = {
    id: newId("run"),
    projectId,
    input,
    status: "created",
    steps: [],
    createdAt: Date.now(),
  };
  await saveRun(run);
  goOn(run.id);
  return run;
}

export async function answer(run: AgentRun, answer: UserAnswer): Promise<void> {
  const job = await openJob(run);
  await saveAnswer(job, answer);
  goOn(run.id);
}

export async function undoScene(run: AgentRun, sceneIndex: number): Promise<void> {
  if (!["done", "error", "paused"].includes(run.status))
    throw new Error("The agent is working on the video – undo when it stops");
  await undoCodeScene(await openJob(run), sceneIndex);
}

// ── The agent ──────────────────────────────────────────────────────────────

const working = new Set<string>();

function goOn(runId: string): void {
  if (working.has(runId)) return;
  working.add(runId);

  const work = async () => {
    const run = await getRun(runId);
    if (run) await next(await openJob(run));
  };

  work()
    .catch((error) => stopRun(runId, error))
    .finally(() => working.delete(runId));
}

async function next(job: Job): Promise<void> {
  const { status, hook, hooksFor, template, script } = job.run;
  switch (status) {
    case "created":
    case "picking_template":
    case "writing_hooks":
      return ideaToHooks(job);

    case "awaiting_hook":
      if (hook) return hookToScript(job);
      if (hooksFor !== template?.videoTemplateId) return ideaToHooks(job);
      return talk(job);

    case "writing_script":
      return hookToScript(job);

    case "awaiting_approval":
      if (script?.approved) return scriptToVideo(job);
      return talk(job);

    case "generating_voice":
    case "laying_out":
    case "reviewing":
      return scriptToVideo(job);

    case "answering": // cut off while on a message: back where it waited, then the message again
      await job.save({ status: job.run.code ? "done" : job.run.script ? "awaiting_approval" : "awaiting_hook" });
      return next(job);

    case "done":
      return talk(job);
  }
}

async function ideaToHooks(job: Job): Promise<void> {
  await job.save({ status: "picking_template" });
  if (!job.run.value) await angle.judgeValue(job);
  if (askedCreator(job)) return;
  if (!job.run.template) await angle.chooseTemplate(job);
  if (askedCreator(job)) return;

  await job.save({ status: "writing_hooks" });
  await angle.offerHooks(job);
  if (job.run.hook) return hookToScript(job);

  await job.save({ status: "awaiting_hook" });
}

async function hookToScript(job: Job): Promise<void> {
  await job.save({ status: "writing_script" });
  await script.writeAndCheck(job);
  if (askedCreator(job)) return;

  await job.save({ status: "awaiting_approval" });
}

async function scriptToVideo(job: Job): Promise<void> {
  if (job.run.input.generateVoice && !allScenesVoiced(job.run)) {
    await job.save({ status: "generating_voice" });
    await voice.voiceScenes(job);
  }
  if (!job.run.code) {
    await job.save({ status: "laying_out" });
    await writeCodeScenes(job);
  }
  if (selfReviewOn()) {
    await job.save({ status: "reviewing" });
    await review.selfReview(job);
  }
  await job.save({ status: "done" });
}

// ── A message ──────────────────────────────────────────────────────────────

async function talk(job: Job): Promise<void> {
  const work = nextWork(job.run);
  if (!work) return;

  // while the agent is on the message, the panel's buttons and box are locked
  const waitedIn = job.run.status;
  await job.save({ status: "answering" });
  try {
    if (work.from === "user") {
      const routed = await chat.route(job, work, waitedIn);
      if (routed) await makeChanges(job, work, routed.targets, routed.reply, waitedIn);
    } else {
      // a proposal the user accepted with "Do it"
      await updateMessage(job, work.id, { status: "working" });
      await makeChanges(job, work, work.proposal?.targets ?? [], work.text, waitedIn);
    }
  } catch (error) {
    await failWork(job, work.id, error, waitedIn);
  }
}

// Each change by the step that makes it. The answer goes in last, with the
// status the agent waits in next – so a button in the answer can be pressed.
async function makeChanges(
  job: Job,
  work: ChatMessage,
  targets: ChatTarget[],
  reply: string,
  waitedIn: RunStatus,
): Promise<void> {
  const notes: string[] = [];
  let found: review.ReviewResult | undefined;

  const hook = targets.find((t) => t.kind === "hook");
  if (hook) {
    await job.save({ status: "writing_hooks" });
    await chat.rewriteHooks(job, hook.instruction ?? work.text);
    await job.save({ status: "awaiting_hook" });
  } else {
    for (const target of targets) {
      if (target.kind === "script") {
        await chat.commentScript(job, target.instruction ?? work.text);
        await hookToScript(job);
      } else if (target.kind === "review") {
        found = await review.reviewOnRequest(job);
      } else {
        notes.push(...(await chat.change(job, target)));
      }
    }
  }
  const waitsIn = job.run.status === "answering" ? waitedIn : job.run.status;
  await finishWork(job, work.id, targets, reply, notes, waitsIn);
  if (found) await reportReview(job, found);
}

async function reportReview(job: Job, found: review.ReviewResult): Promise<void> {
  const scenes = found.scenes;
  if (found.targets.length)
    await agentProposes(job, found.text, found.targets, { review: { scenes, next: "proposed" } });
  else await agentSays(job, found.text, { review: { scenes, next: "done" } });
}

// ── Small checks ───────────────────────────────────────────────────────────

// a function, so TypeScript reads the status again after the step changed it
const askedCreator = (job: Job) => job.run.status === "awaiting_answers";

const allScenesVoiced = (run: AgentRun) =>
  (run.voice?.scenes.length ?? 0) >= (run.script?.scenes.length ?? 0);

const selfReviewOn = () => process.env.AGENT_SELF_REVIEW !== "off";
