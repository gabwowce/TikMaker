import type { IdeaFromUser } from "../../src/agent/run/1-idea.js";
import type { ChooseHookFromUser } from "../../src/agent/run/2-angle.js";
import type {
  AnswerFromUser,
  ChatMessage,
  DecideFromUser,
  SendMessageFromUser,
} from "../../src/agent/run/7-chat.js";
import type { AgentRun } from "../../src/agent/run/run.js";
import { RESTING_STATUSES } from "../../src/agent/run/status.js";
import { newId } from "../ids.js";
import { undoCodeScene, writeCodeScenes } from "./codeScenes.js";
import { openJob, type Job } from "./job.js";
import { isLimitError } from "./limits.js";
import {
  agentProposes,
  agentSays,
  failWork,
  finishWork,
  nextWork,
} from "./messages.js";
import { allRuns, getRun, saveRun } from "./runs.js";
import * as angle from "./steps/angle.js";
import * as ask from "./steps/ask.js";
import * as chat from "./steps/chat.js";
import * as review from "./steps/review.js";
import * as script from "./steps/script.js";
import * as voice from "./steps/voice.js";

// ════════════════════════════════════════════════════════════════════════════
// THE AGENT ON ONE PAGE – start here; every name below leads to the rest.
// ════════════════════════════════════════════════════════════════════════════
//
// A run is one JSON file, db/agent-runs/<id>.json (runs.ts): the form, the
// status (where the run is), everything each step made, the conversation and
// a log of every model call. The editor's panel reads that file every few
// seconds (agent.get), so whatever is saved there the user sees.
//
//   1. WHAT THE USER DOES   the panel's buttons → server/trpc/agent.ts → here:
//                           save the answer, hand the run to the agent
//   2. THE WORKFLOW         runAgent: from the status, the next step
//   3. A MESSAGE            takeUpWork: the router decides what it changes,
//                           then the step for each change does it
//   4. THE WORKER           one per run; a usage limit or a restart pauses it
//
// Where the rest lives:
//   steps/angle.ts      is the idea worth it · template · three hooks
//   steps/script.ts     research · the script · its check by code
//   steps/voice.ts      the voiceover (ElevenLabs)
//   codeScenes.ts       the pictures as code (Claude Code) · its check by code
//   steps/review.ts     the agent looks at its own frames and fixes them
//   steps/chat.ts       a message: what it changes, and each change
//   steps/ask.ts        a step asks the creator instead of guessing
//   messages.ts         everything that writes into the conversation
//   prompts/*.ts        what each model call is told (one file per call)
//   llm.ts              the one door to a model: schema, retries, log
//   job.ts              what every step works with (run, knowledge, save, ai)
//
// What code checks, not AI:
//   the answer's shape          llm.ts (Zod schema, asked again up to 3 times)
//   the script                  src/agent/rules/checkScript.ts (length, words)
//   the pictures' code          codeScenes.ts checkScenes (file, export, tsc)
//   a message's changes         steps/chat.ts validTargets (allowed now, scene)
// ════════════════════════════════════════════════════════════════════════════

// ── 1. What the user does ──────────────────────────────────────────────────
// Each one saves the user's answer in the run and hands the run back to the
// agent (continueRun), which works in the background.

// Start: the form → a new run in "created".
export async function start(
  projectId: string,
  input: IdeaFromUser,
): Promise<AgentRun> {
  const run: AgentRun = {
    id: newId("run"),
    projectId,
    input,
    status: "created",
    steps: [],
    createdAt: Date.now(),
  };
  await saveRun(run);
  continueRun(run);
  return run;
}

// Screen 2: another template instead of the agent's pick ("Change").
export async function changeTemplate(run: AgentRun, videoTemplateId: string) {
  await angle.saveTemplate(run, videoTemplateId);
  await goOn(run);
}

// Screen 2: one of the three hooks, or the user's own line.
export async function chooseHook(run: AgentRun, choice: ChooseHookFromUser) {
  await angle.saveHook(run, choice);
  await goOn(run);
}

// Screen 3: "Approve" – on to building the video.
export async function approveScript(run: AgentRun) {
  await script.saveApproval(run);
  await goOn(run);
}

// A message, at any time. While the agent waits for answers it is the answer;
// otherwise it waits in the run until the agent can take it up (part 3).
export async function sendMessage(run: AgentRun, input: SendMessageFromUser) {
  try {
    if (run.status === "awaiting_answers")
      await ask.answerFromMessage(run, input.text);
    else await chat.saveMessage(run, input);
  } finally {
    // even when the message is refused: after a server restart nothing is
    // working on the ones already waiting, and this wakes the agent up for
    // them (continueRun never starts a second worker)
    await goOn(run);
  }
}

// The questions card: the step that asked runs again with the answers.
export async function answerQuestions(run: AgentRun, input: AnswerFromUser) {
  await ask.saveAnswers(run, input);
  await goOn(run);
}

// "Do it" / "No" on the agent's proposal.
export async function decide(run: AgentRun, input: DecideFromUser) {
  await chat.saveDecision(run, input);
  await goOn(run);
}

// "Continue" on a paused run: back to the status it was paused in, and
// runAgent goes on from there.
export async function resumeRun(run: AgentRun): Promise<void> {
  if (run.status !== "paused") throw new Error("The run is not paused");
  await saveRun({
    ...run,
    status: run.pausedFrom ?? "created",
    pausedFrom: undefined,
    error: undefined,
  });
  await goOn(run);
}

// Undo on a code scene: its code goes back one version. Not while the agent
// works on the video.
export async function undoScene(run: AgentRun, sceneIndex: number) {
  if (!["done", "error", "paused"].includes(run.status))
    throw new Error("The agent is working on the video – undo when it stops");
  await undoCodeScene(await openJob(run), sceneIndex);
}

// The run as saved just now, to the agent.
async function goOn(run: AgentRun) {
  continueRun((await getRun(run.id)) ?? run);
}

// ── 2. The workflow ────────────────────────────────────────────────────────
// Which step comes next depends on where the run stopped. A waiting status
// (awaiting_*) is where the user answered; a working status (writing_script,
// laying_out…) is where a run was cut off – a usage limit, a restart, or the
// agent's questions answered – and it goes on with the stage it belongs to.
// Every step is skipped when the run already has what it makes (the `if`s
// below), so going on again only does the missing work.
async function runAgent(run: AgentRun): Promise<void> {
  const job = await openJob(run);
  switch (run.status) {
    case "created": //          Start was pressed
    case "picking_template": // cut off while picking the template
    case "writing_hooks": //    or writing the hooks
      await job.save({ status: "picking_template" });
      if (!job.run.value) await angle.judgeValue(job); // may ask
      if (asking(job)) return;
      await angle.chooseTemplate(job); //                  may ask
      if (asking(job)) return;
      await job.save({ status: "writing_hooks" });
      await angle.offerHooks(job);
      // a hook written in the form: nothing to wait for
      if (job.run.hook) return toScript(job);
      await job.save({ status: "awaiting_hook" });
      return; //                        WAIT: the user picks a hook

    case "awaiting_hook": //  the user answered on screen 2
    case "writing_script": // cut off while writing the script
      if (job.run.hook) return toScript(job);
      if (job.run.hooksFor !== job.run.template?.videoTemplateId) {
        // "Change": the hooks were for another template – new ones
        await job.save({ status: "writing_hooks" });
        await angle.offerHooks(job);
        await job.save({ status: "awaiting_hook" });
        return;
      }
      return takeUpWork(job);

    case "awaiting_approval": // the user answered on screen 3
    case "generating_voice": //  cut off while building
    case "laying_out":
    case "reviewing":
      if (!job.run.script?.approved) return takeUpWork(job);
      // "Approve": the voice first, so the pictures are timed to the real
      // words; then the pictures as code; then the agent checks its frames
      if (job.run.input.generateVoice && !voiced(job.run)) {
        await job.save({ status: "generating_voice" });
        await voice.voiceScenes(job);
      }
      if (!job.run.code) {
        await job.save({ status: "laying_out" });
        await writeCodeScenes(job);
      }
      if (selfReview()) {
        await job.save({ status: "reviewing" });
        await review.selfReview(job); // looks → fixes → looks, ≤3 rounds
      }
      await job.save({ status: "done" });
      return;

    case "done": //      the video is built; the user may still write
    case "answering": // cut off while on a message after the build
      // back to done first: the message's work starts from done and ends there
      if (job.run.status === "answering") await job.save({ status: "done" });
      return takeUpWork(job);

    case "awaiting_answers": // the agent asked; the questions card answers
      return;
  }
}

// 3 Script: written and checked by code, then the agent waits for Approve.
async function toScript(job: Job): Promise<void> {
  await job.save({ status: "writing_script" });
  await script.writeAndCheck(job); // may ask
  if (asking(job)) return;
  await job.save({ status: "awaiting_approval" }); // WAIT: the user approves
}

// A step stopped to ask the creator (steps/ask.ts): the run waits for the
// answers instead of going on.
const asking = (job: Job) => job.run.status === "awaiting_answers";

// Every scene of the script has its voiceover already.
const voiced = (run: AgentRun) =>
  (run.voice?.scenes.length ?? 0) >= (run.script?.scenes.length ?? 0);

// The self-review at the end of the build: on unless AGENT_SELF_REVIEW=off
// (a quick try of the rest, with no rendering).
const selfReview = () => process.env.AGENT_SELF_REVIEW !== "off";

// ── 3. A message ───────────────────────────────────────────────────────────
// The next message (routed first) or an accepted proposal, at a point where
// the agent waits (chat.TALK_STATUSES).
async function takeUpWork(job: Job): Promise<void> {
  const item = nextWork(job.run);
  if (!item) return;
  if (item.from === "user") {
    // the router (a small Sonnet call) says what the message changes
    const routed = await chat.route(job, item);
    // it asked back, or proposed and waits for the buttons
    if (!routed) return;
    return doTargets(job, item, routed.targets, routed.reply);
  }
  // an accepted proposal: its targets are known
  await job.save({
    messages: (job.run.messages ?? []).map((message) =>
      message.id === item.id ? { ...message, status: "working" } : message,
    ),
  });
  return doTargets(job, item, item.proposal?.targets ?? [], item.text);
}

// The changes, one by one. A hook goes alone: it sends the user back to
// picking a hook, and the script and the rest follow from the new one.
async function doTargets(
  job: Job,
  item: ChatMessage,
  targets: ChatMessage["targets"] & {},
  reply: string,
): Promise<void> {
  const from = job.run.status;
  const notes: string[] = [];
  let found: review.ReviewResult | undefined;
  try {
    const hook = targets.find((target) => target.kind === "hook");
    if (hook) {
      await job.save({ status: "writing_hooks" });
      await chat.rewriteHooks(job, hook.instruction ?? item.text);
      await job.save({ status: "awaiting_hook" });
    } else {
      if (from === "done") await job.save({ status: "answering" });
      for (const target of targets) {
        if (target.kind === "script") {
          await chat.commentScript(job, target.instruction ?? item.text);
          await toScript(job);
        } else if (target.kind === "review") {
          found = await review.reviewOnRequest(job);
        } else notes.push(...(await chat.change(job, target))); // pictures, motion, words
      }
      if (from === "done") await job.save({ status: "done" });
    }
    await finishWork(job, item.id, targets, reply, notes);
    // the review: its list, and its fixes proposed – done only on "Do it"
    if (found) {
      const list = { scenes: found.scenes };
      if (found.targets.length)
        await agentProposes(job, found.text, found.targets, {
          review: { ...list, next: "proposed" },
        });
      else await agentSays(job, found.text, { review: { ...list, next: "done" } });
    }
  } catch (error) {
    // the run goes back to where it waited; only the message failed
    await job.save({ status: from });
    await failWork(job, item.id, error);
  }
}

// ── 4. The worker ──────────────────────────────────────────────────────────
// One worker per run: a run already being worked on is not started a second
// time (a message sent while the agent works would otherwise start another
// worker on the same run). The worker sees `again` and looks once more when
// it finishes – which is how a message waiting from earlier is taken up.
const working = new Set<string>();
const again = new Set<string>();

// Called after every answer of the user (part 1). Works in the background;
// the panel keeps asking agent.get. A usage limit pauses the run ("Continue"
// goes on later); anything else stops it in "error" with the reason.
export function continueRun(run: AgentRun): void {
  if (working.has(run.id)) {
    again.add(run.id);
    return;
  }
  working.add(run.id);
  void work(run)
    .catch(async (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      // The file is newer than `run` (steps logged since), so build on it.
      const latest = (await getRun(run.id)) ?? run;
      if (isLimitError(error))
        await saveRun({
          ...latest,
          status: "paused",
          pausedFrom: latest.status,
          error: message,
        });
      else await saveRun({ ...latest, status: "error", error: message });
    })
    .finally(() => working.delete(run.id));
}

// Runs the agent until it waits for the user with nothing left to take up.
async function work(first: AgentRun): Promise<void> {
  let run = first;
  for (;;) {
    again.delete(run.id);
    await runAgent(run);
    const latest = await getRun(run.id);
    if (!latest) return;
    const pending =
      nextWork(latest) !== undefined &&
      chat.TALK_STATUSES.includes(latest.status);
    if (!pending && !again.has(run.id)) return;
    run = latest;
  }
}

// At server start: a run left in a working status had its worker in the
// server that stopped (a restart, a crash), so nobody goes on with it. It is
// paused the same way as at the usage limit – "Continue" picks it up from
// where it was, and what it made before is kept.
// A message the agent was on ("working") is put back in the queue
// ("waiting"), so Continue takes it up again – nextWork only looks at waiting
// ones, and a message left "working" stayed "The agent is on it…" for good.
// That counts as interrupted work even when the run's status rests (a change
// asked for after the video was built).
export async function pauseInterruptedRuns(): Promise<void> {
  for (const run of await allRuns()) {
    const messages = run.messages ?? [];
    const cutOff = messages.some((message) => message.status === "working");
    const busy = !RESTING_STATUSES.includes(run.status);
    if (!busy && !cutOff) continue;
    await saveRun({
      ...run,
      messages: messages.map((message) =>
        message.status === "working"
          ? { ...message, status: "waiting" }
          : message,
      ),
      ...(run.status === "paused"
        ? {}
        : {
            status: "paused",
            // a message cut off on a built video: Continue goes back to done
            // and takes it up from there (runAgent, "answering")
            pausedFrom: busy ? run.status : "answering",
            error: "The server restarted while the agent was working.",
          }),
    });
  }
}
