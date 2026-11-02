import { Button, Loader, Textarea } from "@mantine/core";
import { useState } from "react";
import type { ScriptInRun } from "../../agent/run/3-script";
import type { AgentRun } from "../../agent/run/run";
import { useApproveScript, useReviseScript } from "../../api/agent";
import { StepLog } from "./StepLog";

// 3 Script in the conversation: while the model writes, one line; then the
// scenes to read, what the check still found, and the user's answer –
// "Approve", or a comment to have it written again. Once approved, one line.
export function ScriptCard({ run }: { run: AgentRun }) {
  const approve = useApproveScript();
  const revise = useReviseScript();
  const [comment, setComment] = useState("");
  const step = [...run.steps].reverse().find((s) => s.name === "writeScript");
  const script = run.script;

  if (script?.approved) {
    return (
      <div className="flex flex-col gap-1 rounded-2xl rounded-bl-none border border-solid border-editor-border p-3">
        <span className="text-xs text-editor-muted">
          <span className="text-green-400">✓</span> Script approved ·{" "}
          {script.scenes.length} scenes
        </span>
        {step ? <StepLog step={step} /> : null}
      </div>
    );
  }

  // Being written – the first time, or again after a comment.
  const answered = Boolean(script?.comment);
  if (run.status === "writing_script" || answered) {
    return (
      <div className="flex items-center gap-2 rounded-2xl rounded-bl-none border border-solid border-editor-border p-3 text-xs">
        <Loader size={12} />
        {answered || script ? "Rewriting the script…" : "Writing the script…"}
      </div>
    );
  }
  if (run.status !== "awaiting_approval" || !script) return null;

  const busy = approve.isPending || revise.isPending;
  const error = approve.error ?? revise.error;
  return (
    <div className="flex flex-col gap-2 rounded-2xl rounded-bl-none border border-solid border-editor-border p-3">
      <span className="text-xs text-editor-muted">
        The script – read it, then approve or say what to change
      </span>
      {script.scenes.map((scene, index) => (
        <SceneRow key={index} index={index} scene={scene} />
      ))}
      {script.problems.length ? (
        <ul className="m-0 flex flex-col gap-1 pl-4 text-xs text-amber-400">
          {script.problems.map((problem, index) => (
            <li key={index}>
              {problem.sceneIndex === undefined
                ? ""
                : `Scene ${problem.sceneIndex + 1}: `}
              {problem.message}
            </li>
          ))}
        </ul>
      ) : null}
      <Textarea
        placeholder="What to change? (e.g. shorter, scene 3 without a recording)"
        autosize
        minRows={1}
        maxLength={500}
        value={comment}
        onChange={(event) => setComment(event.currentTarget.value)}
      />
      <div className="flex gap-2">
        <Button
          size="xs"
          disabled={busy}
          loading={approve.isPending}
          onClick={() => approve.mutate({ runId: run.id })}
        >
          Approve
        </Button>
        {comment.trim().length >= 3 ? (
          <Button
            size="xs"
            variant="default"
            disabled={busy}
            loading={revise.isPending}
            onClick={() =>
              revise.mutate(
                { runId: run.id, comment: comment.trim() },
                { onSuccess: () => setComment("") },
              )
            }
          >
            Rewrite with my comment
          </Button>
        ) : null}
      </div>
      {step ? <StepLog step={step} /> : null}
      {error ? (
        <span className="text-xs text-red-400">{error.message}</span>
      ) : null}
    </div>
  );
}

// One scene of the script: its role, the words on screen, the voiceover and
// what is shown. The AI decides where the user's own recording goes; to
// change that, the user says so in the comment.
function SceneRow({
  index,
  scene,
}: {
  index: number;
  scene: ScriptInRun["scenes"][number];
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-solid border-editor-border p-2">
      <span className="text-[11px] text-editor-muted">
        {index + 1} · {scene.role}
        {scene.needsRecording ? " · 🎥 your recording" : ""}
      </span>
      <span className="text-sm font-semibold text-editor-text">
        {scene.onScreen}
      </span>
      <span className="text-xs text-editor-text">{scene.voiceover}</span>
      <span className="text-[11px] text-editor-muted">
        Shows: {scene.visual}
      </span>
    </div>
  );
}
