import { Button } from "@mantine/core";
import type { ScriptInRun } from "../../agent/run/3-script";
import type { AgentRun } from "../../agent/run/run";
import { useApproveScript } from "../../api/agent";
import { StepLog } from "./StepLog";
import { WorkingLine } from "./WorkingLine";

// 3 Script in the conversation: while the model writes, one line; then the
// scenes to read, what the check still found, and "Approve". To have it
// written again the user writes a message below (ChatInput) – a message
// never approves, the button is the only way. Once approved, one line.
export function ScriptCard({ run }: { run: AgentRun }) {
  const approve = useApproveScript();
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
      <WorkingLine run={run}>
        {answered || script ? "Rewriting the script…" : "Writing the script…"}
      </WorkingLine>
    );
  }
  if (run.status !== "awaiting_approval" || !script) return null;

  const busy = approve.isPending;
  const error = approve.error;
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
      <div className="flex items-center gap-2">
        <Button
          size="xs"
          disabled={busy}
          loading={approve.isPending}
          onClick={() => approve.mutate({ runId: run.id })}
        >
          Approve
        </Button>
        <span className="text-[11px] text-editor-muted">
          or write below what to change
        </span>
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
