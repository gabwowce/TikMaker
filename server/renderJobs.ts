import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { VideoProject } from "../src/schema/project.js";
import { OUT_DIR, ROOT } from "./config.js";
import { newId } from "./uploads.js";

// A render takes minutes — far longer than one request should stay open. So
// starting one only launches `remotion render` in the background and hands
// back a job id; the editor then polls the job for progress, and downloads
// the MP4 once it's done.
export type RenderJob = {
  id: string;
  status: "running" | "done" | "error";
  progress: number; // 0..1
  phase: string;
  outputPath?: string;
  error?: string;
};

// In memory: restarting the server forgets the jobs, the MP4s stay in out/.
const jobs = new Map<string, RenderJob>();

export function getRenderJob(id: string): RenderJob | undefined {
  return jobs.get(id);
}

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

// Runs the same command you could type yourself:
//   npx remotion render TikTokVideo out/<id>.mp4 --props=<project file>
export function startRender(project: VideoProject): RenderJob {
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
  return job;
}
