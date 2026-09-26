import path from "node:path";

// Every path the server touches, in one place. TIKMAKER_ROOT lets the tests
// point the whole server at a temporary folder instead of the real db/.
export const ROOT = path.resolve(process.env.TIKMAKER_ROOT ?? ".");
export const DB_DIR = path.join(ROOT, "db");
export const PUBLIC_DIR = path.join(ROOT, "public");
export const OUT_DIR = path.join(ROOT, "out");
