import { describe, expect, it } from "vitest";
import type { Scene } from "../../schema/scene";
import {
  MIN_SCENE_SECONDS,
  resolveSceneDuration,
  voDurationSeconds,
} from "../pacing";
function scene(patch: Partial<Scene>): Scene {
  return {
    id: "s",
    type: "hook-centered",
    background: "solid-dark",
    content: {},
    ...patch,
  } as Scene;
}
describe("resolveSceneDuration", () => {
  it("gives a scene long enough to speak its voiceover", () => {
    const vo = "vienas du trys keturi penki šeši septyni aštuoni devyni dešimt";
    const resolved = resolveSceneDuration(scene({ vo }));
    expect(resolved).toBeGreaterThanOrEqual(voDurationSeconds(vo));
  });
  it("never returns less than the floor, even for a single word", () => {
    expect(resolveSceneDuration(scene({ vo: "labas" }))).toBeGreaterThanOrEqual(
      MIN_SCENE_SECONDS,
    );
  });
  it("lets a longer voiceover win over a shorter one", () => {
    const short = resolveSceneDuration(scene({ vo: "trumpas sakinys" }));
    const long = resolveSceneDuration(
      scene({
        vo: "gerokai ilgesnis sakinys su daug daugiau žodžių nei ankstesnis kad skirtumas būtų aiškus",
      }),
    );
    expect(long).toBeGreaterThan(short);
  });
  it("honours an explicit duration instead of deriving one", () => {
    expect(
      resolveSceneDuration(
        scene({
          vo: "labai ilgas sakinys su daugybe žodžių",
          durationSeconds: 1,
        }),
      ),
    ).toBe(1);
  });
  it("counts on-screen text when there is no voiceover", () => {
    const bare = resolveSceneDuration(scene({}));
    const wordy = resolveSceneDuration(
      scene({
        content: {
          headline:
            "keturi penki šeši septyni aštuoni devyni dešimt vienuolika dvylika trylika",
        },
      }),
    );
    expect(wordy).toBeGreaterThan(bare);
  });
});
