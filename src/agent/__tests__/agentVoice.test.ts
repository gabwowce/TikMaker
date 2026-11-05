import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../../schema/project";
import { computeSceneTimings } from "../../utils/duration";
import { voicedSceneSeconds, withAgentVoice } from "../agentVoice";
import { projectFromBlocks } from "../projectFromBlocks";
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
  blocks: {
    problems: [],
    wishes: [],
    scenes: [
      {
        stage: "top",
        keywords: [],
        blocks: [
          { onWord: "Claude", kind: "logos", ids: ["claude"] },
          { onWord: "commit", kind: "badge", text: "01" },
        ],
      },
      {
        stage: "top",
        keywords: [],
        blocks: [{ onWord: "Pick", kind: "list", items: ["Pick", "Check"] }],
      },
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

  it("puts the blocks on the words as they are really spoken", () => {
    const project = projectFromBlocks(base, run);
    const [, commit] = project.scenes[0].content.visuals ?? [];
    // "commit" is word 7: spoken at 7 × 0.25 s = 1.75 s
    expect(commit.delay).toBe(Math.round(1.75 * 30));
    expect(project.audioClips).toHaveLength(2);
  });
});
