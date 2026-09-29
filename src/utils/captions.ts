import type { CaptionWord, VideoProject } from "../schema/project";
import { projectDurationInFrames } from "./duration";
import { resolveAudioClips } from "./voiceClips";

// Captions are derived, never stored: the words (with their timings in the
// source audio) live on each audio clip, and moving, trimming or re-timing a
// clip in the editor moves its captions with it because this runs on every
// render. Storing chunk frames instead would go stale the first time a clip
// was dragged.

export type CaptionWordTiming = { text: string; from: number; to: number };
export type CaptionChunk = { from: number; to: number; words: CaptionWordTiming[] };

// A chunk is what is on screen at once. Short, because a caption that has
// to be READ competes with the picture it is supposed to support.
export const CAPTION_MAX_WORDS = 3;
export const CAPTION_MAX_CHARS = 18;
const PAUSE_SECONDS = 0.3;
const HOLD_FRAMES = 8;

function endsPhrase(text: string) {
  return /[.,!?:;]$/.test(text);
}

export function chunkWords(words: CaptionWord[]): CaptionWord[][] {
  const chunks: CaptionWord[][] = [];
  let current: CaptionWord[] = [];
  words.forEach((word, i) => {
    const chars = [...current, word].map((w) => w.text).join(" ").length;
    const pause = current.length > 0 && word.start - current[current.length - 1].end > PAUSE_SECONDS;
    if (current.length > 0 && (current.length >= CAPTION_MAX_WORDS || chars > CAPTION_MAX_CHARS || pause)) {
      chunks.push(current);
      current = [];
    }
    current.push(word);
    if (endsPhrase(word.text) && i < words.length - 1) {
      chunks.push(current);
      current = [];
    }
  });
  if (current.length > 0) chunks.push(current);
  return chunks;
}

export function captionTimeline(project: VideoProject, fps: number): CaptionChunk[] {
  const total = projectDurationInFrames(project);
  const chunks: CaptionChunk[] = [];
  for (const { clip, from, durationInFrames } of resolveAudioClips(project.audioClips ?? [], total)) {
    if (!clip.words?.length) continue;
    const startFrom = clip.startFrom ?? 0;
    const rate = clip.playbackRate ?? 1;
    const toFrame = (seconds: number) => from + (seconds * fps - startFrom) / rate;
    const windowEnd = from + durationInFrames;
    const audible = clip.words.filter((w) => {
      const at = toFrame(w.start);
      return at >= from && at < windowEnd;
    });
    for (const group of chunkWords(audible)) {
      const words = group.map((w) => ({
        text: w.text,
        from: Math.round(toFrame(w.start)),
        to: Math.round(Math.min(toFrame(w.end), windowEnd)),
      }));
      chunks.push({
        from: words[0].from,
        to: Math.min(words[words.length - 1].to + HOLD_FRAMES, windowEnd),
        words,
      });
    }
  }
  chunks.sort((a, b) => a.from - b.from);
  // Never two captions at once: a chunk gives way the moment the next begins.
  for (let i = 0; i < chunks.length - 1; i++) {
    chunks[i].to = Math.min(chunks[i].to, chunks[i + 1].from);
  }
  return chunks.filter((c) => c.to > c.from);
}
