import { type DragEvent as ReactDragEvent } from "react";
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
export function setAudioDragPayload(
  event: ReactDragEvent,
  payload: AudioDragPayload,
) {
  event.dataTransfer.setData(AUDIO_DRAG_TYPE, JSON.stringify(payload));
  event.dataTransfer.setData("text/plain", payload.sfxId);
  event.dataTransfer.effectAllowed = "copy";
}
export function readAudioDragPayload(
  event: ReactDragEvent,
): AudioDragPayload | null {
  const raw = event.dataTransfer.getData(AUDIO_DRAG_TYPE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AudioDragPayload;
    return typeof parsed?.sfxId === "string" ? parsed : null;
  } catch {
    return null;
  }
}
export function isAudioDrag(event: ReactDragEvent): boolean {
  return event.dataTransfer.types.includes(AUDIO_DRAG_TYPE);
}
