import { Loader } from "@mantine/core";
import type { AgentRun } from "../../agent/run/run";
import { useLayoutKnowledge } from "../../api/agent";
import { StepLog } from "./StepLog";

// 4 Building in the conversation: while the model picks the layouts, one
// line; then which scenes got a layout, and what the user still has to record
// or upload – every picture of an example that is real material, not a logo
// or a prop from the library (the same rule compileScene follows).
export function BuildCard({ run }: { run: AgentRun }) {
  const { data } = useLayoutKnowledge(
    run.layout ? run.input.workspaceId : undefined,
  );
  const step = [...run.steps].reverse().find((s) => s.name === "pickLayouts");

  if (run.status === "laying_out") {
    return (
      <div className="flex items-center gap-2 rounded-2xl rounded-bl-none border border-solid border-editor-border p-3 text-xs">
        <Loader size={12} />
        Laying out the scenes…
      </div>
    );
  }
  if (!run.layout) return null;

  const toMake = run.layout.scenes.flatMap((choice, index) => {
    const example = data?.examples.find((e) => e.id === choice.layoutExampleId);
    return (example?.elements ?? []).flatMap((element, n) =>
      element.kind === "logo" || element.kind === "prop"
        ? []
        : [{ scene: index + 1, what: choice.fills[n] }],
    );
  });

  return (
    <div className="flex flex-col gap-2 rounded-2xl rounded-bl-none border border-solid border-editor-border p-3">
      <span className="text-xs text-editor-muted">
        <span className="text-green-400">✓</span> Laid out ·{" "}
        {run.layout.scenes.length} scenes, each like a frame from a successful
        video
      </span>
      {toMake.length ? (
        <>
          <span className="text-xs text-editor-text">
            🎥 To record or upload ({toMake.length}):
          </span>
          <ul className="m-0 flex flex-col gap-1 pl-4 text-xs text-editor-text">
            {toMake.map((item, index) => (
              <li key={index}>
                <span className="text-editor-muted">Scene {item.scene} · </span>
                {item.what}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <span className="text-xs text-editor-muted">
          Nothing to record: every picture comes from the library.
        </span>
      )}
      {step ? <StepLog step={step} /> : null}
    </div>
  );
}
