import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = JSON.parse(fs.readFileSync(path.join(root, "projects", "project-mtii3v8d.json"), "utf8"));
const output = structuredClone(source);

output.id = "claude-code-browser-acceptance-tests";
output.title = "Claude Code can test real user flows";
output.collection = "Claude Code + Chrome";
output.savedAt = Date.now();
output.storyPlan = {
  targetDuration: 30,
  premise: "Claude Code combines codebase context with a live Chrome session to verify complete user journeys.",
  audience: "Developers already using AI coding agents",
};

const beats = [
  {
    role: "hook",
    purpose: "Challenge the false confidence created by passing isolated tests.",
    visualBrief: "Claude marks move across the frame while the gap between tests and reality lands.",
    vo: "Tests passed. But the user flow still broke?",
    text: ["YOUR TESTS PASSED", "BUT THE FLOW BROKE?"],
  },
  {
    role: "reveal",
    purpose: "Reveal that Claude can verify the behavior users actually experience.",
    visualBrief: "Keep the existing Claude Code and live app recording.",
    vo: "Claude Code can verify real user flows inside Chrome.",
    text: ["Claude Code", "can verify user flows", "inside real Chrome."],
  },
  {
    role: "benefit",
    purpose: "Contrast isolated automated checks with a complete browser journey.",
    visualBrief: "Keep the clock-to-bug visual as the cost of missing integration failures.",
    vo: "Not just isolated checks. It tests the entire user journey.",
    text: ["NOT JUST UNIT TESTS", "TEST THE WHOLE FLOW"],
  },
  {
    role: "mechanism",
    purpose: "Explain why this is deeper than a generic browser automation demo.",
    visualBrief: "Keep the existing Claude plus Google Chrome logo composition.",
    vo: "It combines your codebase context with a live browser.",
    text: ["YOUR CODEBASE", "+", "LIVE CHROME"],
  },
  {
    role: "setup",
    purpose: "Show the short one-time connection before browser verification.",
    visualBrief: "Keep the existing recording of installing and adding the Chrome extension.",
    vo: "Connect the extension, then give Claude your acceptance criteria.",
    text: [],
  },
  {
    role: "proof",
    purpose: "Show acceptance criteria becoming an actual end-to-end browser run.",
    visualBrief: "Keep the existing recording: open Claude, send the prompt, then show it navigating the website.",
    vo: "Ask it to test signup, validation, and every step in between.",
    text: [],
  },
  {
    role: "cta",
    purpose: "Turn this into a recurring series about deeper Claude Code workflows.",
    visualBrief: "Reuse the clean Claude end card.",
    vo: "Follow for deeper Claude Code workflows.",
    text: ["FOLLOW FOR DEEPER", "CLAUDE CODE WORKFLOWS"],
  },
];

output.scenes = output.scenes.map((scene: any, index: number) => {
  const beat = beats[index];
  const richHeadline = (scene.content.richHeadline ?? []).map((line: any, lineIndex: number) => ({
    ...line,
    text: beat.text[lineIndex] ?? line.text,
  }));
  const visuals = (scene.content.visuals ?? []).map((visual: any, visualIndex: number) => {
    if (index === 3 && visualIndex === 1 && visual.visual?.type === "tool-logo") {
      return { ...visual, visual: { ...visual.visual, tool: "vs-code" } };
    }
    return visual;
  });
  return {
    ...scene,
    id: `hooks-scene-${index + 1}`,
    plan: { role: beat.role, purpose: beat.purpose, visualBrief: beat.visualBrief },
    vo: beat.vo,
    notes: `${beat.visualBrief}\n\nTemplate geometry, animation and timing are intentionally preserved.`,
    content: { ...scene.content, richHeadline, visuals },
  };
});

// Keep the authored rhythm and reusable SFX, but generated speech belongs to
// the old script and must never leak into the new project.
output.audioClips = (output.audioClips ?? []).filter((clip: any) => !clip.sfxId.startsWith("vo-"));

const target = path.join(root, "projects", "claude-code-browser-acceptance-tests.json");
fs.writeFileSync(target, `${JSON.stringify(output, null, 2)}\n`);
console.log(target);
