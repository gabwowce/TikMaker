import { ActionIcon, Button, Progress } from "@mantine/core";
import { skipToken, useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { renderFileUrl, trpc } from "../api/trpc";
import { useProjectStore } from "./state/projectStore";

const POLL_MS = 700;

export function RenderButton() {
  const project = useProjectStore((s) => s.project);
  const [jobId, setJobId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const start = useMutation(
    trpc.renders.start.mutationOptions({ onSuccess: ({ id }) => setJobId(id) }),
  );
  // Polls the job while it runs; refetchInterval returning false stops it
  // once the render is done or failed. skipToken = "no job yet, don't ask".
  const { data: job } = useQuery(
    trpc.renders.get.queryOptions(jobId ?? skipToken, {
      refetchInterval: (query) =>
        query.state.data?.status === "running" ? POLL_MS : false,
    }),
  );

  const running = start.isPending || job?.status === "running";
  const percent = Math.round((job?.progress ?? 0) * 100);
  const failed = start.isError || job?.status === "error";
  const error = start.error?.message ?? job?.error;

  return (
    <div className="relative flex items-center gap-2">
      <Button
        disabled={running}
        onClick={() => {
          setJobId(null);
          setPanelOpen(true);
          start.mutate({ project });
        }}
      >
        {running ? `Rendering ${percent}%` : "Render MP4"}
      </Button>
      {panelOpen ? (
        <div className="absolute top-full right-0 z-50 mt-2 w-80 rounded border border-solid border-editor-border bg-editor-panel p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs">
              {failed ? "Failed" : (job?.phase ?? "Starting Remotion…")}
            </span>
            <ActionIcon
              aria-label="Close render status"
              onClick={() => setPanelOpen(false)}
            >
              ×
            </ActionIcon>
          </div>
          <Progress value={percent} color={failed ? "red" : "orange"} />
          {job?.status === "done" && job.outputPath ? (
            <div className="mt-3 flex flex-col gap-2">
              <span className="break-all text-xs">{job.outputPath}</span>
              <Button component="a" href={renderFileUrl(job.id)}>
                Download MP4
              </Button>
              <Button
                variant="default"
                onClick={() =>
                  void navigator.clipboard.writeText(job.outputPath ?? "")
                }
              >
                Copy path
              </Button>
            </div>
          ) : null}
          {failed && error ? (
            <div
              role="alert"
              className="mt-2 max-h-40 overflow-auto text-xs text-red-400"
            >
              {error}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
