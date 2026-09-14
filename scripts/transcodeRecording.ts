import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  renameSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
const GOP_FRAMES = 10;
const MAX_WIDTH = 1920;
const CRF = 20;
const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".mov",
  ".webm",
  ".m4v",
  ".avi",
  ".mkv",
]);
export function isVideoFile(file: string): boolean {
  return VIDEO_EXTENSIONS.has(path.extname(file).toLowerCase());
}
function ffmpegPath(): string {
  const require = createRequire(import.meta.url);
  const { RenderInternals } = require("@remotion/renderer");
  return RenderInternals.getExecutablePath({
    type: "ffmpeg",
    indent: false,
    logLevel: "error",
    binariesDirectory: null,
  });
}
export type TranscodeResult = {
  file: string;
  originalFile: string;
  bytesBefore: number;
  bytesAfter: number;
};
export function transcodeForScrubbing(file: string): TranscodeResult {
  const dir = path.dirname(file);
  const base = path.basename(file, path.extname(file));
  const bytesBefore = statSync(file).size;
  const originalsDir = path.join(dir, "originals");
  mkdirSync(originalsDir, { recursive: true });
  const originalFile = path.join(originalsDir, path.basename(file));
  const outFile = path.join(dir, `${base}.mp4`);
  const tmpFile = path.join(dir, `${base}.transcoding.mp4`);
  try {
    execFileSync(
      ffmpegPath(),
      [
        "-y",
        "-i",
        file,
        "-vf",
        `scale='min(${MAX_WIDTH},iw)':-2:flags=lanczos`,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        String(CRF),
        "-g",
        String(GOP_FRAMES),
        "-keyint_min",
        String(GOP_FRAMES),
        "-sc_threshold",
        "0",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        tmpFile,
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
  } catch (err) {
    if (existsSync(tmpFile)) unlinkSync(tmpFile);
    const stderr = (
      err as {
        stderr?: Buffer;
      }
    ).stderr
      ?.toString()
      .trim();
    throw new Error(
      `ffmpeg failed for ${path.basename(file)}${stderr ? `: ${stderr.slice(-500)}` : ""}`,
    );
  }
  if (!existsSync(originalFile)) renameSync(file, originalFile);
  else if (existsSync(file)) unlinkSync(file);
  renameSync(tmpFile, outFile);
  return {
    file: outFile,
    originalFile,
    bytesBefore,
    bytesAfter: statSync(outFile).size,
  };
}
