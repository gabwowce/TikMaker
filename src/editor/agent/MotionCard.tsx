import type { AgentRun } from "../../agent/run/run";
import { StepLog } from "./StepLog";

// 4 Building of a motion video, after the pictures: how the agent made them
// move – its idea for the whole video, then for every scene the cut into it
// and each block's entrance → exit (with a move or a carry when it made one),
// and any problem the code could not get fixed.
export function MotionCard({ run }: { run: AgentRun }) {
  const motion = run.motion;
  if (!motion) return null;
  const step = [...run.steps].reverse().find((s) => s.name === "pickMotion");
  return (
    <div className="flex flex-col gap-2 rounded-2xl rounded-bl-none border border-solid border-editor-border p-3">
      <span className="text-xs text-editor-muted">
        <span className="text-green-400">✓</span> Motion planned
      </span>
      <span className="text-xs text-editor-text">{motion.idea}</span>
      <ol className="m-0 flex flex-col gap-1.5 pl-4 text-xs text-editor-text">
        {motion.scenes.map((scene, index) => (
          <li key={index}>
            <span className="text-editor-accent">{scene.transition}</span>
            {scene.blocks.map((block, n) => (
              <span key={n}>
                <span className="text-editor-muted">{n ? " · " : " — "}</span>
                {block.entrance} → {block.exit}
                {block.drift ? `, ${block.drift}` : ""}
                {block.moves?.length
                  ? `, moves on "${block.moves.map((m) => m.onWord).join('", "')}"`
                  : ""}
                {block.carry ? ", carried on" : ""}
              </span>
            ))}
          </li>
        ))}
      </ol>
      {motion.problems.length ? (
        <ul className="m-0 flex flex-col gap-1 pl-4 text-xs text-amber-300">
          {motion.problems.map((problem, index) => (
            <li key={index}>{problem.message}</li>
          ))}
        </ul>
      ) : null}
      {step ? <StepLog step={step} /> : null}
    </div>
  );
}
