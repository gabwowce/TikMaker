import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLibraryApi, COLLECTIONS } from "../libraryApi";

/**
 * The storage layer had no tests at all, which is exactly why it was where the
 * work went missing: every one of these cases was a real way to lose a project.
 */

let root: string;
let api: ReturnType<typeof createLibraryApi>;

const projectsDir = () => path.join(root, COLLECTIONS.project);
const read = (file: string) => JSON.parse(fs.readFileSync(file, "utf-8"));

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "tikmaker-library-"));
  fs.mkdirSync(path.join(root, COLLECTIONS.project), { recursive: true });
  api = createLibraryApi(root);
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe("save", () => {
  it("writes the entry to a file named after its id", () => {
    api.save("project", { id: "my-video", title: "Mano video" });
    expect(read(path.join(projectsDir(), "my-video.json"))).toMatchObject({ title: "Mano video" });
  });

  it("leaves no half-written file behind when the content is large", () => {
    api.save("project", { id: "big", scenes: Array.from({ length: 500 }, (_, i) => ({ id: `s${i}` })) });
    const written = read(path.join(projectsDir(), "big.json"));
    expect(written.scenes).toHaveLength(500);
    expect(fs.readdirSync(projectsDir()).filter((f) => f.endsWith(".tmp"))).toHaveLength(0);
  });

  it("refuses an entry with no id rather than inventing a filename", () => {
    expect(() => api.save("project", {})).toThrow();
  });
});

describe("duplicate ids", () => {
  /**
   * The one that bit for real: `storyboards/` held two files whose internal id
   * was `vibe-coding-stack-v1`. The loader keys its library by id, so one of
   * them was invisible — and an edit could land in the invisible one, which
   * from the outside looks exactly like "it did not save".
   */
  it("retires a stale file that claims the same id as the one being saved", () => {
    fs.writeFileSync(
      path.join(projectsDir(), "old-name.json"),
      JSON.stringify({ id: "same-id", title: "senas" })
    );

    api.save("project", { id: "same-id", title: "naujas" });

    expect(fs.existsSync(path.join(projectsDir(), "old-name.json"))).toBe(false);
    expect(read(path.join(projectsDir(), "same-id.json"))).toMatchObject({ title: "naujas" });
  });

  it("keeps the retired copy in the trash instead of destroying it", () => {
    fs.writeFileSync(path.join(projectsDir(), "old-name.json"), JSON.stringify({ id: "same-id", title: "senas" }));
    api.save("project", { id: "same-id", title: "naujas" });

    const trashed = fs.readdirSync(path.join(root, "library/.trash/project"));
    expect(trashed).toHaveLength(1);
    expect(read(path.join(root, "library/.trash/project", trashed[0]))).toMatchObject({ title: "senas" });
  });

  it("does not touch files belonging to other entries", () => {
    fs.writeFileSync(path.join(projectsDir(), "other.json"), JSON.stringify({ id: "other", title: "kitas" }));
    api.save("project", { id: "mine", title: "mano" });

    expect(read(path.join(projectsDir(), "other.json"))).toMatchObject({ title: "kitas" });
  });
});

describe("reconcile", () => {
  it("resolves a pre-existing duplicate in favour of the newer file", () => {
    const older = path.join(projectsDir(), "a.json");
    const newer = path.join(projectsDir(), "b.json");
    fs.writeFileSync(older, JSON.stringify({ id: "dup", title: "senesnis" }));
    fs.writeFileSync(newer, JSON.stringify({ id: "dup", title: "naujesnis" }));
    // Make the ordering unambiguous regardless of filesystem timestamp
    // granularity, which can round two writes in the same millisecond together.
    fs.utimesSync(older, new Date(1_000_000), new Date(1_000_000));
    fs.utimesSync(newer, new Date(2_000_000), new Date(2_000_000));

    const report = api.reconcile();

    expect(report.some((entry) => entry.issue === "duplicate-id")).toBe(true);
    expect(api.list("project")).toHaveLength(1);
    expect(api.list("project")[0]).toMatchObject({ title: "naujesnis" });
  });

  it("reports a file that cannot be parsed instead of hiding it", () => {
    fs.writeFileSync(path.join(projectsDir(), "broken.json"), "{ not json");
    expect(api.reconcile().some((entry) => entry.issue === "unreadable")).toBe(true);
  });

  it("deletes history folders whose entry no longer exists, and keeps the rest", () => {
    const orphan = path.join(projectsDir(), ".history", "deleted-long-ago");
    const kept = path.join(projectsDir(), ".history", "alive");
    for (const folder of [orphan, kept]) {
      fs.mkdirSync(folder, { recursive: true });
      fs.writeFileSync(path.join(folder, "1.json"), "{}");
    }

    api.save("project", { id: "alive" });
    api.reconcile();

    expect(fs.existsSync(orphan)).toBe(false);
    expect(fs.existsSync(kept)).toBe(true);
  });
});

describe("history", () => {
  /**
   * A snapshot before every write meant the 100-deep ring turned over in about
   * a minute of typing, so the oldest version you could restore was a minute
   * old — useless for the mistakes you only notice after a restart.
   */
  it("does not snapshot on every save", () => {
    api.save("project", { id: "v", n: 1 });
    for (let n = 2; n <= 30; n++) api.save("project", { id: "v", n });

    expect(api.versions("project", "v").length).toBeLessThanOrEqual(2);
  });

  it("always snapshots before a delete", () => {
    api.save("project", { id: "v", title: "prieš trynimą" });
    api.remove("project", "v");

    const versions = api.versions("project", "v");
    expect(versions.length).toBeGreaterThanOrEqual(1);
    expect(api.version("project", "v", versions[0].file)).toMatchObject({ title: "prieš trynimą" });
  });
});

describe("delete and restore", () => {
  it("moves the file to the trash rather than unlinking it", () => {
    api.save("project", { id: "gone", title: "dingęs" });
    api.remove("project", "gone");

    expect(fs.existsSync(path.join(projectsDir(), "gone.json"))).toBe(false);
    expect(api.trash("project")).toHaveLength(1);
  });

  it("brings a trashed entry back with its content intact", () => {
    api.save("project", { id: "gone", title: "dingęs", scenes: [{ id: "s1" }] });
    api.remove("project", "gone");
    api.restore("project", api.trash("project")[0].file);

    expect(api.list("project")).toHaveLength(1);
    expect(api.list("project")[0]).toMatchObject({ title: "dingęs", scenes: [{ id: "s1" }] });
  });

  it("refuses a trash filename that points outside the trash folder", () => {
    expect(() => api.restore("project", "../../../etc/passwd")).toThrow();
  });
});

describe("list", () => {
  it("returns the rest of the collection even when one file is corrupt", () => {
    api.save("project", { id: "good-a" });
    api.save("project", { id: "good-b" });
    fs.writeFileSync(path.join(projectsDir(), "corrupt.json"), "}{");

    expect(api.list("project")).toHaveLength(2);
  });
});
