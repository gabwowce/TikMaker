import React from "react";
import { useProjectStore } from "./state/projectStore";
import { editorColors } from "./theme";
import type { VideoProject } from "../schema/project";

type RenderJob = {
  id: string;
  status: "running" | "done" | "error";
  progress: number;
  phase: string;
  outputPath?: string;
  error?: string;
};

const POLL_MS = 700;

/**
 * Runs the same `remotion render` the CLI script does, from the editor. Save
 * only persists the project locally, so before this the only path to an MP4 was
 * Export JSON plus a terminal command — the step nobody finds. Progress is
 * parsed from Remotion's own output on the dev server; the finished file's path
 * on disk is shown because that's the question people actually have ("where did
 * it go?"), with a download link for when the editor isn't on that machine.
 */
export const RenderButton: React.FC<{ style: React.CSSProperties }> = ({ style }) => {
  const project = useProjectStore((s) => s.project) as VideoProject;
  const [job, setJob] = React.useState<RenderJob | null>(null);
  const [starting, setStarting] = React.useState(false);

  const jobId = job?.status === "running" ? job.id : null;

  React.useEffect(() => {
    if (!jobId) return;
    const timer = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/render-status?id=${encodeURIComponent(jobId)}`);
        if (res.ok) setJob(await res.json());
      } catch {
        /* dev server restarted mid-render — the next poll picks it back up */
      }
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
      if (!res.ok) throw new Error(body.error ?? `Render failed to start (${res.status})`);
      setJob({ id: body.id, status: "running", progress: 0, phase: "Starting Remotion…" });
    } catch (err) {
      setJob({ id: "", status: "error", progress: 0, phase: "Failed", error: String(err) });
    } finally {
      setStarting(false);
    }
  }

  const running = starting || job?.status === "running";
  const percent = Math.round((job?.progress ?? 0) * 100);

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
      <button
        onClick={startRender}
        disabled={running}
        style={{
          ...style,
          cursor: running ? "wait" : "pointer",
          borderColor: running ? editorColors.accent : undefined,
          color: running ? editorColors.accent : undefined,
        }}
        title="Renders this project to an MP4 with Remotion — takes a while for a long video."
      >
        {running ? `Rendering ${percent}%` : "Render MP4"}
      </button>

      {job ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 340,
            padding: 12,
            borderRadius: 8,
            border: `1px solid ${editorColors.border}`,
            background: editorColors.panel,
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
            zIndex: 20,
            fontSize: 11,
            color: editorColors.text,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span>{job.phase}</span>
            <button
              onClick={() => setJob(null)}
              style={{
                background: "transparent",
                border: "none",
                color: editorColors.textDim,
                cursor: "pointer",
                padding: 0,
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ height: 6, borderRadius: 3, background: editorColors.panelElevated, overflow: "hidden" }}>
            <div
              style={{
                width: `${percent}%`,
                height: "100%",
                background: job.status === "error" ? "#ff8a65" : editorColors.accent,
                transition: "width 200ms linear",
              }}
            />
          </div>

          {job.status === "done" && job.outputPath ? (
            <>
              <div style={{ marginTop: 8, color: editorColors.textDim }}>Saved to</div>
              <code
                style={{
                  display: "block",
                  marginTop: 2,
                  padding: "6px 8px",
                  borderRadius: 6,
                  background: editorColors.panelElevated,
                  wordBreak: "break-all",
                  fontSize: 10,
                }}
              >
                {job.outputPath}
              </code>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <a
                  href={`/api/render-file?id=${encodeURIComponent(job.id)}`}
                  style={{ color: editorColors.accent, textDecoration: "none" }}
                >
                  Download MP4
                </a>
                <button
                  onClick={() => void navigator.clipboard?.writeText(job.outputPath ?? "")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: editorColors.textDim,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Copy path
                </button>
              </div>
            </>
          ) : null}

          {job.status === "error" ? (
            <pre
              style={{
                marginTop: 8,
                maxHeight: 160,
                overflow: "auto",
                whiteSpace: "pre-wrap",
                color: "#ff8a65",
                fontSize: 10,
              }}
            >
              {job.error}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
