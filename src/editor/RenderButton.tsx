import { ActionIcon, Button, Progress } from "@mantine/core";
import { useEffect, useState } from "react";
import type { VideoProject } from "../schema/project";
import { useProjectStore } from "./state/projectStore";
type RenderJob = {
  id: string;
  status: "running" | "done" | "error";
  progress: number;
  phase: string;
  outputPath?: string;
  error?: string;
};
const POLL_MS = 700;

export function RenderButton() {
  const project = useProjectStore((s) => s.project) as VideoProject;
  const [job, setJob] = useState<RenderJob | null>(null);
  const [starting, setStarting] = useState(false);
  const jobId = job?.status === "running" ? job.id : null;
  useEffect(() => {
    if (!jobId) return;
    const timer = window.setInterval(async () => {
      try {
        const res = await fetch(
          `/api/render-status?id=${encodeURIComponent(jobId)}`,
        );
        if (res.ok) setJob(await res.json());
      } catch {}
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [jobId]);
  async function startRender() {
    setStarting(true);
    setJob(null);
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project }),
      });
      const body = await res.json();
      if (!res.ok)
        throw new Error(body.error ?? `Render failed to start (${res.status})`);
      setJob({
        id: body.id,
        status: "running",
        progress: 0,
        phase: "Starting Remotion…",
      });
    } catch (err) {
      setJob({
        id: "",
        status: "error",
        progress: 0,
        phase: "Failed",
        error: String(err),
      });
    } finally {
      setStarting(false);
    }
  }
  const running = starting || job?.status === "running";
  const percent = Math.round((job?.progress ?? 0) * 100);
  return (
    <div className="relative flex items-center gap-2">
      <Button onClick={startRender} disabled={running}>
        {running ? `Rendering ${percent}%` : "Render MP4"}
      </Button>
      {job ? (
        <div className="absolute top-full right-0 z-50 mt-2 w-80 rounded border border-solid border-editor-border bg-editor-panel p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs">{job.phase}</span>
            <ActionIcon
              aria-label="Close render status"
              onClick={() => setJob(null)}
            >
              ×
            </ActionIcon>
          </div>
          <Progress
            value={percent}
            color={job.status === "error" ? "red" : "orange"}
          />
          {job.status === "done" && job.outputPath ? (
            <div className="mt-3 flex flex-col gap-2">
              <span className="break-all text-xs">{job.outputPath}</span>
              <Button
                component="a"
                href={`/api/render-file?id=${encodeURIComponent(job.id)}`}
              >
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
          {job.status === "error" ? (
            <div
              role="alert"
              className="mt-2 max-h-40 overflow-auto text-xs text-red-400"
            >
              {job.error}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
