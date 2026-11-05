import type { BlockFromAi } from "../../agent/run/4-blocks";
import type { AgentRun } from "../../agent/run/run";
import { StepLog } from "./StepLog";

// 4 Building of a motion video in the conversation: for every scene its stage
// type and the blocks the agent picked, each on its word; what the library
// was missing (the wish list); and any problem the code could not get fixed.
export function BlocksCard({ run }: { run: AgentRun }) {
  const blocks = run.blocks;
  if (!blocks) return null;
  const step = [...run.steps].reverse().find((s) => s.name === "pickBlocks");
  return (
    <div className="flex flex-col gap-2 rounded-2xl rounded-bl-none border border-solid border-editor-border p-3">
      <span className="text-xs text-editor-muted">
        <span className="text-green-400">✓</span> Pictures picked ·{" "}
        {blocks.scenes.length} scenes
      </span>
      <ol className="m-0 flex flex-col gap-1.5 pl-4 text-xs text-editor-text">
        {blocks.scenes.map((scene, index) => (
          <li key={index}>
            <span className="text-editor-accent">{scene.stage ?? "top"}</span>
            {scene.blocks.length ? (
              scene.blocks.map((block, n) => (
                <span key={n}>
                  <span className="text-editor-muted">
                    {n ? " · " : " — "}
                    {block.onWord} →{" "}
                  </span>
                  {describeBlock(block)}
                </span>
              ))
            ) : (
              <span className="text-editor-muted"> — words only</span>
            )}
          </li>
        ))}
      </ol>
      {blocks.wishes.length ? (
        <span className="text-xs text-editor-text">
          Missing in the library:{" "}
          <span className="text-editor-muted">{blocks.wishes.join(", ")}</span>
        </span>
      ) : null}
      {blocks.problems.length ? (
        <ul className="m-0 flex flex-col gap-1 pl-4 text-xs text-amber-300">
          {blocks.problems.map((problem, index) => (
            <li key={index}>{problem.message}</li>
          ))}
        </ul>
      ) : null}
      {step ? <StepLog step={step} /> : null}
    </div>
  );
}

// One block in a few words: its kind and what is in it.
function describeBlock(block: BlockFromAi): string {
  switch (block.kind) {
    case "logos":
      return `logos (${(block.ids ?? []).join(", ")})`;
    case "code":
      return `code (${block.file ?? ""})`;
    case "terminal":
      return `terminal (${block.lines?.[0] ?? ""})`;
    case "screen":
      return `🎥 screen (${block.text ?? ""})`;
    case "list":
      return `list (${(block.items ?? []).join(" · ")})`;
    case "number":
      return `number (${block.prefix ?? ""}${block.value ?? ""}${block.suffix ?? ""})`;
    case "compare":
      return `compare (${block.before?.value ?? ""} → ${block.after?.value ?? ""})`;
    case "badge":
      return `badge (${block.text ?? ""})`;
    case "object":
      return `object (${block.id ?? ""})`;
    case "schema":
      return `schema (${(block.nodes ?? []).map((n) => n.label).join(" → ")})`;
  }
}
