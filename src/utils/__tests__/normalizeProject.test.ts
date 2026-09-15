import { describe, expect, it } from "vitest";
import { parseProject } from "../normalizeProject";
const base = {
  id: "p",
  title: "T",
  fps: 30,
  width: 1080,
  height: 1920,
  scenes: [] as unknown[],
};
describe("parseProject", () => {
  it("clamps an out-of-range position instead of dropping the project", () => {
    const project = parseProject({
      ...base,
      scenes: [
        {
          id: "s",
          type: "hook-centered",
          background: "solid-dark",
          content: {
            visuals: [
              {
                id: "v",
                visual: { type: "prop", asset: "key" },
                x: 50,
                y: -10,
              },
            ],
          },
        },
      ],
    });
    expect(project.scenes[0].content.visuals?.[0].y).toBeGreaterThanOrEqual(0);
  });
  it("splits corner-props into two independently controllable layers", () => {
    const project = parseProject({
      ...base,
      scenes: [
        {
          id: "s",
          type: "hook-centered",
          background: "solid-dark",
          content: {
            visuals: [
              {
                id: "v",
                visual: {
                  type: "corner-props",
                  assets: [
                    { type: "prop", asset: "key" },
                    { type: "prop", asset: "link" },
                  ],
                },
                x: 50,
                y: 50,
              },
            ],
          },
        },
      ],
    });
    const layers = project.scenes[0].content.visuals ?? [];
    expect(layers.length).toBe(2);
    expect(layers.every((layer) => layer.kenBurns === "float")).toBe(true);
  });
  it("converts a legacy headline into a text line at the size its scene drew it", () => {
    const sizes: Record<string, string> = {
      "hook-centered": "hero",
      "hook-visual": "headline",
      takeaway: "headline",
      "visual-explainer": "title",
      "screen-demo": "title",
      steps: "title",
    };
    for (const [type, size] of Object.entries(sizes)) {
      const project = parseProject({
        ...base,
        scenes: [
          {
            id: "s",
            type,
            background: "solid-dark",
            content: { headline: "LABAS" },
          },
        ],
      });
      const lines = project.scenes[0].content.richHeadline ?? [];
      expect(lines, type).toHaveLength(1);
      expect(lines[0].size, type).toBe(size);
      expect(lines[0].text, type).toBe("LABAS");
    }
  });
  it("keeps the eyebrow as its own line, styled the way it was drawn", () => {
    const project = parseProject({
      ...base,
      scenes: [
        {
          id: "s",
          type: "hook-centered",
          background: "solid-dark",
          content: { eyebrow: "01 PROBLEM", headline: "X" },
        },
      ],
    });
    const lines = project.scenes[0].content.richHeadline ?? [];
    expect(lines.map((line) => line.text)).toEqual(["01 PROBLEM", "X"]);
    expect(lines[0].size).toBe("label");
    expect(lines[0].letterSpacing).toBe(4);
    expect(lines[0].color).toBeTruthy();
  });
  it("carries highlighted words onto the converted line", () => {
    const project = parseProject({
      ...base,
      scenes: [
        {
          id: "s",
          type: "hook-centered",
          background: "solid-dark",
          content: { headline: "greitai ir pigiai", highlights: ["greitai"] },
        },
      ],
    });
    expect(project.scenes[0].content.richHeadline?.[0].highlights).toEqual([
      "greitai",
    ]);
    expect(project.scenes[0].content.highlights).toBeUndefined();
  });
  it("leaves a scene that already uses text lines alone", () => {
    const project = parseProject({
      ...base,
      scenes: [
        {
          id: "s",
          type: "hook-centered",
          background: "solid-dark",
          content: {
            headline: "ignoruojama",
            richHeadline: [{ text: "tikroji", size: "hero" }],
          },
        },
      ],
    });
    expect(project.scenes[0].content.richHeadline?.map((l) => l.text)).toEqual([
      "tikroji",
    ]);
    expect(project.scenes[0].content.headline).toBeUndefined();
  });
  it("throws on genuinely malformed data rather than inventing a project", () => {
    expect(() => parseProject({ nope: true })).toThrow();
  });
});
