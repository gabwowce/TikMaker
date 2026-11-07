import { Button, NativeSelect } from "@mantine/core";
import { useState } from "react";
import { MIN_FIT_SCORE, TEMPLATE_CHANGEABLE } from "../../agent/run/2-angle";
import type { AgentRun } from "../../agent/run/run";
import { useChangeTemplate, useTemplates } from "../../api/agent";
import { StepLog } from "./StepLog";
import { WorkingLine } from "./WorkingLine";

// 2 Angle in the conversation: one line saying what was decided and by whom,
// the template itself, and "Change" while nothing is written for it yet.
// While the model is still choosing, the same place says so.
export function TemplateCard({ run }: { run: AgentRun }) {
  const { data: templates = [] } = useTemplates();
  const change = useChangeTemplate();
  const [picking, setPicking] = useState(false);

  const choice = run.template;
  if (!choice) {
    if (run.status !== "created" && run.status !== "picking_template")
      return null;
    return <WorkingLine run={run}>Picking a template…</WorkingLine>;
  }
  const template = templates.find((t) => t.id === choice.videoTemplateId);
  const byAgent = choice.pickedBy === "agent";
  const poorFit =
    byAgent && choice.score !== undefined && choice.score < MIN_FIT_SCORE;
  const canChange = TEMPLATE_CHANGEABLE.includes(run.status);
  // The model's call behind this pick; none when the user chose in the form.
  const step = [...run.steps].reverse().find((s) => s.name === "pickTemplate");

  return (
    <div className="flex flex-col gap-1 rounded-2xl rounded-bl-none border border-solid border-editor-border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-editor-muted">
          <span className="text-green-400">✓</span> Template ·{" "}
          {byAgent ? `picked by the AI · fit ${choice.score}/5` : "your choice"}
        </span>
        {canChange ? (
          <Button
            variant="subtle"
            size="compact-xs"
            onClick={() => setPicking(!picking)}
          >
            {picking ? "Cancel" : "Change"}
          </Button>
        ) : null}
      </div>
      <span className="text-sm font-semibold text-editor-text">
        {template?.name ?? choice.videoTemplateId}
      </span>
      {template ? (
        <span className="text-xs text-editor-muted">{template.oneLine}</span>
      ) : null}
      {byAgent && choice.reason ? (
        <span className="text-xs text-editor-muted">Why: {choice.reason}</span>
      ) : null}
      {poorFit ? (
        <span className="text-xs text-amber-400">
          Nothing in the knowledge base fits this idea well.
        </span>
      ) : null}

      {step ? <StepLog step={step} /> : null}

      {canChange && picking ? (
        <NativeSelect
          aria-label="Template"
          value={choice.videoTemplateId}
          disabled={change.isPending}
          onChange={(event) =>
            change.mutate(
              { runId: run.id, videoTemplateId: event.currentTarget.value },
              { onSuccess: () => setPicking(false) },
            )
          }
          data={templates.map((t) => ({ value: t.id, label: t.name }))}
        />
      ) : null}
      {change.error ? (
        <span className="text-xs text-red-400">{change.error.message}</span>
      ) : null}
    </div>
  );
}
