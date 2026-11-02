import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../../schema/project";
import type { Scene } from "../../schema/scene";
import { parseProject } from "../../utils/normalizeProject";
import { SAFE_CONTENT_WIDTH } from "../../video/layout/layoutPresets";
import { naturalVisualSize } from "../../video/layout/visualMetrics";
import { compileProject, compileScene } from "../compileProject";
import type { LayoutExample, WorkspaceStyle } from "../knowledge";
import type { AgentRun } from "../run/run";

// A scene as projectFromScript leaves it: words only.
const scene: Scene = {
  id: "s1",
  type: "visual-explainer",
  plan: { role: "demo", visualBrief: "VS Code settings" },
  vo: "Open the settings.",
  background: "solid-dark",
  content: { headline: "Open settings" },
};
// A logo at the top, a recording below it, the text at the bottom.
const example = {
  id: "demo-test",
  role: "demo",
  arrangement: "stack",
  anchor: "center",
  background: "solid",
  elements: [
    { kind: "logo", x: 50, y: 15, w: 20, h: 10, order: 0 },
    { kind: "recording", x: 50, y: 50, w: 95, h: 40, order: 1 },
  ],
  textBlocks: [
    {
      x: 50,
      y: 82,
      w: 80,
      h: 8,
      order: 2,
      size: "headline",
      lines: 1,
      pill: true,
    },
  ],
} as LayoutExample;

describe("compileScene", () => {
  const compiled = compileScene(scene, example, [
    "vscode",
    "Record opening the settings",
  ]);
  const [logo, recording] = compiled.content.visuals ?? [];

  it("puts every picture at the centre of its box", () => {
    expect([logo.x, logo.y, recording.x, recording.y]).toEqual([
      50, 15, 50, 50,
    ]);
  });

  it("uses the library file for a logo", () => {
    expect(logo.visual).toEqual({ type: "logo", logo: "vscode" });
  });

  it("leaves a REC placeholder saying what to record (FR-13)", () => {
    expect(recording.visual).toMatchObject({
      type: "screen",
      content: {
        type: "checkpoint",
        label: "REC",
        detail: "Record opening the settings",
      },
    });
  });
  it("keeps the user's material moving, the library's still", () => {
    expect(recording.kenBurns).toBe("zoomIn");
    expect(logo.kenBurns).toBeUndefined();
  });
  it("scales a picture to fit its box, inside the side margins", () => {
    const size = naturalVisualSize(recording.visual);
    expect(size.width * recording.scale!).toBeLessThanOrEqual(
      SAFE_CONTENT_WIDTH + 0.5,
    );
    expect(size.height * recording.scale!).toBeLessThanOrEqual(
      (40 * 1920) / 100 + 0.5,
    );
  });

  it("puts the on-screen text where the example has its text", () => {
    expect(compiled.content.richHeadline).toEqual([
      { text: "Open settings", size: "headline", pill: true },
    ]);
    expect([
      compiled.content.richHeadlineX,
      compiled.content.richHeadlineY,
    ]).toEqual([50, 82]);
    expect(compiled.content.headline).toBeUndefined();
    expect(compiled.content.textOnTop).toBe(true);
  });

  it("shows no text when the example has none", () => {
    const quiet = compileScene(scene, { ...example, textBlocks: [] }, [
      "vscode",
      "Record it",
    ]);
    expect(quiet.content.richHeadline).toBeUndefined();
    expect(quiet.vo).toBe("Open the settings.");
  });

  it("remembers which example the scene follows", () => {
    expect(compiled.layoutExampleId).toBe("demo-test");
  });

  it("makes a scene the editor can open (NFR-05)", () => {
    const project = { ...createEmptyProject("p1", "Test"), scenes: [compiled] };
    expect(() => parseProject(project)).not.toThrow();
  });
});

describe("compileProject", () => {
  // Two scenes the agent wrote and one the user added by hand.
  const own = (n: number, role: "hook" | "demo"): Scene => ({
    ...scene,
    id: `scene-run-1-${n}`,
    plan: { role },
  });
  const byHand: Scene = { ...scene, id: "scene-by-hand" };
  const project = {
    ...createEmptyProject("p1", "Test"),
    scenes: [own(1, "hook"), own(2, "demo"), byHand],
  };
  const run = {
    id: "run-1",
    layout: {
      scenes: [
        { layoutExampleId: "demo-test", fills: ["vscode", "Record A"] },
        { layoutExampleId: "demo-low", fills: ["vscode", "Record B"] },
      ],
    },
  } as AgentRun;
  const low = { ...example, id: "demo-low", captionsY: 80 };
  const style = { backgrounds: ["dot-grid", "solid-dark"] } as WorkspaceStyle;
  const compiled = compileProject(
    project,
    run,
    [{ ...example, captionsY: 60 }, low],
    style,
  );
  const [first, second, third] = compiled.scenes;

  it("lays out each scene with the example chosen for it", () => {
    expect(first.layoutExampleId).toBe("demo-test");
    expect(second.layoutExampleId).toBe("demo-low");
  });

  it("leaves a scene the user added by hand as it is", () => {
    expect(third).toBe(byHand);
  });

  it("gives every laid-out scene the channel's background", () => {
    expect([first.background, second.background]).toEqual([
      "dot-grid",
      "dot-grid",
    ]);
  });

  it("cuts into the first scene and slides into the rest", () => {
    expect(first.motion).toMatchObject({ transition: "cut", stagger: 4 });
    expect(second.motion).toMatchObject({
      transition: "slideLeft",
      entrance: "none",
      stagger: 6,
    });
  });

  it("puts the captions at one height for the whole video", () => {
    expect(compiled.captions?.y).toBe(80);
  });

  it("makes a project the editor can open (NFR-05)", () => {
    expect(() => parseProject(compiled)).not.toThrow();
  });
});
