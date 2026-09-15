import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyProject } from "../../../schema/project";
import type { Scene } from "../../../schema/scene";
import { computeSceneTimings } from "../../../utils/duration";
import { useProjectStore } from "../../state/projectStore";
import { buildFullTimelineRows } from "../buildFullTimelineRows";
import { buildSceneTimelineRows } from "../buildSceneTimelineRows";

vi.mock("../../state/fileLibrary", () => ({
  deleteEntry: vi.fn(),
  saveNow: vi.fn(),
}));
vi.mock("../../state/projectLibrary", () => ({
  libraryIndexFrom: () => [],
  loadInitialState: vi.fn(),
  persist: vi.fn(),
  readLibrary: () => ({}),
  rememberLastOpened: vi.fn(),
  writeLibrary: vi.fn(),
}));
vi.mock("../useAudioWaveforms", async () => {
  const actual =
    await vi.importActual<typeof import("../useAudioWaveforms")>(
      "../useAudioWaveforms",
    );
  return { ...actual, cachedAudioDuration: vi.fn(() => 30) };
});

// Scena su kiekvienos rūšies objektu, kad juostos eilutės padengtų visus kelius.
function fixtureScene(): Scene {
  return {
    id: "scene-1",
    type: "steps",
    background: "solid-dark",
    vo: "Viena du trys keturi penki",
    content: {
      richHeadline: [
        { text: "Pirma eilutė", size: "hero", delay: 4, exitAt: 40 },
        { text: "Antra eilutė", size: "title", lane: 1 },
      ],
      blocks: [
        {
          id: "block-1",
          type: "text",
          text: "Blokas",
          x: 50,
          y: 80,
          delay: 6,
          exitAt: 50,
        },
      ],
      items: [{ label: "Žingsnis", value: "reikšmė", delay: 8, exitAt: 55 }],
      visuals: [
        {
          id: "layer-1",
          visual: { type: "prop", asset: "key" },
          x: 30,
          y: 40,
          delay: 2,
          exitAt: 45,
          sfx: "d-pop",
          exitSfx: "soft-whoosh",
          keyframes: [
            { id: "kf-1", frame: 5, x: 30, y: 40 },
            { id: "kf-2", frame: 25, x: 70, y: 60 },
          ],
        },
        {
          id: "layer-2",
          visual: {
            type: "checklist",
            items: [
              { label: "Vienas", delay: 3, exitAt: 30 },
              { label: "Du", delay: 9 },
            ],
          },
          x: 50,
          y: 50,
        },
      ],
    },
    motion: { entrance: "fade", exit: "fade", transition: "cut", stagger: 6 },
  };
}

// Tik tai, kas apibrėžia klipo vietą ir tapatybę — funkcijos nelyginamos.
function shape(rows: { id: string; start: number; end: number }[]) {
  return rows.map((row) => {
    const value = row as Record<string, unknown>;
    return {
      id: row.id,
      kind: value.kind,
      label: value.label,
      start: row.start,
      end: row.end,
      lane: value.lane,
      point: value.point,
      keyframes: (
        value.keyframes as { frame: number }[] | undefined
      )?.map((keyframe) => keyframe.frame),
    };
  });
}

beforeEach(() => {
  useProjectStore.getState().loadProject({
    ...createEmptyProject("timeline-fixture", "Timeline fixture"),
    scenes: [fixtureScene(), { ...fixtureScene(), id: "scene-2" }],
    audioClips: [
      { id: "audio-1", sfxId: "soft-whoosh", from: 10, durationInFrames: 20 },
    ],
  });
});

describe("timeline rows", () => {
  it("builds a stable set of clips for one scene", () => {
    const project = useProjectStore.getState().project;
    const timing = computeSceneTimings(project)[0];
    const rows = buildSceneTimelineRows(project, timing, [], new Map());
    expect(shape(rows)).toMatchSnapshot();
  });

  it("builds a stable set of clips for the whole project", () => {
    const project = useProjectStore.getState().project;
    const rows = buildFullTimelineRows(project, 200, [], new Map());
    expect(shape(rows)).toMatchSnapshot();
  });

  it("gives every clip a unique id in both views", () => {
    const project = useProjectStore.getState().project;
    const timing = computeSceneTimings(project)[0];
    for (const rows of [
      buildSceneTimelineRows(project, timing, [], new Map()),
      buildFullTimelineRows(project, 200, [], new Map()),
    ]) {
      const ids = rows.map((row) => row.id);
      expect(new Set(ids).size, ids.join(", ")).toBe(ids.length);
    }
  });

  it("keeps every clip inside its own window", () => {
    const project = useProjectStore.getState().project;
    const timing = computeSceneTimings(project)[0];
    for (const rows of [
      buildSceneTimelineRows(project, timing, [], new Map()),
      buildFullTimelineRows(project, 200, [], new Map()),
    ]) {
      for (const row of rows) {
        expect(row.end, row.id).toBeGreaterThanOrEqual(row.start);
        expect(row.start, row.id).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
