import { skipToken, useMutation, useQuery } from "@tanstack/react-query";
import type { AgentRun } from "../agent/run/run";
import type { RunStatus } from "../agent/run/status";
import { queryClient } from "./queryClient";
import { trpc } from "./trpc";

// The agent as the editor talks to it. A run lives on the server
// (db/agent-runs/); the editor starts one and then keeps asking how it is
// going — the same start → poll pattern as RenderButton.
const POLL_MS = 1000;

// The run waits for the user, so asking again would only repeat the same
// answer – unless the user has just answered and the agent hasn't moved yet:
// a hook picked, hooks written for a template that was then changed, or the
// script approved or commented on.
function waitsForUser(run: AgentRun): boolean {
  if (run.status === "awaiting_hook")
    return !run.hook && run.hooksFor === run.template?.videoTemplateId;
  if (run.status === "awaiting_approval")
    return !run.script?.approved && !run.script?.comment;
  return false;
}
// Statuses after which the agent is no longer working on a project.
const FINISHED: RunStatus[] = ["done", "error", "cancelled"];

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
        const run = query.state.data;
        return run && (FINISHED.includes(run.status) || waitsForUser(run))
          ? false
          : POLL_MS;
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
// The layout examples and the channel's style, for laying the agent's scenes
// out in the editor. Asked for once, and only when there is a layout to apply.
export function useLayoutKnowledge(workspaceId: string | undefined) {
  return useQuery(
    trpc.agent.layoutKnowledge.queryOptions(workspaceId ?? skipToken, {
      staleTime: Infinity,
    }),
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
// The user's pick on screen 2: one of the three hooks, or their own text.
// The run is asked for again at once, so the panel follows the agent on.
export function useChooseHook() {
  return useMutation(
    trpc.agent.chooseHook.mutationOptions({
      onSuccess: (_, { runId }) =>
        queryClient.invalidateQueries({
          queryKey: trpc.agent.get.queryKey(runId),
        }),
    }),
  );
}
// Screen 3: "Approve". The run is asked for again at once, so the panel
// follows the agent on to building the video.
export function useApproveScript() {
  return useMutation(
    trpc.agent.approveScript.mutationOptions({ onSuccess: askForRunAgain }),
  );
}
// Screen 3: a comment – the agent writes the script again with it.
export function useReviseScript() {
  return useMutation(
    trpc.agent.reviseScript.mutationOptions({ onSuccess: askForRunAgain }),
  );
}
// After an answer: ask for the run again, since one that waits for the user is
// no longer polled.
function askForRunAgain(_: unknown, { runId }: { runId: string }) {
  return queryClient.invalidateQueries({
    queryKey: trpc.agent.get.queryKey(runId),
  });
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
