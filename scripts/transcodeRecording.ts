import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

/**
 * Making an uploaded screen recording SCRUBBABLE.
 *
 * A recording straight off a capture tool is encoded for playback, not for
 * editing, and those are close to opposite requirements. The clips that landed
 * in this repo were 3418x2160 with exactly ONE keyframe — the whole four
 * seconds was a single GOP. Playing that start-to-finish is fine; seeking into
 * it is not, because showing frame 100 means decoding frames 1..100 at 4K
 * first. Every playhead move pays that cost, which is why dragging the timeline
 * over a recording froze while every other kind of layer scrubbed instantly.
 *
 * So an upload is re-encoded once, here, into something built for seeking. Both
 * knobs below matter and neither is a quality setting:
 *
 * - `-g GOP_FRAMES` puts a keyframe every third of a second, so a seek decodes
 *   at most ten frames instead of the entire clip.
 * - `MAX_WIDTH` exists because decode cost scales with pixel count and those
 *   pixels are thrown away anyway: the canvas is 1080 wide and a recording is
 *   drawn inside a browser/screen frame at roughly 1000px, so a 3418px source
 *   is ~3x more than the render can ever show. Downscaling is invisible in the
 *   output and is most of the speedup.
 *
 * The original is never destroyed — it moves to `originals/` next to the
 * upload. Transcoding is lossy and a capture can be hard to reproduce, so the
 * one irreversible version of this operation is not worth the disk it saves.
 */

/** Keyframe interval in frames. At 30fps this is one every ~0.33s. */
const GOP_FRAMES = 10;

/** Widest the stored clip gets. See the note above — beyond this the render
 * cannot show the detail, so it is pure decode cost. Height follows the aspect
 * ratio, forced even because h264's 4:2:0 chroma requires it. */
const MAX_WIDTH = 1920;

/** Quality. 20 is visually transparent for screen content while keeping an
 * all-keyframe-ish stream from ballooning. */
const CRF = 20;

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".m4v", ".avi", ".mkv"]);

export function isVideoFile(file: string): boolean {
  return VIDEO_EXTENSIONS.has(path.extname(file).toLowerCase());
}

/**
 * Resolved lazily rather than at module load: this file is imported by
 * `vite.config.ts`, and a missing binary should fail the one upload that needs
 * it, not stop the dev server from booting.
 */
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
  /** Absolute path of the scrub-friendly file (the original path, rewritten). */
  file: string;
  /** Where the untouched upload was kept. */
  originalFile: string;
  bytesBefore: number;
  bytesAfter: number;
};

/**
 * Re-encodes `file` in place for seeking, keeping the original alongside.
 *
 * Writes to a temporary neighbour and swaps only once ffmpeg has exited
 * cleanly, so an interrupted or failed transcode leaves the working file
 * exactly as it was instead of truncated.
 */
export function transcodeForScrubbing(file: string): TranscodeResult {
  const dir = path.dirname(file);
  const base = path.basename(file, path.extname(file));
  const bytesBefore = statSync(file).size;

  const originalsDir = path.join(dir, "originals");
  mkdirSync(originalsDir, { recursive: true });
  const originalFile = path.join(originalsDir, path.basename(file));

  // Always .mp4 out: the input may be .mov/.webm, and the container the editor
  // reads should not depend on what the capture tool happened to write.
  const outFile = path.join(dir, `${base}.mp4`);
  const tmpFile = path.join(dir, `${base}.transcoding.mp4`);

  try {
    execFileSync(
      ffmpegPath(),
      [
        "-y",
        "-i", file,
        // Even dimensions: h264 4:2:0 cannot encode an odd width or height, and
        // an arbitrary source aspect ratio will produce one about half the time.
        "-vf", `scale='min(${MAX_WIDTH},iw)':-2:flags=lanczos`,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", String(CRF),
        "-g", String(GOP_FRAMES),
        // Without this, x264 is free to place keyframes on scene cuts INSTEAD of
        // on the -g grid, which on static screen content means it places almost
        // none and the interval above is silently ignored.
        "-keyint_min", String(GOP_FRAMES),
        "-sc_threshold", "0",
        "-pix_fmt", "yuv420p",
        // Seeking reads the moov atom; at the end of the file that is a second
        // round trip before the first frame can be shown.
        "-movflags", "+faststart",
        "-c:a", "aac",
        "-b:a", "128k",
        tmpFile,
      ],
      { stdio: ["ignore", "ignore", "pipe"] }
    );
  } catch (err) {
    if (existsSync(tmpFile)) unlinkSync(tmpFile);
    const stderr = (err as { stderr?: Buffer }).stderr?.toString().trim();
    throw new Error(`ffmpeg failed for ${path.basename(file)}${stderr ? `: ${stderr.slice(-500)}` : ""}`);
  }

  // Preserve the upload before anything overwrites it. A re-run would otherwise
  // archive the already-transcoded copy over the true original.
  if (!existsSync(originalFile)) renameSync(file, originalFile);
  else if (existsSync(file)) unlinkSync(file);

  renameSync(tmpFile, outFile);

  return { file: outFile, originalFile, bytesBefore, bytesAfter: statSync(outFile).size };
}
