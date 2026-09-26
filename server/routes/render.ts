import express from "express";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { OUT_DIR, ROOT } from "../config.js";
import { newId } from "../uploads.js";

// A render takes minutes, far longer than one HTTP request should stay open.
// So POST only STARTS it and answers with a job id; the client then polls
// GET /api/renders/:id for progress, and downloads /:id/file when it's done.
type RenderJob = {
  id: string;
  status: "running" | "done" | "error";
  progress: number; // 0..1
  phase: string;
  outputPath?: string;
  error?: string;
};

// Jobs live in memory: restarting the server forgets them, but the finished
// MP4s stay in out/.
const jobs = new Map<string, RenderJob>();

// Remotion prints "Rendered 120/300" then "Stitched 300/300". Frames are ~85%
// of the work, encoding the rest.
function readProgress(job: RenderJob, text: string) {
  const rendered = /Rendered (\d+)\/(\d+)/.exec(text);
  const stitched = /Stitched (\d+)\/(\d+)/.exec(text);
  if (rendered) {
    job.progress = (Number(rendered[1]) / Number(rendered[2])) * 0.85;
    job.phase = `Rendering frames ${rendered[1]}/${rendered[2]}`;
  } else if (stitched) {
    job.progress = 0.85 + (Number(stitched[1]) / Number(stitched[2])) * 0.15;
    job.phase = `Encoding ${stitched[1]}/${stitched[2]}`;
  }
}

export const renderRouter = express.Router();

// POST /api/renders — start rendering { project }; answers 202 + { id }
renderRouter.post("/", (request, response) => {
  const project = request.body?.project;
  if (!Array.isArray(project?.scenes) || project.scenes.length === 0) {
    response.status(400).json({ error: "Project has no scenes" });
    return;
  }

  const id = newId(project.title || project.id || "video");
  const outputPath = path.join(OUT_DIR, `${id}.mp4`);
  const propsPath = path.join(OUT_DIR, `.${id}.props.json`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(propsPath, JSON.stringify({ project }), "utf-8");

  const job: RenderJob = { id, status: "running", progress: 0, phase: "Starting Remotion…" };
  jobs.set(id, job);

  const child = spawn(
    "npx",
    ["remotion", "render", "TikTokVideo", outputPath, `--props=${propsPath}`],
    { cwd: ROOT, shell: true },
  );
  child.stdout.on("data", (chunk: Buffer) => readProgress(job, chunk.toString()));
  child.stderr.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    readProgress(job, text);
    if (/Error|error:/.test(text)) job.error = text.slice(-600);
  });
  child.on("close", (code) => {
    fs.rmSync(propsPath, { force: true });
    if (code === 0 && fs.existsSync(outputPath)) {
      Object.assign(job, { status: "done", progress: 1, phase: "Done", outputPath });
    } else {
      job.status = "error";
      job.phase = "Failed";
      job.error = job.error ?? `Render exited with code ${code}`;
    }
  });

  response.status(202).json({ id });
});

// GET /api/renders/:id — progress of one job
renderRouter.get("/:id", (request, response) => {
  const job = jobs.get(request.params.id);
  if (!job) {
    response.status(404).json({ error: "Unknown render job" });
    return;
  }
  response.json(job);
});

// GET /api/renders/:id/file — download the finished MP4
renderRouter.get("/:id/file", (request, response) => {
  const job = jobs.get(request.params.id);
  if (!job?.outputPath || !fs.existsSync(job.outputPath)) {
    response.status(404).json({ error: "Render not finished" });
    return;
  }
  response.download(job.outputPath);
});
