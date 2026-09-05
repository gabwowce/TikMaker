import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = JSON.parse(
  fs.readFileSync(path.join(root, "projects", "claude-code-hooks.json"), "utf8"),
);
const output = structuredClone(source);

output.id = "claude-code-hooks-explained";
output.title = "Claude Code Hooks explained simply";
output.collection = "Claude Code + Chrome";
output.savedAt = Date.now();
output.storyPlan = {
  targetDuration: 30,
  premise: "A Claude Code hook is a command that runs automatically at a chosen moment, for example to block a risky action or test an edit.",
  audience: "Developers who use Claude Code but do not know what hooks are",
};

const beats = [
  {
    role: "hook",
    purpose: "Name hooks immediately and promise one concrete result.",
    visualBrief: "Break the glass as STOP BAD COMMANDS lands.",
    vo: "Claude Code hooks can stop bad commands before they run.",
    text: ["CLAUDE CODE HOOKS", "STOP BAD COMMANDS"],
  },
  {
    role: "reveal",
    purpose: "Define a hook in one sentence without jargon.",
    visualBrief: "Show Claude Code beside an action that starts automatically.",
    vo: "A hook is simply a command Claude runs automatically at a specific moment.",
    text: ["A HOOK IS", "AN AUTOMATIC COMMAND", "RUN AT THE RIGHT MOMENT"],
  },
  {
    role: "benefit",
    purpose: "Give two concrete examples of when a hook is useful.",
    visualBrief: "First show a risky command being checked, then tests running after an edit.",
    vo: "For example, check a command before it runs, or test code after an edit.",
    text: ["CHECK BEFORE IT RUNS", "TEST AFTER AN EDIT"],
  },
  {
    role: "mechanism",
    purpose: "Explain that the developer chooses when the automatic command runs.",
    visualBrief: "Use the two-part composition to show the before and after moments.",
    vo: "You choose the moment: before an action, or after Claude edits a file.",
    text: ["BEFORE AN ACTION", "+", "AFTER AN EDIT"],
  },
  {
    role: "setup",
    purpose: "Show the simple setup step.",
    visualBrief: "REPLACE RECORDING: open Claude Code settings, add a hook, and select the command it should run.",
    vo: "Add the rule in Claude Code settings and choose which command should run.",
    text: [],
  },
  {
    role: "proof",
    purpose: "Show the useful result rather than another definition.",
    visualBrief: "REPLACE RECORDING: block a risky command, then show tests starting automatically after an edit.",
    vo: "Now risky commands are blocked, and every code change is tested automatically.",
    text: [],
  },
  {
    role: "cta",
    purpose: "Invite viewers to follow for more understandable Claude Code lessons.",
    visualBrief: "Reuse the clean Claude end card.",
    vo: "Follow for more simple Claude Code tips.",
    text: ["FOLLOW FOR SIMPLE", "CLAUDE CODE TIPS"],
  },
];

const textSizeOverrides: Record<number, Record<number, number>> = {
  1: { 2: 68 },
  2: { 0: 78, 1: 82 },
  3: { 0: 86, 2: 90 },
};

output.scenes = output.scenes.map((scene: any, index: number) => {
  const beat = beats[index];
  const richHeadline = (scene.content.richHeadline ?? []).map(
    (line: any, lineIndex: number) => ({
      ...line,
      text: beat.text[lineIndex] ?? line.text,
      ...(textSizeOverrides[index]?.[lineIndex]
        ? { sizePx: textSizeOverrides[index][lineIndex] }
        : {}),
    }),
  );

  return {
    ...scene,
    id: `hooks-explained-scene-${index + 1}`,
    plan: {
      role: beat.role,
      purpose: beat.purpose,
      visualBrief: beat.visualBrief,
    },
    vo: beat.vo,
    notes: `${beat.visualBrief}\n\nTemplate geometry, animation and timing are intentionally preserved.`,
    content: { ...scene.content, richHeadline },
  };
});

// Keep reusable sound effects, including the glass break, but never copy VO
// whose spoken words belong to another script.
output.audioClips = (output.audioClips ?? []).filter(
  (clip: any) => !clip.sfxId.startsWith("vo-"),
);

const target = path.join(root, "projects", "claude-code-hooks-explained.json");
fs.writeFileSync(target, `${JSON.stringify(output, null, 2)}\n`);
console.log(target);
