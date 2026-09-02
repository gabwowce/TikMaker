/**
 * How a moment in time is written, everywhere in the editor.
 *
 * Frames are the unit the project actually stores, but nobody edits in frames —
 * and the displays were rounding to hundredths (`2.47s`), which at 30fps is
 * coarser than a single frame. A cut that lands one frame early is 33ms early,
 * and a readout that cannot show 33ms cannot be used to find it.
 *
 * A React-free leaf: the timeline, the object panel and the scene strip all
 * read it, and none of them should be defining "what does 2.4667 seconds look
 * like" for themselves.
 */

/** `0:02.467` — the form a video editor's playhead readout takes. Minutes are
 * kept even at 0 so the field does not change width as the video passes 1:00. */
export function formatTimecode(frames: number, fps: number): string {
  const total = Math.max(0, frames) / fps;
  const minutes = Math.floor(total / 60);
  const seconds = Math.floor(total % 60);
  const milliseconds = Math.round((total - Math.floor(total)) * 1000);
  // Rounding up to a full second has to carry, or 1.9996s prints as "0:01.1000".
  if (milliseconds === 1000) return formatTimecode(Math.round((Math.floor(total) + 1) * fps), fps);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

/** `2.467s` — for durations, where minutes would be noise. */
export function formatDuration(frames: number, fps: number): string {
  return `${(Math.max(0, frames) / fps).toFixed(3)}s`;
}

/** Seconds as a number, rounded to the millisecond — for the numeric inputs,
 * which need a value rather than a string. */
export function framesToSeconds(frames: number, fps: number): number {
  return Number((frames / fps).toFixed(3));
}

/** One frame, in seconds — the smallest step any time control should take.
 * Anything finer is a number the project cannot store. */
export function frameStep(fps: number): number {
  return Number((1 / fps).toFixed(4));
}
