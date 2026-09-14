import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isVideoFile, transcodeForScrubbing } from "./transcodeRecording";
const ROOT = process.cwd();
const CUSTOM_DIR = path.join(ROOT, "public", "assets", "custom");
const MANIFEST = path.join(CUSTOM_DIR, "manifest.json");
type CustomAsset = {
  id: string;
  label: string;
  file: string;
  src: string;
  kind?: string;
};
function fmtMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
export function optimizeRecordings(): void {
  if (!existsSync(CUSTOM_DIR)) {
    console.log(`[recordings] nothing to do, no ${CUSTOM_DIR}`);
    return;
  }
  const manifest: CustomAsset[] = existsSync(MANIFEST)
    ? (JSON.parse(readFileSync(MANIFEST, "utf-8")) as CustomAsset[])
    : [];
  const originalsDir = path.join(CUSTOM_DIR, "originals");
  let changed = false;
  for (const filename of readdirSync(CUSTOM_DIR)) {
    if (!isVideoFile(filename)) continue;
    if (existsSync(path.join(originalsDir, filename))) {
      console.log(`[recordings] skip ${filename} (already optimized)`);
      continue;
    }
    const source = path.join(CUSTOM_DIR, filename);
    process.stdout.write(`[recordings] transcoding ${filename} ... `);
    try {
      const result = transcodeForScrubbing(source);
      const newName = path.basename(result.file);
      console.log(
        `${fmtMb(result.bytesBefore)} -> ${fmtMb(result.bytesAfter)}${newName !== filename ? ` (now ${newName})` : ""}`,
      );
      if (newName !== filename) {
        for (const entry of manifest) {
          if (entry.file !== filename) continue;
          entry.file = newName;
          entry.src = `/assets/custom/${newName}`;
          changed = true;
        }
      }
    } catch (err) {
      console.log(`FAILED\n  ${(err as Error).message}`);
    }
  }
  if (changed) {
    writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
    console.log("[recordings] manifest.json updated with renamed files");
  }
  console.log(
    "[recordings] done. Originals kept in public/assets/custom/originals/",
  );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  optimizeRecordings();
}
