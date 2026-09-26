import fs from "node:fs/promises";
import path from "node:path";
import { DB_DIR } from "./config.js";

export function slugify(id: string): string {
  const slug = id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // viskas, kas ne raidė ar skaičius → "-"
    .replace(/(^-|-$)/g, ""); // nuimti "-" pradžioje ir gale
  return slug || "entry";
}

function fileFor(folder: string, id: string): string {
  return path.join(DB_DIR, folder, `${slugify(id)}.json`);
}

export async function readAll(folder: string): Promise<unknown[]> {
  const dir = path.join(DB_DIR, folder);
  const files = await fs.readdir(dir).catch(() => []);

  const items: unknown[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue; // praleisti README.md ir pan.
    const text = await fs.readFile(path.join(dir, file), "utf-8");
    items.push(JSON.parse(text));
  }
  return items;
}

export async function writeOne(
  folder: string,
  id: string,
  data: unknown,
): Promise<void> {
  const file = fileFor(folder, id);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export async function removeOne(folder: string, id: string): Promise<void> {
  await fs.rm(fileFor(folder, id), { force: true });
}

export async function readJson(
  name: string,
  fallback: unknown,
): Promise<unknown> {
  try {
    const text = await fs.readFile(path.join(DB_DIR, name), "utf-8");
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export async function writeJson(name: string, data: unknown): Promise<void> {
  await fs.mkdir(DB_DIR, { recursive: true });
  await fs.writeFile(
    path.join(DB_DIR, name),
    JSON.stringify(data, null, 2) + "\n",
    "utf-8",
  );
}
