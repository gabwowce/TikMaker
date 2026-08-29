import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const customAssetsDir = path.resolve(__dirname, "public/assets/custom");
const manifestPath = path.join(customAssetsDir, "manifest.json");

const customSfxDir = path.resolve(__dirname, "public/assets/custom-sfx");
const sfxManifestPath = path.resolve(__dirname, "src/config/customSfx.json");

const sfxOverridesPath = path.resolve(__dirname, "src/config/sfxOverrides.json");

/** `kind` tells the editor whether this import is a still or a clip — a video
 * has to become a `recording` visual, not an `image`, and can't be previewed
 * with an <img>. Entries written before this field existed have no `kind` and
 * are treated as images. */
type CustomAsset = { id: string; label: string; file: string; src: string; kind: "image" | "video" };
type CustomSfx = { id: string; label: string; file: string; src: string; group: string };

function readManifest(): CustomAsset[] {
  if (!fs.existsSync(manifestPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  } catch {
    return [];
  }
}

function writeManifest(list: CustomAsset[]) {
  fs.mkdirSync(customAssetsDir, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(list, null, 2));
}

function readSfxManifest(): CustomSfx[] {
  if (!fs.existsSync(sfxManifestPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(sfxManifestPath, "utf-8"));
  } catch {
    return [];
  }
}

function writeSfxManifest(list: CustomSfx[]) {
  fs.mkdirSync(path.dirname(sfxManifestPath), { recursive: true });
  fs.writeFileSync(sfxManifestPath, JSON.stringify(list, null, 2));
}

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".m4v"]);

function kindForFile(ext: string): "image" | "video" {
  return VIDEO_EXTENSIONS.has(ext.toLowerCase()) ? "video" : "image";
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "asset";
}

function readBody(req: import("http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

/**
 * Dev-only upload API for user-supplied images: the editor has no backend,
 * so this middleware writes the file straight into public/assets/custom and
 * records its label in manifest.json — the label is what lets a human (or an
 * AI authoring a project JSON) know what the picture is for.
 */
function customAssetsPlugin(): Plugin {
  return {
    name: "custom-assets-api",
    configureServer(server) {
      server.middlewares.use("/api/custom-assets", (req, res) => {
        if (req.method !== "GET") {
          res.statusCode = 405;
          res.end();
          return;
        }
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(readManifest()));
      });

      server.middlewares.use("/api/upload-asset", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        readBody(req)
          .then((raw) => {
            const { filename, label, dataBase64 } = JSON.parse(raw) as {
              filename: string;
              label: string;
              dataBase64: string;
            };
            const ext = path.extname(filename) || ".png";
            const id = `${slugify(label || filename)}-${Date.now().toString(36)}`;
            const file = `${id}${ext}`;

            fs.mkdirSync(customAssetsDir, { recursive: true });
            fs.writeFileSync(path.join(customAssetsDir, file), Buffer.from(dataBase64, "base64"));

            const entry: CustomAsset = {
              id,
              label: label || filename,
              file,
              src: `/assets/custom/${file}`,
              kind: kindForFile(ext),
            };
            const manifest = readManifest();
            manifest.push(entry);
            writeManifest(manifest);

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(entry));
          })
          .catch((err) => {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: String(err) }));
          });
      });

      server.middlewares.use("/api/delete-asset", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        readBody(req)
          .then((raw) => {
            const { id } = JSON.parse(raw) as { id: string };
            const manifest = readManifest();
            const entry = manifest.find((a) => a.id === id);
            const remaining = manifest.filter((a) => a.id !== id);
            if (entry) {
              const filePath = path.join(customAssetsDir, entry.file);
              if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
            writeManifest(remaining);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true }));
          })
          .catch((err) => {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: String(err) }));
          });
      });

      server.middlewares.use("/api/custom-sfx", (req, res) => {
        if (req.method !== "GET") {
          res.statusCode = 405;
          res.end();
          return;
        }
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(readSfxManifest()));
      });

      server.middlewares.use("/api/upload-sfx", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        readBody(req)
          .then((raw) => {
            const { filename, label, group, dataBase64 } = JSON.parse(raw) as {
              filename: string;
              label: string;
              group: string;
              dataBase64: string;
            };
            const ext = path.extname(filename) || ".mp3";
            const id = `${slugify(label || filename)}-${Date.now().toString(36)}`;
            const file = `${id}${ext}`;

            fs.mkdirSync(customSfxDir, { recursive: true });
            fs.writeFileSync(path.join(customSfxDir, file), Buffer.from(dataBase64, "base64"));

            const entry: CustomSfx = {
              id,
              label: label || filename,
              file,
              src: `/assets/custom-sfx/${file}`,
              group: group || "misc",
            };
            const manifest = readSfxManifest();
            manifest.push(entry);
            writeSfxManifest(manifest);

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(entry));
          })
          .catch((err) => {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: String(err) }));
          });
      });

      server.middlewares.use("/api/delete-sfx", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        readBody(req)
          .then((raw) => {
            const { id } = JSON.parse(raw) as { id: string };
            const manifest = readSfxManifest();
            const entry = manifest.find((a) => a.id === id);
            const remaining = manifest.filter((a) => a.id !== id);
            if (entry) {
              const filePath = path.join(customSfxDir, entry.file);
              if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
            writeSfxManifest(remaining);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true }));
          })
          .catch((err) => {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: String(err) }));
          });
      });

      server.middlewares.use("/api/sfx-overrides", (req, res) => {
        if (req.method === "GET") {
          res.setHeader("Content-Type", "application/json");
          if (!fs.existsSync(sfxOverridesPath)) {
            res.end(JSON.stringify({}));
            return;
          }
          try {
            res.end(fs.readFileSync(sfxOverridesPath, "utf-8"));
          } catch {
            res.end(JSON.stringify({}));
          }
          return;
        }
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        readBody(req)
          .then((raw) => {
            const overrides = JSON.parse(raw);
            fs.mkdirSync(path.dirname(sfxOverridesPath), { recursive: true });
            fs.writeFileSync(sfxOverridesPath, JSON.stringify(overrides, null, 2));
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true }));
          })
          .catch((err) => {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: String(err) }));
          });
      });
    },
  };
}


type RenderJob = {
  id: string;
  status: "running" | "done" | "error";
  /** 0..1 across the two phases remotion reports (frames, then stitching). */
  progress: number;
  phase: string;
  outputPath?: string;
  error?: string;
};

const renderJobs = new Map<string, RenderJob>();
const rendersDir = path.resolve(__dirname, "out");

/**
 * Dev-only render API. The editor keeps projects in the browser, so without
 * this the only way to get an MP4 was Export JSON followed by a terminal
 * command — which is the one step nobody discovers. This writes the project to
 * a temp props file, shells out to the same `remotion render` the CLI script
 * uses, and reports progress by parsing its output.
 */
function renderPlugin(): Plugin {
  return {
    name: "render-api",
    configureServer(server) {
      server.middlewares.use("/api/render", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        readBody(req)
          .then((raw) => {
            const { project } = JSON.parse(raw) as { project: { id?: string; title?: string; scenes?: unknown[] } };
            if (!project?.scenes?.length) throw new Error("Project has no scenes");

            const id = `${slugify(project.title || project.id || "video")}-${Date.now().toString(36)}`;
            const outputPath = path.join(rendersDir, `${id}.mp4`);
            const propsPath = path.join(rendersDir, `.${id}.props.json`);
            fs.mkdirSync(rendersDir, { recursive: true });
            fs.writeFileSync(propsPath, JSON.stringify({ project }), "utf-8");

            const job: RenderJob = { id, status: "running", progress: 0, phase: "Starting Remotion…" };
            renderJobs.set(id, job);

            const child = spawn(
              "npx",
              ["remotion", "render", "TikTokVideo", outputPath, `--props=${propsPath}`],
              { cwd: __dirname, shell: true }
            );

            const readOutput = (chunk: Buffer) => {
              const text = chunk.toString();
              // `remotion render` reports "Rendered 12/576" then "Stitched 40/576".
              // Frames are the slow half, so they get most of the bar.
              const rendered = /Rendered (\d+)\/(\d+)/.exec(text);
              const stitched = /Stitched (\d+)\/(\d+)/.exec(text);
              if (rendered) {
                job.progress = (Number(rendered[1]) / Number(rendered[2])) * 0.85;
                job.phase = `Rendering frames ${rendered[1]}/${rendered[2]}`;
              } else if (stitched) {
                job.progress = 0.85 + (Number(stitched[1]) / Number(stitched[2])) * 0.15;
                job.phase = `Encoding ${stitched[1]}/${stitched[2]}`;
              }
            };
            child.stdout.on("data", readOutput);
            child.stderr.on("data", (chunk: Buffer) => {
              readOutput(chunk);
              const text = chunk.toString();
              if (/Error|error:/.test(text)) job.error = text.slice(-600);
            });

            child.on("close", (code) => {
              fs.rmSync(propsPath, { force: true });
              if (code === 0 && fs.existsSync(outputPath)) {
                job.status = "done";
                job.progress = 1;
                job.phase = "Done";
                job.outputPath = outputPath;
              } else {
                job.status = "error";
                job.phase = "Failed";
                job.error = job.error ?? `Render exited with code ${code}`;
              }
            });

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ id }));
          })
          .catch((err) => {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: String(err) }));
          });
      });

      server.middlewares.use("/api/render-status", (req, res) => {
        const id = new URL(req.url ?? "", "http://localhost").searchParams.get("id") ?? "";
        const job = renderJobs.get(id);
        res.setHeader("Content-Type", "application/json");
        if (!job) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: "Unknown render job" }));
          return;
        }
        res.end(JSON.stringify(job));
      });

      server.middlewares.use("/api/render-file", (req, res) => {
        const id = new URL(req.url ?? "", "http://localhost").searchParams.get("id") ?? "";
        const job = renderJobs.get(id);
        if (!job?.outputPath || !fs.existsSync(job.outputPath)) {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }
        res.setHeader("Content-Type", "video/mp4");
        res.setHeader("Content-Disposition", `attachment; filename="${path.basename(job.outputPath)}"`);
        fs.createReadStream(job.outputPath).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), customAssetsPlugin(), renderPlugin()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    port: 5173,
  },
});
