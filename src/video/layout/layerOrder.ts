export function timelineLayerZIndex(lane?: number): number {
  return 1000 - (lane ?? 0);
}
