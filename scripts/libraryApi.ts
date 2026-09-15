import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
export const COLLECTIONS = {
  project: "projects",
  scene: "library/scenes",
  background: "library/backgrounds",
  voiceVariant: "library/voice-variants",
} as const;
export type CollectionKind = keyof typeof COLLECTIONS;
const PREFERENCES_FILE = "library/preferences.json";
const HISTORY_LIMIT = 100;
export function isCollectionKind(value: unknown): value is CollectionKind {
  return typeof value === "string" && value in COLLECTIONS;
}
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "entry";
}
function readBody(req: import("http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}
function writeAtomic(target: string, data: unknown) {
  const temporary = `${target}.tmp`;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
  fs.renameSync(temporary, target);
}
function snapshot(directory: string, id: string, target: string) {
  if (!fs.existsSync(target)) return;
  const historyDirectory = path.join(directory, ".history", slugify(id));
  fs.mkdirSync(historyDirectory, { recursive: true });
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}.json`;
  fs.copyFileSync(target, path.join(historyDirectory, stamp));
  const versions = fs
    .readdirSync(historyDirectory)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => ({
      entry,
      modified: fs.statSync(path.join(historyDirectory, entry)).mtimeMs,
    }))
    .sort((a, b) => b.modified - a.modified);
  for (const old of versions.slice(HISTORY_LIMIT))
    fs.rmSync(path.join(historyDirectory, old.entry), { force: true });
}
export function createLibraryApi(root: string) {
  function directoryFor(kind: CollectionKind) {
    return path.resolve(root, COLLECTIONS[kind]);
  }
  function fileFor(kind: CollectionKind, id: string) {
    return path.join(directoryFor(kind), `${slugify(id)}.json`);
  }
  return {
    save(
      kind: CollectionKind,
      data: {
        id?: unknown;
      },
    ) {
      if (!data || typeof data.id !== "string" || !data.id.trim())
        throw new Error("Entry has no id");
      const target = fileFor(kind, data.id);
      snapshot(directoryFor(kind), data.id, target);
      writeAtomic(target, data);
      return path.relative(root, target).replace(/\\/g, "/");
    },
    remove(kind: CollectionKind, id: string) {
      const target = fileFor(kind, id);
      if (!fs.existsSync(target)) return null;
      const trash = path.resolve(root, "library/.trash", kind);
      fs.mkdirSync(trash, { recursive: true });
      const destination = path.join(trash, `${Date.now()}-${slugify(id)}.json`);
      fs.renameSync(target, destination);
      return path.relative(root, destination).replace(/\\/g, "/");
    },
    list(kind: CollectionKind): unknown[] {
      const directory = directoryFor(kind);
      if (!fs.existsSync(directory)) return [];
      const entries: unknown[] = [];
      for (const file of fs.readdirSync(directory)) {
        if (!file.endsWith(".json")) continue;
        try {
          entries.push(
            JSON.parse(fs.readFileSync(path.join(directory, file), "utf-8")),
          );
        } catch {}
      }
      return entries;
    },
    versions(kind: CollectionKind, id: string) {
      const directory = path.join(directoryFor(kind), ".history", slugify(id));
      if (!fs.existsSync(directory)) return [];
      return fs
        .readdirSync(directory)
        .filter((entry) => entry.endsWith(".json"))
        .map((entry) => {
          const file = path.join(directory, entry);
          let scenes: number | undefined;
          let title: string | undefined;
          let voiceClips = 0;
          let sfxClips = 0;
          try {
            const data = JSON.parse(fs.readFileSync(file, "utf-8"));
            scenes = Array.isArray(data?.scenes)
              ? data.scenes.length
              : undefined;
            title = typeof data?.title === "string" ? data.title : undefined;
            const clips = Array.isArray(data?.audioClips)
              ? data.audioClips
              : [];
            voiceClips = clips.filter(
              (clip: { sfxId?: unknown }) =>
                typeof clip?.sfxId === "string" && clip.sfxId.startsWith("vo-"),
            ).length;
            sfxClips = clips.length - voiceClips;
          } catch {}
          return {
            file: entry,
            savedAt: fs.statSync(file).mtimeMs,
            scenes,
            title,
            voiceClips,
            sfxClips,
          };
        })
        .sort((a, b) => b.savedAt - a.savedAt);
    },
    version(kind: CollectionKind, id: string, file: string) {
      const directory = path.join(directoryFor(kind), ".history", slugify(id));
      const target = path.resolve(directory, file);
      if (!target.startsWith(path.resolve(directory) + path.sep))
        throw new Error("Invalid version");
      return JSON.parse(fs.readFileSync(target, "utf-8"));
    },
    trash(kind: CollectionKind) {
      const directory = path.resolve(root, "library/.trash", kind);
      if (!fs.existsSync(directory)) return [];
      return fs
        .readdirSync(directory)
        .filter((entry) => entry.endsWith(".json"))
        .map((entry) => {
          const file = path.join(directory, entry);
          let title: string | undefined;
          let id: string | undefined;
          let scenes: number | undefined;
          try {
            const data = JSON.parse(fs.readFileSync(file, "utf-8"));
            title = typeof data?.title === "string" ? data.title : data?.name;
            id = typeof data?.id === "string" ? data.id : undefined;
            scenes = Array.isArray(data?.scenes)
              ? data.scenes.length
              : undefined;
          } catch {}
          return {
            file: entry,
            deletedAt: fs.statSync(file).mtimeMs,
            title,
            id,
            scenes,
          };
        })
        .sort((a, b) => b.deletedAt - a.deletedAt);
    },
    restore(kind: CollectionKind, file: string) {
      const directory = path.resolve(root, "library/.trash", kind);
      const source = path.resolve(directory, file);
      if (!source.startsWith(path.resolve(directory) + path.sep))
        throw new Error("Invalid trash file");
      const data = JSON.parse(fs.readFileSync(source, "utf-8"));
      const written = this.save(kind, data);
      fs.rmSync(source, { force: true });
      return written;
    },
    readPreferences(): unknown {
      const file = path.resolve(root, PREFERENCES_FILE);
      if (!fs.existsSync(file)) return {};
      try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
      } catch {
        return {};
      }
    },
    writePreferences(preferences: unknown) {
      writeAtomic(path.resolve(root, PREFERENCES_FILE), preferences);
    },
  };
}
export function libraryApiPlugin(root: string): Plugin {
  const api = createLibraryApi(root);
  function json(
    res: import("http").ServerResponse,
    status: number,
    body: unknown,
  ) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
  }
  return {
    name: "library-api",
    configureServer(server) {
      server.middlewares.use("/api/library/save", (req, res) => {
        if (req.method !== "POST")
          return json(res, 405, { error: "POST only" });
        readBody(req)
          .then((raw) => {
            const { kind, data } = JSON.parse(raw) as {
              kind: unknown;
              data: {
                id?: unknown;
              };
            };
            if (!isCollectionKind(kind))
              throw new Error(`Unknown library kind: ${String(kind)}`);
            json(res, 200, { ok: true, file: api.save(kind, data) });
          })
          .catch((err) => json(res, 500, { error: String(err) }));
      });
      server.middlewares.use("/api/library/delete", (req, res) => {
        if (req.method !== "POST")
          return json(res, 405, { error: "POST only" });
        readBody(req)
          .then((raw) => {
            const { kind, id } = JSON.parse(raw) as {
              kind: unknown;
              id: unknown;
            };
            if (!isCollectionKind(kind))
              throw new Error(`Unknown library kind: ${String(kind)}`);
            if (typeof id !== "string" || !id.trim())
              throw new Error("Missing id");
            json(res, 200, { ok: true, trashed: api.remove(kind, id) });
          })
          .catch((err) => json(res, 500, { error: String(err) }));
      });
      server.middlewares.use("/api/library/list", (req, res) => {
        const kind = new URL(
          req.url ?? "",
          "http://localhost",
        ).searchParams.get("kind");
        if (!isCollectionKind(kind))
          return json(res, 400, { error: "Unknown library kind" });
        json(res, 200, api.list(kind));
      });
      server.middlewares.use("/api/library/versions", (req, res) => {
        const url = new URL(req.url ?? "", "http://localhost");
        const kind = url.searchParams.get("kind");
        const id = url.searchParams.get("id");
        const file = url.searchParams.get("file");
        if (!isCollectionKind(kind) || !id)
          return json(res, 400, { error: "kind and id required" });
        try {
          json(
            res,
            200,
            file ? api.version(kind, id, file) : api.versions(kind, id),
          );
        } catch (err) {
          json(res, 500, { error: String(err) });
        }
      });
      server.middlewares.use("/api/library/trash", (req, res) => {
        if (req.method === "GET") {
          const kind = new URL(
            req.url ?? "",
            "http://localhost",
          ).searchParams.get("kind");
          if (!isCollectionKind(kind))
            return json(res, 400, { error: "Unknown library kind" });
          return json(res, 200, api.trash(kind));
        }
        if (req.method !== "POST")
          return json(res, 405, { error: "GET or POST" });
        readBody(req)
          .then((raw) => {
            const { kind, file } = JSON.parse(raw) as {
              kind: unknown;
              file: unknown;
            };
            if (!isCollectionKind(kind))
              throw new Error("Unknown library kind");
            if (typeof file !== "string" || !file)
              throw new Error("Missing file");
            json(res, 200, { ok: true, file: api.restore(kind, file) });
          })
          .catch((err) => json(res, 500, { error: String(err) }));
      });
      server.middlewares.use("/api/library/preferences", (req, res) => {
        if (req.method === "GET") return json(res, 200, api.readPreferences());
        if (req.method !== "POST")
          return json(res, 405, { error: "GET or POST" });
        readBody(req)
          .then((raw) => {
            api.writePreferences(JSON.parse(raw));
            json(res, 200, { ok: true });
          })
          .catch((err) => json(res, 500, { error: String(err) }));
      });
    },
  };
}
