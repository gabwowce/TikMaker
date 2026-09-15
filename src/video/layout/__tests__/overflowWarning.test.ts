import { describe, expect, it } from "vitest";
import type { Scene } from "../../../schema/scene";
import { pacingWarning } from "../../../utils/pacing";
import { layerOverflowWarning } from "../layoutPresets";

describe("layer overflow warning", () => {
  it("flags a layer pushed past the side margin", () => {
    expect(
      layerOverflowWarning({
        visual: { type: "prop", asset: "key" },
        x: 2,
        y: 50,
        scale: 2,
      }),
    ).toMatch(/left/);
  });

  it("stays quiet for a layer inside the safe box", () => {
    expect(
      layerOverflowWarning({
        visual: { type: "prop", asset: "key" },
        x: 50,
        y: 50,
        scale: 0.5,
      }),
    ).toBeNull();
  });

  it("flags code lines that would be clipped rather than wrapped", () => {
    expect(
      layerOverflowWarning({
        visual: {
          type: "terminal",
          lines: [{ text: "x".repeat(80) }],
        },
        x: 50,
        y: 50,
      }),
    ).toMatch(/characters will be cut off/);
  });

  it("says nothing about a full-bleed visual, which owns the whole frame", () => {
    expect(
      layerOverflowWarning({
        visual: {
          type: "node-group",
          layout: "orbit",
          nodes: [{ type: "prop", asset: "key" }],
        },
        x: 50,
        y: 50,
      }),
    ).toBeNull();
  });
});

function scene(patch: Partial<Scene>): Scene {
  return {
    id: "s",
    type: "hook-centered",
    background: "solid-dark",
    content: {},
    ...patch,
  };
}

describe("pacing warning", () => {
  it("flags a duration too short for its own voiceover", () => {
    expect(
      pacingWarning(
        scene({
          durationSeconds: 1,
          vo: "Viena du trys keturi penki šeši septyni aštuoni devyni dešimt",
        }),
      ),
    ).toMatch(/voiceover/);
  });

  it("stays quiet when the duration is not set at all", () => {
    expect(pacingWarning(scene({ vo: "Trumpai" }))).toBeNull();
  });

  it("stays quiet when the scene is long enough", () => {
    expect(pacingWarning(scene({ durationSeconds: 10, vo: "Trumpai" }))).toBe(
      null,
    );
  });
});
