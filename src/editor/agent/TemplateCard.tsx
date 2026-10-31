import { Button, NativeSelect } from "@mantine/core";
import { useState } from "react";
import {
  MIN_FIT_SCORE,
  TEMPLATE_CHANGEABLE,
  type AgentRun,
} from "../../agent/agentRun";
import { useChangeTemplate, useTemplates } from "../../api/agent";

// 2 Angle on the panel: which template the video follows and why, and
// "Change" to go on with another one while nothing is written for it yet.
export function TemplateCard({ run }: { run: AgentRun }) {
  const { data: templates = [] } = useTemplates();
  const change = useChangeTemplate();
  const [picking, setPicking] = useState(false);

  const choice = run.template;
  if (!choice) return null;
  const template = templates.find((t) => t.id === choice.videoTemplateId);
  const poorFit =
    choice.pickedBy === "agent" &&
    choice.score !== undefined &&
    choice.score < MIN_FIT_SCORE;

  return (
    <div className="flex flex-col gap-1 rounded-md border border-solid border-editor-border p-3">
      <span className="text-xs text-editor-muted">Template</span>
      <span className="font-semibold text-editor-text">
        {template?.name ?? choice.videoTemplateId}
      </span>
      {template ? <span className="text-xs">{template.oneLine}</span> : null}
      {choice.pickedBy === "user" ? (
        <span className="text-xs">Chosen by you</span>
      ) : (
        <span className="text-xs">
          Fit {choice.score}/5 · {choice.reason}
        </span>
      )}
      {poorFit ? (
        <span className="text-xs text-amber-400">
          Nothing in the knowledge base fits this idea well.
        </span>
      ) : null}

      {TEMPLATE_CHANGEABLE.includes(run.status) ? (
        picking ? (
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
        ) : (
          <Button
            variant="default"
            size="xs"
            className="self-start"
            onClick={() => setPicking(true)}
          >
            Change
          </Button>
        )
      ) : null}
      {change.error ? (
        <span className="text-xs text-red-400">{change.error.message}</span>
      ) : null}
    </div>
  );
}
