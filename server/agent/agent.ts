import type { ChatMessage } from "../../src/agent/run/7-chat.js";
import type { AgentRun } from "../../src/agent/run/run.js";
import { RESTING_STATUSES } from "../../src/agent/run/status.js";
import { Job, openJob } from "./job.js";
import { isLimitError, resumeStatus } from "./limits.js";
import { allRuns, getRun, saveRun } from "./runs.js";
import { step2Hooks, step2Template } from "./steps/2-angle.js";
import { step3Script } from "./steps/3-script.js";
import { step4Voice } from "./steps/4-voice.js";
import { step5Pictures } from "./steps/5-pictures.js";
import { step6SelfReview } from "./steps/6-self-review.js";
import {
  agentProposes,
  agentSays,
  failWork,
  finishWork,
  nextWork,
  step7Change,
  step7Hooks,
  step7Review,
  step7Route,
  step7ToScript,
  TALK_STATUSES,
} from "./steps/7-chat.js";
import type { ReviewResult } from "./tools/review.js";

// The whole agent on one page (screens: docs/d-planas.md). The steps, in the
// order they run (server/agent/steps/, one file each):
//
//   1 Idea         the user fills the form and presses Start
//   2 Angle        value check → template → hooks → WAIT: the user picks one
//   3 Script       facts → script → rules check (src/agent/rules) →
//                  WAIT: the user approves
//   4 Voice        the voiceover (ElevenLabs), so the pictures are timed to
//                  the real words
//   5 Pictures     every scene's picture as code (Claude Code with the skills)
//   6 Self-review  the agent looks at its own frames and fixes them → done
//   7 Chat         the user writes at any time; where the agent waits it takes
//                  the message up, changes what it is about and answers
//                  (docs/pokalbis-planas.md, docs/pokalbis-kodas.md)
//
// Not steps – tools several steps use (server/agent/tools/): asking the
// creator (ask.ts), looking at the frames (review.ts), rendering stills,
// code versions. The model itself is reached only through server/agent/ai/.

// One worker per run: a run already being worked on is not started a second
// time (a message sent while the agent works would otherwise start another
// worker on the same run). The worker sees `again` and looks once more when
// it finishes – which is how a message waiting from earlier is taken up.
const working = new Set<string>();
const again = new Set<string>();

// Called by agent.start and by every "the user answered" endpoint (a hook
// picked, the script approved, a message, a proposal answered). Works in the
// background; the panel keeps asking agent.get. Something fails → the run
// stops in "error" with the reason.
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
      // The usage limit: paused, not stopped – "Continue" goes on later.
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
      nextWork(latest) !== undefined && TALK_STATUSES.includes(latest.status);
    if (!pending && !again.has(run.id)) return;
    run = latest;
  }
}

// Which step comes next depends on where the run stopped. Statuses change
// only here; a step does its work and saves what it made.
async function runAgent(run: AgentRun): Promise<void> {
  const job = await openJob(run);
  switch (run.status) {
    case "created": // Start was pressed
      await job.save({ status: "picking_template" });
      await step2Template(job);
      if (asking(job)) return;
      await job.save({ status: "writing_hooks" });
      await step2Hooks(job);
      // A hook written in the form: nothing to wait for.
      if (job.run.hook) return toScript(job);
      await job.save({ status: "awaiting_hook" });
      return;

    case "awaiting_hook": // the user answered on screen 2
      if (job.run.hook) return toScript(job);
      if (job.run.hooksFor !== job.run.template?.videoTemplateId) {
        // "Change": the hooks were for another template – write new ones.
        await job.save({ status: "writing_hooks" });
        await step2Hooks(job);
        await job.save({ status: "awaiting_hook" });
        return;
      }
      return takeUpWork(job);

    case "awaiting_approval": // the user answered on screen 3
      // "Approve": on to building the video. The voiceover first (when the
      // form asked for it, and not again when every scene has one), so the
      // pictures are timed to the real words; then the pictures as code.
      if (job.run.script?.approved) {
        const voiced =
          (job.run.voice?.scenes.length ?? 0) >=
          (job.run.script?.scenes.length ?? 0);
        if (job.run.input.generateVoice && !voiced) {
          await job.save({ status: "generating_voice" });
          await step4Voice(job);
        }
        // Built already (a run continued after a pause): not built again.
        if (!job.run.code) {
          await job.save({ status: "laying_out" });
          await step5Pictures(job);
          if (asking(job)) return;
        }
        // The agent looks at its own frames and fixes them (FR-15, FR-16).
        if (selfReview()) {
          await job.save({ status: "reviewing" });
          await step6SelfReview(job);
        }
        await job.save({ status: "done" });
        return;
      }
      return takeUpWork(job);

    case "done": // the video is built; the user may still write
      return takeUpWork(job);

    case "awaiting_answers": // the agent asked; the questions card answers
      return;
  }
}

// "Continue" on a paused run: back to the nearest point the agent can start
// from, then on as usual.
export async function resumeRun(run: AgentRun): Promise<void> {
  if (run.status !== "paused") throw new Error("The run is not paused");
  await saveRun({
    ...run,
    status: resumeStatus(run.pausedFrom),
    pausedFrom: undefined,
    error: undefined,
  });
  continueRun((await getRun(run.id)) ?? run);
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
    const working = !RESTING_STATUSES.includes(run.status);
    if (!working && !cutOff) continue;
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
            // and takes it up from there (resumeStatus)
            pausedFrom: working ? run.status : "answering",
            error: "The server restarted while the agent was working.",
          }),
    });
  }
}

// The self-review at the end of the build: on unless AGENT_SELF_REVIEW=off
// (a quick try of the rest, with no rendering).
const selfReview = () => process.env.AGENT_SELF_REVIEW !== "off";

// 3 Script: written, checked, then the agent waits for the user's approval.
async function toScript(job: Job): Promise<void> {
  await job.save({ status: "writing_script" });
  await step3Script(job);
  if (asking(job)) return;
  await job.save({ status: "awaiting_approval" });
}

// A step stopped to ask the creator (tools/ask.ts): the run waits for the
// answers instead of going on.
const asking = (job: Job) => job.run.status === "awaiting_answers";

// 7 The conversation: the next message (routed first) or accepted proposal.
async function takeUpWork(job: Job): Promise<void> {
  const item = nextWork(job.run);
  if (!item) return;
  if (item.from === "user") {
    const routed = await step7Route(job, item);
    // the agent asked back, or proposed and waits for the buttons
    if (!routed) return;
    return doTargets(job, item, routed.targets, routed.reply);
  }
  // an accepted proposal: its targets are known
  const targets = item.proposal?.targets ?? [];
  await job.save({
    messages: (job.run.messages ?? []).map((message) =>
      message.id === item.id ? { ...message, status: "working" } : message,
    ),
  });
  return doTargets(job, item, targets, item.text);
}

// The targets, one by one, with the statuses the panel follows. A hook is
// done alone: it sends the user back to picking a hook, after which the
// script and everything else follow from the new one.
async function doTargets(
  job: Job,
  item: ChatMessage,
  targets: ChatMessage["targets"] & {},
  reply: string,
): Promise<void> {
  const from = job.run.status;
  const notes: string[] = [];
  let review: ReviewResult | undefined;
  try {
    const hook = targets.find((target) => target.kind === "hook");
    if (hook) {
      await job.save({ status: "writing_hooks" });
      await step7Hooks(job, hook.instruction ?? item.text);
      await job.save({ status: "awaiting_hook" });
    } else {
      if (from === "done") await job.save({ status: "answering" });
      for (const target of targets) {
        if (target.kind === "script") {
          await step7ToScript(job, target.instruction ?? item.text);
          await toScript(job);
        } else if (target.kind === "review") {
          review = await step7Review(job);
        } else notes.push(...(await step7Change(job, target)));
      }
      if (from === "done") await job.save({ status: "done" });
    }
    await finishWork(job, item.id, targets, reply, notes);
    // the review: its list, and its fixes proposed – done only on "Do it"
    if (review) {
      const list = { scenes: review.scenes };
      if (review.targets.length)
        await agentProposes(job, review.text, review.targets, {
          review: { ...list, next: "proposed" },
        });
      else await agentSays(job, review.text, { review: { ...list, next: "done" } });
    }
  } catch (error) {
    // the run goes back to where it waited; only the message failed
    await job.save({ status: from });
    await failWork(job, item.id, error);
  }
}
