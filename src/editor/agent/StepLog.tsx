import { UnstyledButton } from "@mantine/core";
import { useState } from "react";
import type { AgentRunStep } from "../../agent/agentRun";

// One AI call from the run's log (FR-21): time and tokens at a glance, and on
// click exactly what was sent and what came back.
export function StepLog({ step }: { step: AgentRunStep }) {
  const [open, setOpen] = useState(false);
  const seconds = step.ms === undefined ? "?" : (step.ms / 1000).toFixed(1);
  const extras = [
    step.model,
    step.attempts && step.attempts > 1 ? `${step.attempts} tries` : undefined,
    step.cachedInputTokens ? `${step.cachedInputTokens} cached` : undefined,
    step.thinkingTokens ? `${step.thinkingTokens} thinking` : undefined,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-1">
      <UnstyledButton
        onClick={() => setOpen(!open)}
        className="self-start text-[11px] text-editor-muted hover:text-editor-text"
      >
        {open ? "▾" : "▸"} {seconds} s · {step.inputTokens ?? "?"} in ·{" "}
        {step.outputTokens ?? "?"} out tokens
      </UnstyledButton>
      {open ? (
        <div className="flex flex-col gap-2 text-[11px]">
          {extras.length ? (
            <span className="text-editor-muted">{extras.join(" · ")}</span>
          ) : null}
          {step.prompt ? (
            <>
              <LogBlock title="Sent · instructions" text={step.prompt.system} />
              <LogBlock title="Sent · request" text={step.prompt.user} />
            </>
          ) : (
            <span className="text-editor-muted">
              This run is older than the full log: what was sent is not kept.
            </span>
          )}
          {step.output !== undefined ? (
            <LogBlock
              title="Answer"
              text={JSON.stringify(step.output, null, 2)}
            />
          ) : null}
          {step.error ? <LogBlock title="Error" text={step.error} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function LogBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-editor-muted">{title}</span>
      <pre className="m-0 max-h-48 overflow-auto rounded-md bg-editor-panel-raised p-2 font-mono text-[11px] whitespace-pre-wrap text-editor-text">
        {text}
      </pre>
    </div>
  );
}
