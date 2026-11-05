import fs from "node:fs";
import path from "node:path";
import { applyMotion, compileProject } from "../src/agent/compileProject";
import { projectFromScript } from "../src/agent/projectFromScript";
import { ideaFromUser } from "../src/agent/run/1-idea";
import type { AgentRun } from "../src/agent/run/run";
import { createEmptyProject } from "../src/schema/project";
import { parseProject } from "../src/utils/normalizeProject";
import { DB_DIR, KNOWLEDGE_DIR, ROOT } from "../server/config";
import { loadKnowledge } from "../server/agent/knowledge";
import { pickLayouts } from "../server/agent/prompts/pickLayouts";
import { motionGuidance, pickMotion } from "../server/agent/prompts/pickMotion";
import { pickTemplate } from "../server/agent/prompts/pickTemplate";
import { writeHooks } from "../server/agent/prompts/writeHooks";
import { writeScript } from "../server/agent/prompts/writeScript";

// D7.5 experiment, blind: several ideas go the whole way with the real model
// (template → hooks → script → layouts), then the motion of each is planned
// twice – A from an open skill's rules, B from the template's successful
// videos. Each pair is saved as "Test N · X" and "Test N · Y" in a random
// order; which is which is written to out/compare-motion-key.json, to open
// only after watching.
//   node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/compareMotionBatch.ts
const IDEAS = [
  "How to turn on auto save in VS Code settings",
  "Three Claude Code shortcuts that save me an hour a day",
  "Why vibe-coded apps break when real users sign up",
  "TikMaker can now turn one sentence into a whole video storyboard",
  "Why I started building TikMaker. There was chaos in my head: it's hard to understand how to analyse successful videos, it takes a lot of time and some kind of structure. I wanted one brand and one library, videos easy to edit by hand, a place to write the script, and AI helping me there. I also wanted to learn to build AI agents, so I put one right inside TikMaker.",
];

// The free Gemini plan allows 15 requests a minute: one call every 5 s.
let stage = "";
const pace = () => new Promise((resolve) => setTimeout(resolve, 5000));

const { knowledge } = await loadKnowledge(KNOWLEDGE_DIR);
const entry = knowledge.workspaces.find((e) => e.workspace.id === "dev")!;
const analysesDir = path.join(ROOT, "docs", "bd", "analizes");
const key: Record<string, unknown>[] = [];
const stamp = Date.now();

for (const [n, idea] of IDEAS.entries()) {
  const test = `Test ${n + 1}`;
  try {
    const input = ideaFromUser.parse({ idea, workspaceId: "dev" });
    stage = "template";
    await pace();
    const picked = await pickTemplate(
      input,
      entry.workspace,
      knowledge.videoTemplates,
    );
    const template = knowledge.videoTemplates.find(
      (t) => t.id === picked.data.videoTemplateId,
    )!;
    stage = "hooks";
    await pace();
    const hooks = await writeHooks(
      input,
      entry.workspace,
      template,
      knowledge.hookFormulas,
    );
    const hook = [...hooks.data].sort((a, b) => b.score - a.score)[0].text;
    stage = "script";
    await pace();
    const script = await writeScript(
      input,
      entry.workspace,
      template,
      hook,
      knowledge,
    );
    stage = "layouts";
    await pace();
    const layout = await pickLayouts(
      input,
      entry.workspace,
      script.data.scenes,
      knowledge.layoutExamples,
    );
    const run = {
      id: `cmp${stamp}-${n + 1}`,
      projectId: `cmp${stamp}-${n + 1}`,
      createdAt: stamp,
      status: "done",
      input,
      template: { videoTemplateId: template.id, pickedBy: "agent" },
      hook: { text: hook, pickedBy: "agent" },
      script: { ...script.data, problems: [], approved: true },
      layout: layout.data,
      steps: [],
    } as AgentRun;
    const base = compileProject(
      projectFromScript(createEmptyProject(run.projectId, test), run),
      run,
      knowledge.layoutExamples,
      entry.style,
    );
    const layouts = layout.data.scenes.map(
      (s) => knowledge.layoutExamples.find((e) => e.id === s.layoutExampleId)!,
    );

    // Random order, so the titles say nothing about the source.
    const order =
      Math.random() < 0.5 ? ["rules", "videos"] : ["videos", "rules"];
    const pair: Record<string, unknown> = { test, idea, template: template.id };
    for (const [i, kind] of order.entries()) {
      const label = i === 0 ? "X" : "Y";
      const guidance =
        kind === "rules"
          ? await motionGuidance.rules()
          : await motionGuidance.videos(template, analysesDir);
      stage = "motion";
      await pace();
      const motion = await pickMotion(
        input,
        entry.workspace,
        script.data.scenes,
        layouts,
        guidance,
      );
      const id = `${run.projectId}-${label}`;
      const project = parseProject({
        ...applyMotion(base, run, motion.data),
        id,
        title: `${test} · ${label}`,
      });
      fs.writeFileSync(
        path.join(DB_DIR, "projects", `${id}.json`),
        JSON.stringify(project, null, 2),
      );
      const sounds = motion.data.scenes.filter((s) => s.sound).length;
      const cuts = motion.data.scenes.filter(
        (s) => s.transition === "cut",
      ).length;
      pair[label] = {
        source: kind === "rules" ? "A rules" : "B videos",
        sounds,
        cuts,
        scenes: motion.data.scenes.length,
        ms: motion.ms,
        tokens: motion.usage,
        plan: motion.data,
      };
    }
    key.push(pair);
    console.log(
      `${test}: ${template.id}, ${script.data.scenes.length} scenes – saved`,
    );
  } catch (error) {
    // One idea failing (a quota, a reply that never fit) does not stop the rest.
    console.log(
      `${test}: failed at ${stage} – ${(error as Error).message.slice(0, 200)}`,
    );
  }
}

fs.mkdirSync(path.join(ROOT, "out"), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, "out", "compare-motion-key.json"),
  JSON.stringify(key, null, 2),
);
console.log("Key: out/compare-motion-key.json (open after watching)");
