import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { syncAssets, SOURCE_DIRS } from "./scripts/syncAssets";

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

/** Writes editor data to a real JSON file as well as the browser library.
 * A temporary sibling is renamed only after the complete JSON is on disk, so
 * an interrupted write cannot leave the sole backup half-written. */
function jsonPersistencePlugin(): Plugin {
  return {
    name: "json-persistence-api",
    configureServer(server) {
      server.middlewares.use("/api/save-json", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        readBody(req)
          .then((raw) => {
            const { kind, data } = JSON.parse(raw) as { kind: "project" | "storyboard"; data: { id?: string } };
            if (kind !== "project" && kind !== "storyboard") throw new Error("Invalid JSON kind");
            if (!data || typeof data.id !== "string" || !data.id.trim()) throw new Error("Missing id");
            const directory = path.resolve(__dirname, kind === "project" ? "projects" : "storyboards");
            const filename = `${slugify(data.id)}.json`;
            const target = path.join(directory, filename);
            const temporary = `${target}.tmp`;
            fs.mkdirSync(directory, { recursive: true });
            // Keep recoverable on-disk versions in addition to in-session Undo.
            // This protects work across browser/server restarts and accidental
            // deletes that were already auto-saved over the main JSON file.
            if (fs.existsSync(target)) {
              const historyDirectory = path.join(directory, ".history", slugify(data.id));
              fs.mkdirSync(historyDirectory, { recursive: true });
              const version = path.join(historyDirectory, `${Date.now()}-${Math.random().toString(36).slice(2, 6)}.json`);
              fs.copyFileSync(target, version);
              const versions = fs.readdirSync(historyDirectory)
                .filter((entry) => entry.endsWith(".json"))
                .map((entry) => ({ entry, modified: fs.statSync(path.join(historyDirectory, entry)).mtimeMs }))
                .sort((a, b) => b.modified - a.modified);
              for (const old of versions.slice(100)) fs.rmSync(path.join(historyDirectory, old.entry), { force: true });
            }
            fs.writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
            fs.renameSync(temporary, target);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true, file: `${kind === "project" ? "projects" : "storyboards"}/${filename}` }));
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

/**
 * Keeps the asset folders and the generated manifest in step with each other
 * while the dev server is running.
 *
 * `props/`, `ai/`, `sfx/` and `fonts/` are the SOURCE of every prop, tool logo
 * and sound in the editor, but nothing reads them directly: `syncAssets` copies
 * them into `public/` and regenerates `assets.generated.ts`, which is what the
 * registries import. Dropping a file into `props/` therefore did nothing
 * visible until someone remembered to run `npm run assets:sync` — a hidden
 * manual step that reads as "my asset didn't upload". Now the sync runs when the
 * server starts and again whenever one of those folders changes, and the
 * manifest rewrite hot-reloads the Visuals tab on its own.
 */
function assetSyncPlugin(): Plugin {
  const sources = Object.values(SOURCE_DIRS).map((dir) => path.resolve(dir));
  const isSourceFile = (file: string) => {
    const resolved = path.resolve(file);
    return sources.some((dir) => resolved.startsWith(dir + path.sep));
  };

  return {
    name: "asset-sync",
    configureServer(server) {
      const run = (reason: string) => {
        try {
          const result = syncAssets();
          if (result.changed) {
            console.log(`[asset-sync] ${reason}: ${result.props} props, ${result.logos} logos, ${result.sfx} sfx`);
          }
        } catch (error) {
          // A broken sync must not take the dev server down with it.
          console.error("[asset-sync] failed:", error);
        }
      };

      run("startup");

      // Coalesced: dropping a folder of props fires one event per file, and
      // each one would otherwise rewrite the manifest and reload the editor.
      let timer: NodeJS.Timeout | undefined;
      const schedule = (file: string) => {
        // Only the source folders. `syncAssets` writes into `public/` and
        // `src/registries/`, both inside the watched root — reacting to those
        // would make it re-trigger itself forever.
        if (!isSourceFile(file)) return;
        clearTimeout(timer);
        timer = setTimeout(() => run(`changed ${path.basename(file)}`), 150);
      };

      server.watcher.add(sources);
      server.watcher.on("add", schedule);
      server.watcher.on("unlink", schedule);
      server.watcher.on("change", schedule);
    },
    // The production build reads the manifest at compile time, so it has to be
    // current before Vite starts resolving modules.
    buildStart() {
      if (process.env.NODE_ENV !== "development") syncAssets();
    },
  };
}

export default defineConfig({
  plugins: [react(), assetSyncPlugin(), jsonPersistencePlugin(), customAssetsPlugin(), renderPlugin()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    port: 5173,
  },
});
