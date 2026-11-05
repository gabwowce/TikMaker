import { Loader } from "@mantine/core";
import type { AgentRun } from "../../agent/run/run";
import { BlocksCard } from "./BlocksCard";
import { MotionCard } from "./MotionCard";

// 4 Building in the conversation: one line while the model picks the
// pictures, then which blocks every scene got; one line while it plans the
// motion, then how everything moves.
export function BuildCard({ run }: { run: AgentRun }) {
  const working = run.status === "laying_out";
  if (!run.blocks)
    return working ? <Working>Picking the pictures…</Working> : null;
  return (
    <>
      <BlocksCard run={run} />
      {run.motion ? (
        <MotionCard run={run} />
      ) : working ? (
        <Working>Planning the motion…</Working>
      ) : null}
    </>
  );
}

// One line while the model works on this step.
function Working({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl rounded-bl-none border border-solid border-editor-border p-3 text-xs">
      <Loader size={12} />
      {children}
    </div>
  );
}
