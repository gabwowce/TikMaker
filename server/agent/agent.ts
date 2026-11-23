import type { IdeaFromUser } from "../../src/agent/run/1-idea.js";
import type { ChooseHookFromUser } from "../../src/agent/run/2-angle.js";
import type {
  AnswerFromUser,
  ChatMessage,
  DecideFromUser,
  SendMessageFromUser,
} from "../../src/agent/run/7-chat.js";
import type { AgentRun } from "../../src/agent/run/run.js";
import {
  RESTING_STATUSES,
  type RunStatus,
} from "../../src/agent/run/status.js";
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
  updateMessage,
  userWrites,
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
//   1. WHAT THE USER DOES   start, userAnswers: every button of the panel –
//                           what it writes into the run, then to the agent
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

// ── THE FLOW: whose turn it is in each status ──────────────────────────────
//
// The status in the run's JSON decides who goes next. In a USER status the
// agent has stopped and waits: only the buttons listed below are accepted
// (USER_TURN). In an AGENT status the agent is working (runAgent) and the
// user only watches – or writes a message, which waits for its turn.
//
//   status              turn    what happens                         then
//   ──────────────────  ──────  ───────────────────────────────────  ─────────────────
//   created             AGENT   is the idea worth it → template →    awaiting_hook
//                               three hooks
//   awaiting_hook       USER    picks a hook (or "Change" template)  writing_script
//   writing_script      AGENT   the script, checked by code          awaiting_approval
//   awaiting_approval   USER    "Approve"                            generating_voice
//   generating_voice    AGENT   the voiceover                        laying_out
//   laying_out          AGENT   the pictures as code                 reviewing
//   reviewing           AGENT   looks at its own frames, fixes them  done
//   done                USER    the video is built; may write        –
//
//   at any step:
//   awaiting_answers    USER    answers the agent's questions        back where it asked
//   paused              USER    "Continue" (after a usage limit)     back where it stopped
//   error               –       stopped; the reason is on the panel  –
//
// A message ("message") and "Do it" / "No" ("decision") are accepted at any
// time: they wait in the conversation until the agent stops in a USER status
// and takes them up (part 3).

// The buttons accepted in each USER status. Anything else is refused.
const USER_TURN: Partial<Record<RunStatus, UserAnswer["kind"][]>> = {
  awaiting_hook: ["hook", "template"],
  awaiting_approval: ["approve"],
  awaiting_answers: ["answers", "message"],
  paused: ["continue"],
};
const ANY_TIME: UserAnswer["kind"][] = ["message", "decision"];

// ── 1. What the user does ──────────────────────────────────────────────────
// Every button in the agent's panel ends up here (server/trpc/agent.ts only
// finds the run). Start makes a new run; every other answer is written into
// the run's JSON right here, and then the run goes to the agent (part 4,
// continueRun), which works in the background while the panel keeps reading
// the file.

// Start: the form → a new run file in "created". runAgent takes it from there.
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

// Every other answer the user can give.
export type UserAnswer =
  | { kind: "template"; videoTemplateId: string } // screen 2: "Change"
  | { kind: "hook"; choice: ChooseHookFromUser } //   screen 2: a hook picked
  | { kind: "approve" } //                             screen 3: "Approve"
  | { kind: "message"; input: SendMessageFromUser } // a message, any time
  | { kind: "answers"; input: AnswerFromUser } //     the questions card
  | { kind: "decision"; input: DecideFromUser } //    "Do it" / "No"
  | { kind: "continue" }; //                          "Continue" on a paused run

// The answer → into the run's JSON → the run to the agent. A refused answer
// (wrong moment, no such hook) throws, and the panel shows why.
export async function userAnswers(
  run: AgentRun,
  answer: UserAnswer,
): Promise<void> {
  const job = await openJob(run);
  let refused: unknown;
  try {
    // Is it the user's turn for this button? (THE FLOW, above)
    const allowed = ANY_TIME.includes(answer.kind) || USER_TURN[run.status]?.includes(answer.kind);
    if (!allowed || run.status === "error" || run.status === "cancelled")
      throw new Error(`Not now: the run is "${run.status}"`);

    switch (answer.kind) {
      case "template": {
        // → runAgent "awaiting_hook": the hooks are for the old template, so
        //   it writes new ones
        angle.findTemplate(job, answer.videoTemplateId); // only one we know
        await job.save({
          template: { videoTemplateId: answer.videoTemplateId, pickedBy: "user" },
        });
        break;
      }

      case "hook": {
        // → runAgent "awaiting_hook": there is a hook now, so the script
        const { choice } = answer;
        if ("text" in choice) {
          // the user's own line
          await job.save({ hook: { text: choice.text, pickedBy: "user" } });
          break;
        }
        const picked = run.hooks?.[choice.hookIndex];
        if (!picked)
          throw new Error(`There is no hook number ${choice.hookIndex + 1}`);
        await job.save({
          hook: {
            text: picked.text,
            formulaId: picked.formulaId,
            firstFrame: picked.firstFrame,
            pickedBy: "agent",
          },
        });
        break;
      }

      case "approve": {
        // → runAgent "awaiting_approval": approved, so voice, pictures, review
        if (!run.script) throw new Error("There is no script to approve");
        await job.save({ script: { ...run.script, approved: true } });
        break;
      }

      case "message": {
        const { text, attachments } = answer.input;
        if (run.status === "awaiting_answers") {
          // the agent asked: a typed message answers every open question
          const asked = [...(run.messages ?? [])]
            .reverse()
            .find((m) => m.questions?.some((q) => !q.answer && !q.skipped));
          if (!asked?.questions) throw new Error("There are no open questions");
          await saveAnswers(job, asked.id, asked.questions.map((q) => ({ id: q.id, answer: text })));
          break;
        }
        // → it waits in the run ("waiting") until the agent stops where it
        //   can take it up: takeUpWork, part 3
        await userWrites(job, text, attachments?.length ? { attachments } : {});
        break;
      }

      case "answers": {
        // → runAgent goes back to the step that asked; it asks no more
        await saveAnswers(job, answer.input.messageId, answer.input.answers);
        break;
      }

      case "decision": {
        // "Do it" → the proposal is work waiting for the agent (part 3)
        const { messageId, accept } = answer.input;
        const asked = run.messages?.find((m) => m.id === messageId && m.proposal);
        if (!asked?.proposal) throw new Error("There is no such proposal");
        if (asked.proposal.decision)
          throw new Error("This proposal has been answered already");
        await updateMessage(job, messageId, {
          proposal: { ...asked.proposal, decision: accept ? "yes" : "no" },
          ...(accept ? { status: "waiting" as const } : {}),
        });
        if (!accept) await agentSays(job, "OK, I left it as it is.");
        break;
      }

      case "continue": {
        // → runAgent goes on from the status it was paused in
        await job.save({
          status: run.pausedFrom ?? "created",
          pausedFrom: undefined,
          error: undefined,
        });
        break;
      }
    }
  } catch (error) {
    refused = error;
  }
  // A refused message still wakes the agent up: after a server restart
  // nothing is working on the messages already waiting.
  if (!refused || answer.kind === "message") continueRun(job.run);
  if (refused) throw refused;
}

// The questions card's answers: into the agent's message that asked, the ones
// marked "remember" into the channel's knowledge (every later video gets
// them), and the run goes back to the status the step asked in – runAgent
// runs that step again, now with the answers in its prompt (job.ts).
async function saveAnswers(
  job: Job,
  messageId: string,
  given: AnswerFromUser["answers"],
): Promise<void> {
  const asked = job.run.messages?.find((m) => m.id === messageId && m.questions);
  if (!asked?.questions) throw new Error("There are no such questions");
  const byId = new Map(given.map((a) => [a.id, a]));
  const questions = asked.questions.map((question) => {
    const a = byId.get(question.id);
    const text = a?.answer?.trim();
    if (!a || !text || a.skipped) return { ...question, skipped: true };
    return { ...question, answer: text, ...(a.remember ? { remember: true } : {}) };
  });
  await ask.remember(
    job.run.input.workspaceId,
    questions.flatMap((q) => (q.remember ? [`${q.question} – ${q.answer}`] : [])),
  );
  await job.save({
    messages: (job.run.messages ?? []).map((m) =>
      m.id === asked.id ? { ...m, questions } : m,
    ),
    status: job.run.pausedFrom ?? "created",
    pausedFrom: undefined,
  });
}

// Undo on a code scene: its code goes back one version. Not while the agent
// works on the video, and nothing for the agent to do after.
export async function undoScene(run: AgentRun, sceneIndex: number) {
  if (!["done", "error", "paused"].includes(run.status))
    throw new Error("The agent is working on the video – undo when it stops");
  await undoCodeScene(await openJob(run), sceneIndex);
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
      if (stoppedToAsk(job)) return; // it asked the creator: wait for answers
      await angle.chooseTemplate(job); //                  may ask
      if (stoppedToAsk(job)) return; // it asked the creator: wait for answers
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
      const voiced =
        (job.run.voice?.scenes.length ?? 0) >= (job.run.script?.scenes.length ?? 0);
      if (job.run.input.generateVoice && !voiced) {
        await job.save({ status: "generating_voice" });
        await voice.voiceScenes(job);
      }
      if (!job.run.code) {
        await job.save({ status: "laying_out" });
        await writeCodeScenes(job);
      }
      // AGENT_SELF_REVIEW=off – a quick try of the rest, with no rendering
      if (process.env.AGENT_SELF_REVIEW !== "off") {
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

// A step asked the creator (steps/ask.ts) and set "awaiting_answers". A
// function, not an inline check: TypeScript would think the status cannot
// have changed since the case above – but the step just changed it.
const stoppedToAsk = (job: Job) => job.run.status === "awaiting_answers";

// 3 Script: written and checked by code, then the agent waits for Approve.
async function toScript(job: Job): Promise<void> {
  await job.save({ status: "writing_script" });
  await script.writeAndCheck(job); // may ask
  if (stoppedToAsk(job)) return; // it asked the creator: wait for answers
  await job.save({ status: "awaiting_approval" }); // WAIT: the user approves
}

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
// The agent works in the background: the user's request returns at once and
// the panel keeps reading the run's file. One worker per run – if a message
// arrives while the agent works, no second worker starts on the same file;
// `again` tells the one working to look once more when it finishes.
const working = new Set<string>();
const again = new Set<string>();

export function continueRun(run: AgentRun): void {
  if (working.has(run.id)) {
    again.add(run.id);
    return;
  }
  working.add(run.id);
  void (async () => {
    try {
      // runAgent does one stretch of work and stops where the agent waits for
      // the user. Again while something is left: a message that came in
      // meanwhile, or a proposal accepted meanwhile.
      let latest: AgentRun | undefined = run;
      while (latest) {
        again.delete(run.id);
        await runAgent(latest);
        latest = await getRun(run.id);
        const waitingWork =
          latest !== undefined &&
          nextWork(latest) !== undefined &&
          chat.TALK_STATUSES.includes(latest.status);
        if (!waitingWork && !again.has(run.id)) break;
      }
    } catch (error) {
      // the file is newer than `run` (steps logged since), so build on it
      const latest = (await getRun(run.id)) ?? run;
      const message = error instanceof Error ? error.message : String(error);
      if (isLimitError(error))
        // a usage limit: nothing is wrong – "Continue" goes on later
        await saveRun({ ...latest, status: "paused", pausedFrom: latest.status, error: message });
      // anything else stops the run, with the reason on the panel
      else await saveRun({ ...latest, status: "error", error: message });
    } finally {
      working.delete(run.id);
    }
  })();
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
