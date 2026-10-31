import { Button, Loader, Textarea, UnstyledButton } from "@mantine/core";
import { useState } from "react";
import type { AgentRun } from "../../agent/run/run";
import { useChooseHook } from "../../api/agent";
import { StepLog } from "./StepLog";

// 2 Angle, the opening line, in the conversation: while the model writes,
// the three it proposes to pick from (or the user's own text), and once
// picked, one line saying which.
export function HookCard({ run }: { run: AgentRun }) {
  const choose = useChooseHook();
  const [ownText, setOwnText] = useState("");
  const step = [...run.steps].reverse().find((s) => s.name === "writeHooks");

  if (run.hook) {
    return (
      <div className="flex flex-col gap-1 rounded-2xl rounded-bl-none border border-solid border-editor-border p-3">
        <span className="text-xs text-editor-muted">
          <span className="text-green-400">✓</span> Hook ·{" "}
          {run.hook.pickedBy === "agent" ? "the AI's suggestion" : "your own"}
        </span>
        <span className="text-sm font-semibold text-editor-text">
          “{run.hook.text}”
        </span>
        {step ? <StepLog step={step} /> : null}
      </div>
    );
  }

  // Hooks written for another template ("Change") are on their way out.
  const fresh = run.hooks && run.hooksFor === run.template?.videoTemplateId;
  if (!fresh || run.status !== "awaiting_hook") {
    if (run.status !== "writing_hooks" && run.status !== "awaiting_hook")
      return null;
    return (
      <div className="flex items-center gap-2 rounded-2xl rounded-bl-none border border-solid border-editor-border p-3 text-xs">
        <Loader size={12} />
        Writing hooks…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl rounded-bl-none border border-solid border-editor-border p-3">
      <span className="text-xs text-editor-muted">
        Pick the opening line – the first two seconds of the video
      </span>
      {run.hooks!.map((hook, index) => (
        <UnstyledButton
          key={hook.text}
          disabled={choose.isPending}
          onClick={() => choose.mutate({ runId: run.id, hookIndex: index })}
          className="flex flex-col gap-1 rounded-lg border border-solid border-editor-border p-2 hover:border-editor-accent"
        >
          <span className="text-sm text-editor-text">{hook.text}</span>
          <span className="text-[11px] text-editor-muted">
            {hook.formulaId ? "from a proven formula" : "the AI's own"} ·{" "}
            {hook.score}/5
          </span>
        </UnstyledButton>
      ))}
      <Textarea
        placeholder="…or write your own"
        autosize
        minRows={1}
        maxLength={150}
        value={ownText}
        onChange={(event) => setOwnText(event.currentTarget.value)}
      />
      {ownText.trim() ? (
        <Button
          size="xs"
          className="self-start"
          loading={choose.isPending}
          onClick={() => choose.mutate({ runId: run.id, text: ownText.trim() })}
        >
          Use my hook
        </Button>
      ) : null}
      {step ? <StepLog step={step} /> : null}
      {choose.error ? (
        <span className="text-xs text-red-400">{choose.error.message}</span>
      ) : null}
    </div>
  );
}
