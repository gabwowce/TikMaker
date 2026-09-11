import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

/**
 * Every kind of thing the editor keeps, and the folder it lives in.
 *
 * ONE table, because the rules are identical for all of them: a file per entry,
 * named by its id, written atomically, snapshotted before it is overwritten and
 * moved to the trash instead of unlinked. The editor used to keep projects and
 * storyboards on disk but scenes, templates and backgrounds only in
 * localStorage — so half the library did not survive a clone, another browser
 * or a cleared cache. There is no reason for two answers to "where does my work
 * live", so there is one.
 */
export const COLLECTIONS = {
  project: "projects",
  storyboard: "storyboards",
  scene: "library/scenes",
  template: "library/templates",
  background: "library/backgrounds",
  voiceVariant: "library/voice-variants",
} as const;

export type CollectionKind = keyof typeof COLLECTIONS;

const PREFERENCES_FILE = "library/preferences.json";

/** Versions kept per entry. The folder is gitignored. */
const HISTORY_LIMIT = 40;

/**
 * The shortest gap between two snapshots of the same entry.
 *
 * A snapshot used to be taken before EVERY write, and with a 400ms autosave
 * that meant one per keystroke burst: the 100-deep ring turned over in about a
 * minute, so "restore an older version" could only ever offer the last minute
 * of work — useless exactly when you need it, which is after a restart. It also
 * put a full file copy plus ~100 `stat` calls on the save path, which is the
 * path that has to stay fast.
 *
 * Five minutes apart, 40 deep, is a few hours of real editing history instead,
 * and it costs a file copy roughly once per five minutes.
 */
const SNAPSHOT_INTERVAL = 5 * 60 * 1000;

export function isCollectionKind(value: unknown): value is CollectionKind {
  return typeof value === "string" && value in COLLECTIONS;
}

function slugify(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
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

/**
 * Writes JSON so an interrupted write cannot destroy what was already there:
 * the content lands in a sibling `.tmp` and only a COMPLETE file is renamed
 * over the target. A rename inside one filesystem is atomic, so a reader sees
 * either the whole old file or the whole new one, never half of either.
 */
function writeAtomic(target: string, data: unknown) {
  const temporary = `${target}.tmp`;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
  fs.renameSync(temporary, target);
}

/** When each entry was last snapshotted, so `SNAPSHOT_INTERVAL` can be enforced
 * without reading the history folder on every save. */
const lastSnapshotAt = new Map<string, number>();

/**
 * Copies the current file aside before it is overwritten, at most once per
 * `SNAPSHOT_INTERVAL` unless `force` says this is a destructive moment.
 *
 * In-session Undo covers the mistakes you notice immediately; this covers the
 * ones you notice after a restart, which Undo cannot reach.
 */
function snapshot(directory: string, id: string, target: string, force = false) {
  if (!fs.existsSync(target)) return;

  const key = `${directory}:${id}`;
  const now = Date.now();
  const previous = lastSnapshotAt.get(key);
  if (!force && previous !== undefined && now - previous < SNAPSHOT_INTERVAL) return;
  lastSnapshotAt.set(key, now);

  const historyDirectory = path.join(directory, ".history", slugify(id));
  fs.mkdirSync(historyDirectory, { recursive: true });
  const stamp = `${now}-${Math.random().toString(36).slice(2, 6)}.json`;
  fs.copyFileSync(target, path.join(historyDirectory, stamp));
  const versions = fs
    .readdirSync(historyDirectory)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => ({ entry, modified: fs.statSync(path.join(historyDirectory, entry)).mtimeMs }))
    .sort((a, b) => b.modified - a.modified);
  for (const old of versions.slice(HISTORY_LIMIT)) fs.rmSync(path.join(historyDirectory, old.entry), { force: true });
}

/**
 * Deletes history folders for entries that no longer exist.
 *
 * Nothing ever cleaned these up, so they accumulated indefinitely — at the time
 * this was written, 15 of the 22 folders under `projects/.history` belonged to
 * projects that had been deleted, and they were most of the 10MB.
 */
function pruneOrphanHistory(directory: string): string[] {
  const historyRoot = path.join(directory, ".history");
  if (!fs.existsSync(historyRoot)) return [];
  const live = new Set(
    fs.existsSync(directory)
      ? fs.readdirSync(directory).filter((file) => file.endsWith(".json")).map((file) => file.slice(0, -".json".length))
      : []
  );
  const removed: string[] = [];
  for (const folder of fs.readdirSync(historyRoot)) {
    const full = path.join(historyRoot, folder);
    if (!fs.statSync(full).isDirectory()) continue;
    if (live.has(folder)) continue;
    fs.rmSync(full, { recursive: true, force: true });
    removed.push(folder);
  }
  return removed;
}

export function createLibraryApi(root: string) {
  const directoryFor = (kind: CollectionKind) => path.resolve(root, COLLECTIONS[kind]);
  const fileFor = (kind: CollectionKind, id: string) => path.join(directoryFor(kind), `${slugify(id)}.json`);
  const trashFor = (kind: CollectionKind) => path.resolve(root, "library/.trash", kind);

  /**
   * Moves aside every OTHER file in the collection that claims `id`.
   *
   * `slugify` is many-to-one and the filename is derived from the id, so the
   * two can drift apart: rename a file by hand, pull one from git under another
   * name, or give two entries ids that slug the same, and the collection ends
   * up with two files holding one id. `list()` returns both, the loader does
   * `library[entry.id] = entry`, and the survivor is whichever readdir happened
   * to yield last — so edits land in one file while the editor shows the other.
   *
   * Moved to the trash rather than deleted, for the same reason `remove` does:
   * the losing copy may be the one with the work in it, and it costs nothing to
   * keep it.
   */
  function retireDuplicates(kind: CollectionKind, id: string, keep: string): string[] {
    const directory = directoryFor(kind);
    if (!fs.existsSync(directory)) return [];
    const retired: string[] = [];
    for (const file of fs.readdirSync(directory)) {
      if (!file.endsWith(".json")) continue;
      const candidate = path.join(directory, file);
      if (path.resolve(candidate) === path.resolve(keep)) continue;
      let other: { id?: unknown };
      try {
        other = JSON.parse(fs.readFileSync(candidate, "utf-8"));
      } catch {
        continue; // Unreadable files are the loader's problem to report, not a duplicate.
      }
      if (other?.id !== id) continue;
      const trash = trashFor(kind);
      fs.mkdirSync(trash, { recursive: true });
      fs.renameSync(candidate, path.join(trash, `${Date.now()}-duplicate-${file}`));
      retired.push(file);
    }
    return retired;
  }

  return {
    /**
     * One pass over every collection at startup, reporting what is wrong with
     * it rather than letting the editor discover it as missing work.
     *
     * Reports rather than repairs, except for the duplicate ids, where leaving
     * both files IS the bug — there is no reading of "two files, one id" that
     * the loader can act on correctly.
     */
    reconcile() {
      const report: { kind: CollectionKind; issue: string; detail: string }[] = [];
      for (const kind of Object.keys(COLLECTIONS) as CollectionKind[]) {
        const directory = directoryFor(kind);
        if (!fs.existsSync(directory)) continue;
        const byId = new Map<string, { file: string; modified: number }[]>();
        for (const file of fs.readdirSync(directory)) {
          if (!file.endsWith(".json")) continue;
          const full = path.join(directory, file);
          try {
            const data = JSON.parse(fs.readFileSync(full, "utf-8")) as { id?: unknown };
            if (typeof data?.id !== "string") {
              report.push({ kind, issue: "no-id", detail: file });
              continue;
            }
            const list = byId.get(data.id) ?? [];
            list.push({ file: full, modified: fs.statSync(full).mtimeMs });
            byId.set(data.id, list);
          } catch (err) {
            report.push({ kind, issue: "unreadable", detail: `${file}: ${String(err)}` });
          }
        }
        for (const [id, files] of byId) {
          if (files.length < 2) continue;
          // Newest wins: it is the one the editor was most recently writing to.
          const [newest] = [...files].sort((a, b) => b.modified - a.modified);
          const retired = retireDuplicates(kind, id, newest.file);
          report.push({ kind, issue: "duplicate-id", detail: `${id}: laikomas ${path.basename(newest.file)}, į šiukšliadėžę — ${retired.join(", ")}` });
        }

        const orphans = pruneOrphanHistory(directory);
        if (orphans.length) report.push({ kind, issue: "orphan-history", detail: `${orphans.length} aplank(-ai): ${orphans.join(", ")}` });
      }
      return report;
    },

    /** `data` is whatever arrived in the request body, so it is narrowed here
     * rather than trusted: an entry with no usable id has no filename and must
     * not be guessed at. */
    save(kind: CollectionKind, data: unknown) {
      const id = (data as { id?: unknown } | null)?.id;
      if (!data || typeof id !== "string" || !id.trim()) throw new Error("Entry has no id");
      const target = fileFor(kind, id);
      snapshot(directoryFor(kind), id, target);
      writeAtomic(target, data);
      // A file whose NAME no longer matches `slugify(id)` still holds this same
      // id, and the loader keys its library by id — so the two files fight over
      // one slot and which one wins is down to readdir order. Retiring the
      // other copy here is what stops an edit from "not saving": it did save,
      // into the file that lost the coin toss.
      retireDuplicates(kind, id, target);
      return path.relative(root, target).replace(/\\/g, "/");
    },

    /**
     * Deletes by MOVING the file into `library/.trash/`, never by unlinking it.
     * "Delete this project" and "lose this project forever" are different
     * intentions and only one of them is ever actually meant — a mis-click on a
     * video that took an evening to build has to be recoverable, and the
     * cheapest way to promise that is to never destroy the bytes.
     */
    remove(kind: CollectionKind, id: string) {
      const target = fileFor(kind, id);
      if (!fs.existsSync(target)) return null;
      // Deleting is exactly the moment a snapshot is worth having, so this one
      // ignores the interval. The trash copy below covers the file as it is
      // now; the history covers what it looked like before today's editing.
      snapshot(directoryFor(kind), id, target, true);
      const trash = trashFor(kind);
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
          entries.push(JSON.parse(fs.readFileSync(path.join(directory, file), "utf-8")));
        } catch {
          // One unreadable file must not cost you the rest of the collection.
        }
      }
      return entries;
    },

    /**
     * Every snapshot kept for one entry, newest first.
     *
     * `snapshot` has been writing these all along, but nothing could read them
     * without a file manager and a guess about which timestamp was which. A
     * safety net you cannot reach from inside the app is not a safety net —
     * `scenes` is included so you can pick the version by what it CONTAINED
     * rather than by the minute it was written.
     */
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
            scenes = Array.isArray(data?.scenes) ? data.scenes.length : undefined;
            title = typeof data?.title === "string" ? data.title : undefined;
            const clips = Array.isArray(data?.audioClips) ? data.audioClips : [];
            voiceClips = clips.filter((clip: { sfxId?: unknown }) => typeof clip?.sfxId === "string" && clip.sfxId.startsWith("vo-")).length;
            sfxClips = clips.length - voiceClips;
          } catch {
            // A snapshot that will not parse is still worth listing: you can
            // see it exists and when, which is more than nothing.
          }
          return { file: entry, savedAt: fs.statSync(file).mtimeMs, scenes, title, voiceClips, sfxClips };
        })
        .sort((a, b) => b.savedAt - a.savedAt);
    },

    /** The content of one snapshot, so the editor can preview or restore it. */
    version(kind: CollectionKind, id: string, file: string) {
      // `file` comes from the listing above; resolving it and checking it is
      // still inside the history folder keeps a crafted name from reading
      // anything else on disk.
      const directory = path.join(directoryFor(kind), ".history", slugify(id));
      const target = path.resolve(directory, file);
      if (!target.startsWith(path.resolve(directory) + path.sep)) throw new Error("Invalid version");
      return JSON.parse(fs.readFileSync(target, "utf-8"));
    },

    /** What is in the trash for one kind, newest first. */
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
            scenes = Array.isArray(data?.scenes) ? data.scenes.length : undefined;
          } catch {
            // Same reasoning as `versions`.
          }
          return { file: entry, deletedAt: fs.statSync(file).mtimeMs, title, id, scenes };
        })
        .sort((a, b) => b.deletedAt - a.deletedAt);
    },

    /** Moves a trashed entry back into its collection. */
    restore(kind: CollectionKind, file: string) {
      const directory = path.resolve(root, "library/.trash", kind);
      const source = path.resolve(directory, file);
      if (!source.startsWith(path.resolve(directory) + path.sep)) throw new Error("Invalid trash file");
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

/**
 * The editor has no backend, so the dev server is what turns "Save" into a file
 * on disk. Every route here is a thin shell over `createLibraryApi` — the rules
 * about atomic writes, history and the trash live there, so nothing else can
 * drift on what saving means.
 */
export function libraryApiPlugin(root: string): Plugin {
  const api = createLibraryApi(root);

  const json = (res: import("http").ServerResponse, status: number, body: unknown) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
  };

  return {
    name: "library-api",
    configureServer(server) {
      // One pass over the library before the editor can ask for anything. Two
      // files claiming one id is not something the browser can resolve — it
      // only ever sees whichever of them `list` yielded last — so it has to be
      // settled here, and said out loud.
      try {
        for (const entry of api.reconcile()) {
          server.config.logger.warn(`[library] ${entry.kind} · ${entry.issue} · ${entry.detail}`);
        }
      } catch (err) {
        server.config.logger.error(`[library] reconcile nepavyko: ${String(err)}`);
      }

      server.middlewares.use("/api/library/save", (req, res) => {
        if (req.method !== "POST") return json(res, 405, { error: "POST only" });
        readBody(req)
          .then((raw) => {
            const { kind, data } = JSON.parse(raw) as { kind: unknown; data: { id?: unknown } };
            if (!isCollectionKind(kind)) throw new Error(`Unknown library kind: ${String(kind)}`);
            json(res, 200, { ok: true, file: api.save(kind, data) });
          })
          .catch((err) => json(res, 500, { error: String(err) }));
      });

      server.middlewares.use("/api/library/delete", (req, res) => {
        if (req.method !== "POST") return json(res, 405, { error: "POST only" });
        readBody(req)
          .then((raw) => {
            const { kind, id } = JSON.parse(raw) as { kind: unknown; id: unknown };
            if (!isCollectionKind(kind)) throw new Error(`Unknown library kind: ${String(kind)}`);
            if (typeof id !== "string" || !id.trim()) throw new Error("Missing id");
            json(res, 200, { ok: true, trashed: api.remove(kind, id) });
          })
          .catch((err) => json(res, 500, { error: String(err) }));
      });

      server.middlewares.use("/api/library/list", (req, res) => {
        const kind = new URL(req.url ?? "", "http://localhost").searchParams.get("kind");
        if (!isCollectionKind(kind)) return json(res, 400, { error: "Unknown library kind" });
        json(res, 200, api.list(kind));
      });

      server.middlewares.use("/api/library/versions", (req, res) => {
        const url = new URL(req.url ?? "", "http://localhost");
        const kind = url.searchParams.get("kind");
        const id = url.searchParams.get("id");
        const file = url.searchParams.get("file");
        if (!isCollectionKind(kind) || !id) return json(res, 400, { error: "kind and id required" });
        try {
          json(res, 200, file ? api.version(kind, id, file) : api.versions(kind, id));
        } catch (err) {
          json(res, 500, { error: String(err) });
        }
      });

      server.middlewares.use("/api/library/trash", (req, res) => {
        if (req.method === "GET") {
          const kind = new URL(req.url ?? "", "http://localhost").searchParams.get("kind");
          if (!isCollectionKind(kind)) return json(res, 400, { error: "Unknown library kind" });
          return json(res, 200, api.trash(kind));
        }
        if (req.method !== "POST") return json(res, 405, { error: "GET or POST" });
        readBody(req)
          .then((raw) => {
            const { kind, file } = JSON.parse(raw) as { kind: unknown; file: unknown };
            if (!isCollectionKind(kind)) throw new Error("Unknown library kind");
            if (typeof file !== "string" || !file) throw new Error("Missing file");
            json(res, 200, { ok: true, file: api.restore(kind, file) });
          })
          .catch((err) => json(res, 500, { error: String(err) }));
      });

      server.middlewares.use("/api/library/preferences", (req, res) => {
        if (req.method === "GET") return json(res, 200, api.readPreferences());
        if (req.method !== "POST") return json(res, 405, { error: "GET or POST" });
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
