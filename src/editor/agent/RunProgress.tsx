import { Loader, Stepper } from "@mantine/core";
import type { AgentRun, AgentRunStatus } from "../../agent/agentRun";
import { useAgentRun } from "../../api/agent";

// The run's road as the user sees it: one step per thing the agent does, and
// which statuses mean "this step is happening now". Waiting for the user
// (awaiting_*) belongs to the step whose answer is being waited for.
const STEPS: { label: string; statuses: AgentRunStatus[] }[] = [
  { label: "Template", statuses: ["created", "picking_template"] },
  { label: "Hooks", statuses: ["writing_hooks", "awaiting_hook"] },
  { label: "Script", statuses: ["writing_script", "awaiting_approval"] },
  { label: "Layout", statuses: ["laying_out"] },
  { label: "Check", statuses: ["checking"] },
  { label: "Voice", statuses: ["generating_voice"] },
];
// The steps this run goes through and which one it is on. Shared with the
// collapsed rail's dots, so both count the same way.
export function runRoad(run: AgentRun) {
  const steps = run.input.generateVoice
    ? STEPS
    : STEPS.filter((step) => step.label !== "Voice");
  // done = every step finished. error/cancelled are not on the road, so they
  // show the first step; where it stopped is in the error line below.
  const active =
    run.status === "done"
      ? steps.length
      : Math.max(
          0,
          steps.findIndex((step) => step.statuses.includes(run.status)),
        );
  return { steps, active };
}

// The run being shown, asked for again every second until it settles.
export function RunProgress({ runId }: { runId: string }) {
  const { data: run } = useAgentRun(runId);
  if (!run) return <Loader size="sm" />;
  const { steps, active } = runRoad(run);

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-sm text-editor-text">{run.input.idea}</p>
      <Stepper active={active} orientation="vertical" size="sm">
        {steps.map((step) => (
          <Stepper.Step key={step.label} label={step.label} />
        ))}
      </Stepper>
      {run.status === "error" ? (
        <p className="m-0 text-xs text-red-400">{run.error ?? "Failed"}</p>
      ) : null}
    </div>
  );
}
