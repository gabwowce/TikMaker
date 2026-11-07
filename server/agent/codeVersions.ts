import fs from "node:fs";
import path from "node:path";
import { DB_DIR, ROOT } from "../config.js";

// The earlier versions of a code scene (docs/tikmaker-kryptis.md,
// "Redagavimas" 3): before the agent writes a scene again, the code there now
// is kept as db/code-versions/<folder>/scene-N.v<version>.tsx – outside src/,
// so it is never compiled or bundled. Undo puts one back.

const versionsDir = () => path.join(DB_DIR, "code-versions");
const sourceOf = (file: string) => path.join(ROOT, "src", "generated", file);

export function versionPath(file: string, version: number): string {
  return path.join(versionsDir(), file.replace(/\.tsx$/, `.v${version}.tsx`));
}

// Keeps the scene's code as `version` (the number it has now).
export function saveVersion(
  _projectId: string,
  file: string,
  version: number,
): void {
  const from = sourceOf(file);
  if (!fs.existsSync(from)) return;
  const to = versionPath(file, version);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

// Puts `version` back as the scene's code.
export function restoreVersion(file: string, version: number): void {
  const from = versionPath(file, version);
  if (!fs.existsSync(from))
    throw new Error(`Version ${version} of ${file} is not kept`);
  fs.copyFileSync(from, sourceOf(file));
}
