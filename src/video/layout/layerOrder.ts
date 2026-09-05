/** Timeline lane 0 is the top track, therefore it paints above lower tracks. */
export const timelineLayerZIndex = (lane?: number): number => 1000 - (lane ?? 0);
