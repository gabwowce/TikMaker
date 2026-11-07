import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../../schema/project";
import { projectFromCode } from "../projectFromCode";
import { projectFromScript } from "../projectFromScript";
import type { AgentRun } from "../run/run";

const timed = (text: string) =>
  text.split(" ").map((word, i) => ({ text: word, start: i * 0.5, end: i * 0.5 + 0.4 }));
const voiceovers = ["Type slash rewind and it undoes", "Then it works again"];
const run = {
  id: "r1",
  projectId: "p",
  createdAt: 0,
  status: "done",
  input: { idea: "An idea", workspaceId: "dev", targetSeconds: 45 },
  steps: [],
  script: {
    approved: true,
    problems: [],
    skipped: [],
    scenes: voiceovers.map((voiceover) => ({
      role: "item",
      voiceover,
      onScreen: "",
      visual: "",
      needsRecording: false,
    })),
  },
  code: {
    problems: [],
    wishes: [],
    keywords: [],
    scenes: [
      {
        file: "p/scene-1.tsx",
        description: "a",
        version: 1,
        sounds: [
          { onWord: "rewind", sound: "type" },
          { onWord: "Undoes", sound: "whoosh" },
          { onWord: "nowhere", sound: "pop" },
        ],
      },
      { file: "p/scene-2.tsx", description: "b", version: 1, sounds: [{ onWord: "works", sound: "success" }] },
    ],
  },
  voice: {
    scenes: voiceovers.map((text, n) => ({ sfxId: `vo-${n + 1}`, words: timed(text) })),
  },
} as unknown as AgentRun;

const base = projectFromScript(createEmptyProject("p", "p"), run);
const sounds = (p: ReturnType<typeof projectFromCode>) =>
  (p.audioClips ?? []).filter((clip) => clip.id.startsWith("sfx-"));

describe("the agent's sound cues", () => {
  it("become library clips on their words, a hair early", () => {
    const project = projectFromCode(base, run);
    const clips = sounds(project);
    // "nowhere" is not said: no clip
    expect(clips.map((c) => [c.id, c.sfxId])).toEqual([
      ["sfx-r1-1-1", "type-word"],
      ["sfx-r1-1-2", "soft-whoosh"],
      ["sfx-r1-2-1", "d-done"],
    ]);
    // "rewind" is word 2 (from 0): 1.0 s → frame 30, minus 2
    expect(clips[0].from).toBe(28);
    // scene 2 starts after scene 1's voice (2.4 s + 0.35 s tail)
    const second = project.audioClips!.find((c) => c.id === "audio-r1-scene-r1-2")!;
    // "works" is word 2 of scene 2: 1.0 s after its start
    expect(clips[2].from).toBe(second.from + 30 - 2);
  });

  it("are replaced only for the scene written again; clips added by hand stay", () => {
    const built = projectFromCode(base, run);
    const withMine = {
      ...built,
      audioClips: [...(built.audioClips ?? []), { id: "mine", sfxId: "d-ping", from: 10 }],
    };
    const changed = {
      ...run,
      code: { ...run.code!, scenes: [{ ...run.code!.scenes[0], sounds: [] }, run.code!.scenes[1]] },
    } as AgentRun;
    const again = projectFromCode(withMine, changed, 0);
    expect(sounds(again).map((c) => c.id)).toEqual(["sfx-r1-2-1"]);
    expect(again.audioClips!.some((c) => c.id === "mine")).toBe(true);
  });
});
