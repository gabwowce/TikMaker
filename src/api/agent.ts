import { skipToken, useMutation, useQuery } from "@tanstack/react-query";
import type { AgentRunStatus } from "../agent/agentRun";
import { queryClient } from "./queryClient";
import { trpc } from "./trpc";

// The agent as the editor talks to it. A run lives on the server
// (db/agent-runs/); the editor starts one and then keeps asking how it is
// going — the same start → poll pattern as RenderButton.
const POLL_MS = 1000;

// Statuses in which nothing changes until the user acts, or ever again:
// asking then would only repeat the same answer.
const SETTLED: AgentRunStatus[] = [
  "awaiting_hook",
  "awaiting_approval",
  "done",
  "error",
  "cancelled",
];
// Statuses after which the agent is no longer working on a project.
const FINISHED: AgentRunStatus[] = ["done", "error", "cancelled"];

// Starts a run for a project. Afterwards the project's run list is asked for
// again, so the panel's history shows the new run at once.
export function useStartRun(onStarted: (runId: string) => void) {
  return useMutation(
    trpc.agent.start.mutationOptions({
      onSuccess: ({ id }) => {
        onStarted(id);
        void queryClient.invalidateQueries({
          queryKey: trpc.agent.list.queryKey(),
        });
      },
    }),
  );
}

// One run, asked for again every second until it settles.
// skipToken = "no run yet, don't ask".
export function useAgentRun(runId: string | undefined) {
  return useQuery(
    trpc.agent.get.queryOptions(runId ?? skipToken, {
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status && SETTLED.includes(status) ? false : POLL_MS;
      },
    }),
  );
}

// The open project's runs, newest first: the panel's "Run" history.
export function useAgentRuns(projectId: string) {
  return useQuery(trpc.agent.list.queryOptions(projectId));
}

// Every template the user can pick (the form, and "Change" on the card). The
// knowledge base only changes between server starts, so it is asked for once.
export function useTemplates() {
  return useQuery(
    trpc.agent.templates.queryOptions(undefined, { staleTime: Infinity }),
  );
}

// Swaps the run's template, then asks for the run again so the card shows it
// at once (a run waiting for the user is no longer polled).
export function useChangeTemplate() {
  return useMutation(
    trpc.agent.changeTemplate.mutationOptions({
      onSuccess: (_, { runId }) =>
        queryClient.invalidateQueries({
          queryKey: trpc.agent.get.queryKey(runId),
        }),
    }),
  );
}

// The open project's newest run, asked for again while the agent works on it.
// Both the panel and its collapsed rail read this, so they never disagree.
export function useLatestRun(projectId: string) {
  const { data: runs } = useAgentRuns(projectId);
  const { data: run } = useAgentRun(runs?.[0]?.id);
  return {
    loaded: runs !== undefined,
    run,
    working: run !== undefined && !FINISHED.includes(run.status),
  };
}
