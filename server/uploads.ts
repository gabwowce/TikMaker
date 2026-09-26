import fs from "node:fs/promises";
import path from "node:path";
import { PUBLIC_DIR } from "./config.js";
import { slugify } from "./db.js";

// A readable, unique id: "my-logo-mtq3k1z0" (slug + time in base 36).
export function newId(label: string): string {
  return `${slugify(label)}-${Date.now().toString(36)}`;
}

// Writes a file into a folder under public/, where the editor and the Remotion
// render can both load it, e.g. savePublicFile("assets/custom", "logo.png", bytes).
export async function savePublicFile(
  folder: string,
  file: string,
  bytes: Buffer,
): Promise<string> {
  const dir = path.join(PUBLIC_DIR, folder);
  await fs.mkdir(dir, { recursive: true });
  const target = path.join(dir, file);
  await fs.writeFile(target, bytes);
  return target;
}

// Deletes a file addressed by its public URL ("/assets/custom/logo.png").
// Refuses anything that would resolve outside public/.
export async function removePublicFile(src: string): Promise<void> {
  const target = path.resolve(PUBLIC_DIR, "." + src);
  if (!target.startsWith(PUBLIC_DIR + path.sep)) return;
  await fs.rm(target, { force: true });
}
