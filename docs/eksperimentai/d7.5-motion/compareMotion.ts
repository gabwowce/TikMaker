import fs from "node:fs";
import path from "node:path";
import { applyMotion, compileProject } from "../src/agent/compileProject";
import { agentRun } from "../src/agent/run/run";
import { parseProject } from "../src/utils/normalizeProject";
import { DB_DIR, KNOWLEDGE_DIR, ROOT } from "../server/config";
import { loadKnowledge } from "../server/agent/knowledge";
import {
  motionGuidance,
  pickMotion,
  type MotionSource,
} from "../server/agent/prompts/pickMotion";

// D7.5 experiment: the same laid-out video, its motion and sound planned
// twice – A from an open skill's editing rules, B from the successful videos
// the template came from – saved as two projects to watch side by side.
//   node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/compareMotion.ts <runId>
const runId = process.argv[2];
if (!runId) throw new Error("Usage: compareMotion.ts <runId>");

const run = agentRun.parse(
  JSON.parse(
    fs.readFileSync(path.join(DB_DIR, "agent-runs", `${runId}.json`), "utf8"),
  ),
);
if (!run.script || !run.layout || !run.template)
  throw new Error("The run has no approved script and layout yet");

const { knowledge } = await loadKnowledge(KNOWLEDGE_DIR);
const entry = knowledge.workspaces.find(
  (e) => e.workspace.id === run.input.workspaceId,
)!;
const template = knowledge.videoTemplates.find(
  (t) => t.id === run.template!.videoTemplateId,
)!;
const layouts = run.layout.scenes.map(
  (s) => knowledge.layoutExamples.find((e) => e.id === s.layoutExampleId)!,
);

// The project as the user has it now (hand edits kept), laid out again.
const source = parseProject(
  JSON.parse(
    fs.readFileSync(
      path.join(DB_DIR, "projects", `${run.projectId}.json`),
      "utf8",
    ),
  ),
);
const base = compileProject(source, run, knowledge.layoutExamples, entry.style);

const versions: [MotionSource, string][] = [
  ["rules", "A rules"],
  ["videos", "B videos"],
];
const report: Record<string, unknown> = {};
for (const [kind, label] of versions) {
  const guidance =
    kind === "rules"
      ? await motionGuidance.rules()
      : await motionGuidance.videos(
          template,
          path.join(ROOT, "docs", "bd", "analizes"),
        );
  const result = await pickMotion(
    run.input,
    entry.workspace,
    run.script.scenes,
    layouts,
    guidance,
  );
  const id = `${run.projectId}-${kind}`;
  const project = parseProject({
    ...applyMotion(base, run, result.data),
    id,
    title: `${source.title} · ${label}`,
  });
  fs.writeFileSync(
    path.join(DB_DIR, "projects", `${id}.json`),
    JSON.stringify(project, null, 2),
  );
  report[kind] = {
    ms: result.ms,
    attempts: result.attempts,
    usage: result.usage,
    plan: result.data,
  };
  console.log(`${label}: ${id} (${result.ms} ms, ${result.attempts} tries)`);
  for (const [i, s] of result.data.scenes.entries())
    console.log(
      `  ${i + 1} ${s.transition} | text ${s.textIn}/${s.textSplit}` +
        `${s.highlight ? ` [${s.highlight}]` : ""} | picture ${s.visualIn}/${s.visualAlive}` +
        ` | sound ${s.sound ? `${s.sound.type} on ${s.sound.on}` : "-"}`,
    );
}
fs.mkdirSync(path.join(ROOT, "out"), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, "out", `compare-motion-${runId}.json`),
  JSON.stringify(report, null, 2),
);
