import { Loader } from "@mantine/core";
import { useEffect, useState, type ReactNode } from "react";
import type { AgentRun } from "../../agent/run/run";
import { RESTING_STATUSES } from "../../agent/run/status";

// The one "the agent is working on it" line of the conversation: a spinner,
// what is being done, and how long it has been at it – a clock that keeps
// counting is how the user tells a long step from a stuck one. The time comes
// from the run (statusAt, written by the server), so reopening the panel does
// not start it again from zero. No clock while nobody works on the run.
export function WorkingLine({
  run,
  children,
}: {
  run: AgentRun;
  children: ReactNode;
}) {
  const since = RESTING_STATUSES.includes(run.status) ? undefined : run.statusAt;
  const now = useNow(since !== undefined);
  return (
    <div className="flex items-center gap-2 rounded-2xl rounded-bl-none border border-solid border-editor-border p-3 text-xs">
      <Loader size={12} />
      <span className="flex-1">{children}</span>
      {since !== undefined ? (
        <span className="tabular-nums text-editor-muted">
          {elapsed(now - since)}
        </span>
      ) : null}
    </div>
  );
}

// The time now, again every second while `ticking`.
function useNow(ticking: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!ticking) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [ticking]);
  return now;
}

// 83 000 ms → "1:23"
function elapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
