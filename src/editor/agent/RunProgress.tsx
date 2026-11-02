import { Loader } from "@mantine/core";
import type { AgentRun } from "../../agent/run/run";
import type { RunStatus } from "../../agent/run/status";
import { useAgentRun } from "../../api/agent";
import { BuildCard } from "./BuildCard";
import { HookCard } from "./HookCard";
import { ScriptCard } from "./ScriptCard";
import { TemplateCard } from "./TemplateCard";
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
  { label: "Building", statuses: ["laying_out", "checking"] },
  { label: "Result", statuses: ["generating_voice"] },
];
// Which step the run is on. Shared with the collapsed rail's dots, so both
// count the same way.
export function runRoad(run: AgentRun) {
  const found = STEPS.findIndex((step) => step.statuses.includes(run.status));
  // done = every step finished. error/cancelled are not on the road: the bar
  // stays on Angle, the first step the agent works on, and the error line
  // says why it stopped.
  const active =
    run.status === "done" ? STEPS.length : found === -1 ? 1 : found;
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

  return (
    <div className="flex flex-col gap-5">
      <RoadBar run={run} />
      <IdeaBubble run={run} />
      <TemplateCard run={run} />
      <HookCard run={run} />
      <ScriptCard run={run} />
      <BuildCard run={run} />
      {run.status === "error" ? (
        <p className="m-0 text-xs text-red-400">{run.error ?? "Failed"}</p>
      ) : null}
    </div>
  );
}
