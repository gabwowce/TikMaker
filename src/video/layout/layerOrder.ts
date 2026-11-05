export function timelineLayerZIndex(lane?: number): number {
  return 1000 - (lane ?? 0);
}

// The captions sit above everything in every scene – the layers (up to 1000)
// and text pulled on top of them (2000) – so a picture never hides a word.
export const CAPTIONS_Z_INDEX = 10000;
