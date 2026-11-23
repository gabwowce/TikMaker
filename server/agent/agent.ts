import type { IdeaFromUser } from "../../src/agent/run/1-idea.js";
import type { ChatMessage, ChatTarget } from "../../src/agent/run/7-chat.js";
import type { AgentRun } from "../../src/agent/run/run.js";
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
import { inBackground } from "./worker.js";

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
  try {
    await saveAnswer(job, answer);
  } catch (refused) {
    // after a server restart nothing works on the messages already waiting:
    // any message wakes the agent up for them
    if (answer.kind === "message") goOn(run.id);
    throw refused;
  }
  goOn(run.id);
}

export async function undoScene(run: AgentRun, sceneIndex: number): Promise<void> {
  if (!["done", "error", "paused"].includes(run.status))
    throw new Error("The agent is working on the video – undo when it stops");
  await undoCodeScene(await openJob(run), sceneIndex);
}

// ── The agent ──────────────────────────────────────────────────────────────

function goOn(runId: string): void {
  inBackground(runId, async () => {
    let run = await getRun(runId);
    while (run) {
      await next(await openJob(run));
      run = await getRun(runId);
      if (!run || !hasWorkWaiting(run)) break;
    }
  });
}

async function next(job: Job): Promise<void> {
  const { status, hook, hooksFor, template, script } = job.run;
  switch (status) {
    case "created":
    case "picking_template":
    case "writing_hooks":
      return makeHooks(job);

    case "awaiting_hook":
      if (hook) return makeScript(job);
      if (hooksFor !== template?.videoTemplateId) return makeHooks(job);
      return talk(job);

    case "writing_script":
      return makeScript(job);

    case "awaiting_approval":
      if (script?.approved) return makeVideo(job);
      return talk(job);

    case "generating_voice":
    case "laying_out":
    case "reviewing":
      return makeVideo(job);

    case "answering":
      await job.save({ status: "done" });
      return talk(job);

    case "done":
      return talk(job);
  }
}

async function makeHooks(job: Job): Promise<void> {
  await job.save({ status: "picking_template" });
  if (!job.run.value) await angle.judgeValue(job);
  if (askedCreator(job)) return;
  if (!job.run.template) await angle.chooseTemplate(job);
  if (askedCreator(job)) return;

  await job.save({ status: "writing_hooks" });
  await angle.offerHooks(job);
  if (job.run.hook) return makeScript(job);

  await job.save({ status: "awaiting_hook" });
}

async function makeScript(job: Job): Promise<void> {
  await job.save({ status: "writing_script" });
  await script.writeAndCheck(job);
  if (askedCreator(job)) return;

  await job.save({ status: "awaiting_approval" });
}

async function makeVideo(job: Job): Promise<void> {
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

  if (work.from === "user") {
    const routed = await chat.route(job, work);
    if (!routed) return; // it asked back, or proposed and waits for "Do it"
    return makeChanges(job, work, routed.targets, routed.reply);
  }

  // a proposal the user accepted with "Do it"
  await updateMessage(job, work.id, { status: "working" });
  return makeChanges(job, work, work.proposal?.targets ?? [], work.text);
}

async function makeChanges(
  job: Job,
  work: ChatMessage,
  targets: ChatTarget[],
  reply: string,
): Promise<void> {
  const waitedIn = job.run.status;
  const notes: string[] = [];
  let found: review.ReviewResult | undefined;
  try {
    const hook = targets.find((t) => t.kind === "hook");
    if (hook) {
      await job.save({ status: "writing_hooks" });
      await chat.rewriteHooks(job, hook.instruction ?? work.text);
      await job.save({ status: "awaiting_hook" });
    } else {
      if (waitedIn === "done") await job.save({ status: "answering" });
      for (const target of targets) {
        if (target.kind === "script") {
          await chat.commentScript(job, target.instruction ?? work.text);
          await makeScript(job);
        } else if (target.kind === "review") {
          found = await review.reviewOnRequest(job);
        } else {
          notes.push(...(await chat.change(job, target)));
        }
      }
      if (waitedIn === "done") await job.save({ status: "done" });
    }
    await finishWork(job, work.id, targets, reply, notes);
    if (found) await reportReview(job, found);
  } catch (error) {
    await job.save({ status: waitedIn });
    await failWork(job, work.id, error);
  }
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

const hasWorkWaiting = (run: AgentRun) =>
  nextWork(run) !== undefined && chat.TALK_STATUSES.includes(run.status);
