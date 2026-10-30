import path from "node:path";

// Every path the server touches, in one place. TIKMAKER_ROOT lets the tests
// point the whole server at a temporary folder instead of the real db/.
export const ROOT = path.resolve(process.env.TIKMAKER_ROOT ?? ".");
export const DB_DIR = path.join(ROOT, "db");
export const PUBLIC_DIR = path.join(ROOT, "public");
export const OUT_DIR = path.join(ROOT, "out");
// The agent's knowledge base. Tests keep ROOT in a temporary folder but still
// read the real knowledge/, so it has its own override.
export const KNOWLEDGE_DIR = path.resolve(
  process.env.TIKMAKER_KNOWLEDGE ?? path.join(ROOT, "knowledge"),
);
