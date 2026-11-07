import { describe, expect, it } from "vitest";
import {
  captionBand,
  CAPTIONS_OVER_PICTURE,
  coversCaption,
  overlaps,
  STAGE_LAYOUTS,
  stageTypeIds,
  zoneBand,
} from "../stageTypes";

// Pictures and the spoken words never overlap: true of every stage type by
// its own numbers, so changing a layout so that they would fails here.
describe("stage layouts keep pictures off the captions", () => {
  for (const type of stageTypeIds) {
    if (CAPTIONS_OVER_PICTURE.includes(type)) continue;
    it(type, () => {
      const layout = STAGE_LAYOUTS[type];
      for (const place of layout.visuals)
        expect(overlaps(zoneBand(place.y, place.scale), captionBand(layout))).toBe(false);
    });
  }

  it("finds a picture moved down onto the captions", () => {
    // "top": captions from 1130 px; a full-size block centred at 900 reaches 1325
    expect(coversCaption("top", 900, 1)).toBe(true);
    expect(coversCaption("top", 655, 1)).toBe(false);
  });

  it("lets a full-frame recording carry its captions on top", () => {
    expect(coversCaption("full", 960, 1)).toBe(false);
  });
});
