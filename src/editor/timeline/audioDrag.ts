/**
 * Dragging a sound out of a library panel and onto the timeline.
 *
 * The payload is the registry id plus an optional cut — the same shape a saved
 * voice variant carries — so an original, a trimmed variant and an uploaded
 * file are all dropped by the same code. Nothing about the audio travels in the
 * drag; a clip only ever refers to a registry id.
 */

export const AUDIO_DRAG_TYPE = "application/x-tikmaker-audio";

export type AudioDragPayload = {
  sfxId: string;
  cut?: {
    startFrom?: number;
    durationInFrames?: number;
    volume?: number;
    playbackRate?: number;
  };
};

export function setAudioDragPayload(event: React.DragEvent, payload: AudioDragPayload) {
  event.dataTransfer.setData(AUDIO_DRAG_TYPE, JSON.stringify(payload));
  // A plain-text fallback so dropping onto something that only understands text
  // (a code editor, a chat box) leaves a readable id rather than nothing.
  event.dataTransfer.setData("text/plain", payload.sfxId);
  event.dataTransfer.effectAllowed = "copy";
}

/** Returns null when the drag is not one of ours — a file, a selection, an
 * image from another tab — so the timeline can ignore it rather than guess. */
export function readAudioDragPayload(event: React.DragEvent): AudioDragPayload | null {
  const raw = event.dataTransfer.getData(AUDIO_DRAG_TYPE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AudioDragPayload;
    return typeof parsed?.sfxId === "string" ? parsed : null;
  } catch {
    return null;
  }
}

/** True while a drag carrying one of our sounds is over an element. Checked on
 * `dragover`, where the DATA is unreadable by design — only the type list is,
 * which is exactly what this needs. */
export function isAudioDrag(event: React.DragEvent): boolean {
  return event.dataTransfer.types.includes(AUDIO_DRAG_TYPE);
}
