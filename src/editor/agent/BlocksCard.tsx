import type { BlockFromAi } from "../../agent/run/4-blocks";
import type { AgentRun } from "../../agent/run/run";
import { FindingsList, findingsSummary } from "./FindingsList";
import { FoldCard } from "./FoldCard";
import { StepLog } from "./StepLog";

// 4 Building of a motion video in the conversation: for every scene its stage
// type and the blocks the agent picked, each on its word; what the library
// was missing (the wish list); and any problem the code could not get fixed.
export function BlocksCard({ run }: { run: AgentRun }) {
  const blocks = run.blocks;
  if (!blocks) return null;
  const step = [...run.steps].reverse().find((s) => s.name === "pickBlocks");
  // The screen blocks: what the user has to record for them, and how long.
  const recordings = blocks.scenes.flatMap((scene, n) =>
    scene.blocks
      .filter((block) => block.kind === "screen")
      .map((block) => ({ scene: n, block })),
  );
  // The picture blocks: what picture the user has to put in.
  const pictures = blocks.scenes.flatMap((scene, n) =>
    scene.blocks
      .filter((block) => block.kind === "picture")
      .map((block) => ({ scene: n, block })),
  );
  // Folded: how many scenes, recordings, pictures and problems – the rest on
  // click.
  const summary = [
    recordings.length ? `${recordings.length} to record` : "",
    pictures.length ? `${pictures.length} picture(s) to add` : "",
    blocks.wishes.length ? `${blocks.wishes.length} missing` : "",
    findingsSummary(blocks.problems),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <FoldCard
      title={`Pictures picked · ${blocks.scenes.length} scenes`}
      summary={summary || undefined}
    >
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
            {scene.happens ? (
              <div className="text-editor-muted italic">{scene.happens}</div>
            ) : null}
          </li>
        ))}
      </ol>
      {recordings.length ? (
        <div className="flex flex-col gap-1 text-xs text-editor-text">
          <span>To record:</span>
          <ol className="m-0 flex flex-col gap-1 pl-4">
            {recordings.map(({ scene, block }, index) => (
              <li key={index}>
                <span className="text-editor-accent">
                  Scene {scene + 1}
                  {block.seconds ? ` · ~${Math.round(block.seconds)} s` : ""}
                </span>
                <span className="text-editor-muted">
                  {" "}
                  — {block.record ?? block.text ?? ""}
                </span>
              </li>
            ))}
          </ol>
          <span className="text-editor-muted">
            Put it in: right-click the REC block on the timeline → Replace
            asset…
          </span>
        </div>
      ) : null}
      {pictures.length ? (
        <div className="flex flex-col gap-1 text-xs text-editor-text">
          <span>Pictures to add:</span>
          <ol className="m-0 flex flex-col gap-1 pl-4">
            {pictures.map(({ scene, block }, index) => (
              <li key={index}>
                <span className="text-editor-accent">
                  Scene {scene + 1} · {block.look ?? "cutout"}
                </span>
                <span className="text-editor-muted">
                  {" "}
                  — {block.find ?? block.text ?? ""}
                </span>
              </li>
            ))}
          </ol>
          <span className="text-editor-muted">
            Put it in: right-click the PICTURE block on the timeline → Replace
            asset… (a PNG without a background for a cutout)
          </span>
        </div>
      ) : null}
      {blocks.wishes.length ? (
        <details className="text-xs text-editor-muted">
          <summary className="cursor-pointer">
            {blocks.wishes.length} missing in the library
          </summary>
          <ul className="m-0 mt-1 flex flex-col gap-1 pl-4">
            {blocks.wishes.map((wish, index) => (
              <li key={index}>{wish}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <FindingsList findings={blocks.problems} />
      {step ? <StepLog step={step} /> : null}
    </FoldCard>
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
    case "picture":
      return `▣ picture (${block.text ?? ""}, ${block.look ?? "cutout"})`;
    case "screen":
      return `🎥 screen (${block.text ?? ""}${block.seconds ? `, ~${Math.round(block.seconds)} s` : ""})`;
    case "list":
      return `list${block.shape && block.shape !== "rows" ? ` ${block.shape}` : ""} (${(block.items ?? []).join(" · ")})`;
    case "phone":
    case "browser":
      return `${block.kind} (${block.text ?? ""}: ${(block.items ?? []).join(" · ")})`;
    case "progress":
      return `progress (${block.value ?? 0} % ${block.text ?? ""})`;
    case "keys":
      return `keys (${(block.items ?? []).join(" + ")})`;
    case "chat":
      return `chat${block.shape === "comments" ? " comments" : ""} (${(block.items ?? []).join(" · ")})`;
    case "transform":
      return `transform (${(block.nodes ?? []).map((n) => n.label).join(" → ")})`;
    case "number":
      return `number (${block.prefix ?? ""}${block.value ?? ""}${block.suffix ?? ""})`;
    case "compare":
      return `compare (${block.before?.value ?? ""} → ${block.after?.value ?? ""})`;
    case "badge":
      return `badge (${block.text ?? ""})`;
    case "object":
      return `object (${block.id ?? ""})`;
    case "schema":
      return `schema${block.shape && block.shape !== "chain" ? ` ${block.shape}` : ""} (${(block.nodes ?? []).map((n) => n.label).join(" → ")})`;
  }
}
