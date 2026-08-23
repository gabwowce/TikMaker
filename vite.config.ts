import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const customAssetsDir = path.resolve(__dirname, "public/assets/custom");
const manifestPath = path.join(customAssetsDir, "manifest.json");

type CustomAsset = { id: string; label: string; file: string; src: string };

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

            const entry: CustomAsset = { id, label: label || filename, file, src: `/assets/custom/${file}` };
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
    },
  };
}

export default defineConfig({
  plugins: [react(), customAssetsPlugin()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    port: 5173,
  },
});
