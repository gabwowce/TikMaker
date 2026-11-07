import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../../schema/project";
import { computeSceneTimings } from "../../utils/duration";
import { voicedSceneSeconds, withAgentVoice } from "../agentVoice";
import { projectFromCode } from "../projectFromCode";
import { projectFromScript } from "../projectFromScript";
import type { AgentRun } from "../run/run";

// Real word timings, as ElevenLabs returns them: one word every 0.25 s.
const timed = (text: string) =>
  text.split(" ").map((word, i) => ({
    text: word,
    start: i * 0.25,
    end: i * 0.25 + 0.2,
  }));

const voiceovers = [
  "Claude and GitHub work together on every commit",
  "Pick a tool, check the result and move on",
];
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
    keywords: ["Claude", "result"],
    scenes: [
      { file: "p/scene-1.tsx", description: "Two logos join", version: 1 },
      { file: "p/scene-2.tsx", description: "A checklist", stage: "full", version: 1 },
    ],
  },
  voice: {
    scenes: voiceovers.map((text, n) => ({
      sfxId: `vo-${n + 1}`,
      words: timed(text),
    })),
  },
} as unknown as AgentRun;

const base = projectFromScript(createEmptyProject("p", "p"), run);

describe("the agent's voiceover in the project", () => {
  it("makes every scene as long as its voice and lays a clip under it", () => {
    const project = withAgentVoice(base, run);
    const timings = computeSceneTimings(project);
    expect(project.audioClips?.map((clip) => clip.sfxId)).toEqual([
      "vo-1",
      "vo-2",
    ]);
    project.audioClips?.forEach((clip, n) => {
      expect(clip.from).toBe(timings[n].from);
      expect(clip.words).toEqual(run.voice?.scenes[n].words);
    });
    expect(project.scenes[0].durationSeconds).toBeCloseTo(
      voicedSceneSeconds(run.voice!.scenes[0]),
    );
  });

  it("replaces its own clips when applied again", () => {
    const twice = withAgentVoice(withAgentVoice(base, run), run);
    expect(twice.audioClips).toHaveLength(2);
  });

  it("turns the agent's scenes into code scenes timed to the voice", () => {
    const project = projectFromCode(base, run);
    expect(project.scenes.map((scene) => scene.type)).toEqual(["code", "code"]);
    expect(project.scenes[0].code).toEqual({ file: "p/scene-1.tsx" });
    expect(project.scenes[0].stage).toBe("top");
    expect(project.scenes[1].stage).toBe("full");
    expect(project.scenes[0].background).toBe("stage");
    expect(project.captions?.keywords).toEqual(["Claude", "result"]);
    expect(project.audioClips).toHaveLength(2);
  });

  it("keeps the creator's fields and layers when a scene is rebuilt", () => {
    const built = projectFromCode(base, run);
    const edited = {
      ...built,
      scenes: built.scenes.map((scene, n) =>
        n === 1
          ? {
              ...scene,
              code: { file: "p/scene-2.tsx", params: { title: "Mine" } },
              content: { richHeadline: [] },
            }
          : scene,
      ),
    };
    const again = projectFromCode(edited, run, 1);
    expect(again.scenes[1].code?.params).toEqual({ title: "Mine" });
    expect(again.scenes[1].content).toEqual({ richHeadline: [] });
    // a new file: the old fields no longer fit
    const moved = {
      ...run,
      code: {
        ...run.code!,
        scenes: [run.code!.scenes[0], { ...run.code!.scenes[1], file: "p/other.tsx" }],
      },
    };
    expect(projectFromCode(edited, moved, 1).scenes[1].code).toEqual({
      file: "p/other.tsx",
    });
  });
});
