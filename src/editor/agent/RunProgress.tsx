import { Button, Loader } from "@mantine/core";
import { Fragment } from "react";
import type { AgentRun } from "../../agent/run/run";
import type { RunStatus } from "../../agent/run/status";
import { useAgentRun, useResume } from "../../api/agent";
import { BuildCard } from "./BuildCard";
import { VoiceCard } from "./VoiceCard";
import { HookCard } from "./HookCard";
import { ChatMessages } from "./ChatMessages";
import { ScriptCard } from "./ScriptCard";
import { TemplateCard } from "./TemplateCard";
import { WorkingLine } from "./WorkingLine";
// The run's road as the user sees it: the plan's five steps, and which
// statuses mean "this step is happening now". Idea is done once Start is
// pressed; waiting for the user (awaiting_*) belongs to the step whose answer
// is being waited for.
const STEPS: { label: string; statuses: RunStatus[] }[] = [
  { label: "Idea", statuses: [] },
  {
    label: "Angle",
    statuses: ["created", "picking_template", "writing_hooks", "awaiting_hook"],
  },
  { label: "Script", statuses: ["writing_script", "awaiting_approval"] },
  { label: "Building", statuses: ["generating_voice", "laying_out", "checking"] },
  { label: "Result", statuses: ["reviewing"] },
];
// Which step the run is on. Shared with the collapsed rail's dots, so both
// count the same way.
export function runRoad(run: AgentRun) {
  // paused: on the step it was paused in
  const status =
    run.status === "paused" || run.status === "awaiting_answers"
      ? (run.pausedFrom ?? run.status)
      : run.status;
  const found = STEPS.findIndex((step) => step.statuses.includes(status));
  // done = every step finished. error/cancelled are not on the road: the bar
  // stays on Angle, the first step the agent works on, and the error line
  // says why it stopped.
  // Changing a scene comes after the video is built: every step stays done.
  const built = run.status === "done" || run.status === "answering";
  const active = built ? STEPS.length : found === -1 ? 1 : found;
  return { steps: STEPS, active };
}

// The five steps in a row: done ones ticked, the current one ringed. Each
// step's line runs back to the previous dot, under both dots (z-index), so it
// joins them instead of crossing them.
function RoadBar({ run }: { run: AgentRun }) {
  const { steps, active } = runRoad(run);
  return (
    <ol className="m-0 flex list-none p-0">
      {steps.map((step, index) => (
        <li
          key={step.label}
          className="relative flex flex-1 flex-col items-center gap-1"
        >
          {index > 0 ? (
            <span
              className={`absolute top-[11px] right-1/2 z-0 h-0.5 w-full ${index <= active ? "bg-editor-accent" : "bg-editor-border"}`}
            />
          ) : null}
          <span
            className={`relative z-10 flex size-6 items-center justify-center rounded-full border-2 border-solid text-[11px] font-semibold ${
              index < active
                ? "border-editor-accent bg-editor-accent text-white"
                : index === active
                  ? "border-editor-accent bg-editor-panel text-editor-text"
                  : "border-editor-border bg-editor-panel text-editor-muted"
            }`}
          >
            {index < active ? "✓" : index + 1}
          </span>
          <span
            className={`text-xs ${index <= active ? "text-editor-text" : "text-editor-muted"}`}
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

// What the user asked for, as the first message of the conversation, with the
// form's choices underneath so the run explains itself later too.
function IdeaBubble({ run }: { run: AgentRun }) {
  const {
    idea,
    targetSeconds,
    withFace,
    motionOnly,
    videoTemplateId,
    generateVoice,
  } = run.input;
  const notes = [
    `${targetSeconds} s`,
    withFace ? "with face" : "faceless",
    videoTemplateId ? "template chosen" : "AI picks the template",
    ...(motionOnly ? ["motion only"] : []),
    ...(generateVoice ? ["voiceover"] : []),
  ];
  return (
    <div className="ml-6 flex flex-col gap-1 rounded-2xl rounded-br-none bg-editor-panel-raised px-3 py-2">
      <span className="text-sm text-editor-text">{idea}</span>
      <span className="text-xs text-editor-muted">
        Idea · {notes.join(" · ")}
      </span>
    </div>
  );
}

// The run being shown, asked for again every second until it settles.
export function RunProgress({ runId }: { runId: string }) {
  const { data: run } = useAgentRun(runId);
  if (!run) return <Loader size="sm" />;

  // The conversation in time order: each step's card where its step ended,
  // the agent's and the user's messages between them – what is happening
  // now (a step at work) at the bottom.
  const cards = cardTimes(run);
  let since = -Infinity;
  return (
    <div className="flex flex-col gap-5">
      <RoadBar run={run} />
      <IdeaBubble run={run} />
      {cards.map(({ key, at, card }, i) => {
        const before = (
          <ChatMessages run={run} from={since} to={at} watch={i === 0} />
        );
        since = at;
        return (
          <Fragment key={key}>
            {before}
            {card}
          </Fragment>
        );
      })}
      <ChatMessages run={run} from={since} watch={false} />
      <ReviewingLine run={run} />
      <PausedCard run={run} />
      {run.status === "error" ? (
        <p className="m-0 text-xs text-red-400">{run.error ?? "Failed"}</p>
      ) : null}
    </div>
  );
}

// When each step's card belongs in the conversation: when the step last
// ended (its log entry); a step at work right now – at the end.
function cardTimes(run: AgentRun) {
  const ended = (name: string) => {
    const steps = run.steps.filter((step) => step.name === name);
    const last = steps[steps.length - 1];
    return last ? last.startedAt + (last.ms ?? 0) : undefined;
  };
  const firstEnd = (name: string) => {
    const step = run.steps.find((s) => s.name === name);
    return step ? step.startedAt + (step.ms ?? 0) : undefined;
  };
  const now = (statuses: RunStatus[]) => statuses.includes(run.status);
  const template = ended("pickTemplate") ?? -1;
  const hooks = ended("writeHooks") ?? template;
  const script = now(["writing_script"])
    ? Infinity
    : (ended("writeScript") ?? hooks);
  const build = now(["laying_out"])
    ? Infinity
    : (firstEnd("writeCode") ?? Infinity);
  const codeStart = run.steps.find((s) => s.name === "writeCode")?.startedAt;
  const voice = now(["generating_voice"])
    ? Infinity
    : codeStart !== undefined
      ? codeStart - 1
      : build;
  const cards = [
    { key: "template", at: template, card: <TemplateCard run={run} /> },
    { key: "hook", at: hooks, card: <HookCard run={run} /> },
    { key: "script", at: script, card: <ScriptCard run={run} /> },
    { key: "voice", at: voice, card: <VoiceCard run={run} /> },
    { key: "build", at: build, card: <BuildCard run={run} /> },
  ];
  // stable: equal times keep the steps' order
  return cards
    .map((card, i) => ({ ...card, i }))
    .sort((a, b) => a.at - b.at || a.i - b.i);
}

// While the agent looks at its own frames and fixes them (status "reviewing"):
// a line under the conversation, so the panel never sits still with nothing
// said. Each round's findings arrive above it as the agent's messages; the
// video is put into the editor once it is done.
function ReviewingLine({ run }: { run: AgentRun }) {
  if (run.status !== "reviewing") return null;
  const rounds = (run.messages ?? []).filter((message) =>
    message.text.startsWith("Self-review, round"),
  ).length;
  return (
    <WorkingLine run={run}>
      {rounds
        ? "Fixing what it found, then looking again…"
        : "Rendering frames and looking at them…"}{" "}
      <span className="text-editor-muted">
        The video goes into the editor when this is done.
      </span>
    </WorkingLine>
  );
}

// Paused at the model's usage limit (Claude Code's 5-hour limit): nothing is
// lost – everything made so far is saved in the run. "Continue" goes on from
// where it stopped once the limit has reset (the reason says when).
function PausedCard({ run }: { run: AgentRun }) {
  const resume = useResume();
  if (run.status !== "paused") return null;
  return (
    <div className="flex flex-col gap-2 rounded-2xl rounded-bl-none border border-solid border-editor-accent p-3 text-xs text-editor-text">
      <span className="font-semibold">Paused</span>
      <span className="text-editor-muted">{run.error}</span>
      <span className="text-editor-muted">
        Everything made so far is saved. Press Continue (after a usage limit,
        once it has reset); the agent goes on from where it stopped.
      </span>
      <div className="flex items-center gap-2">
        <Button
          size="xs"
          loading={resume.isPending}
          onClick={() => resume.mutate({ runId: run.id })}
        >
          Continue
        </Button>
        {resume.error ? (
          <span className="text-red-400">{resume.error.message}</span>
        ) : null}
      </div>
    </div>
  );
}
