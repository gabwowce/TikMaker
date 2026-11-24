import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { projectFromCode } from "../../src/agent/projectFromCode.js";
import { projectFromScript } from "../../src/agent/projectFromScript.js";
import {
  codeFile,
  codeFolder,
  type CodeFromAi,
  type CodeInRun,
} from "../../src/agent/run/4-code.js";
import type { AgentRun } from "../../src/agent/run/run.js";
import {
  createEmptyProject,
  type VideoProject,
} from "../../src/schema/project.js";
import {
  computeSceneTimings,
  projectDurationInFrames,
} from "../../src/utils/duration.js";
import { parseProject } from "../../src/utils/normalizeProject.js";
import { sceneWords } from "../../src/utils/sceneWords.js";
import { ROOT } from "../config.js";
import { readJson, slugify } from "../db.js";
import { restoreVersion, saveVersion } from "./codeVersions.js";
import type { Job } from "./job.js";
import {
  writeCode,
  type CodeBriefScene,
  type CodeJob,
} from "./prompts/writeCode.js";
import { savedVisualsBrief } from "./visuals.js";

// The pictures as code (docs/tikmaker-kryptis.md): Claude Code writes the
// scenes' files (prompts/writeCode.ts); the code here checks them – every
// file there, a component exported, `tsc` clean in the folder – gives the
// errors back once, and a scene that still fails gets a plain fallback (its
// on-screen words) with the error kept, so the video always renders.

export const generatedDir = () => path.join(ROOT, "src", "generated");

// The project the way the editor builds it from this run: the script's
// scenes, then the code scenes and the voice on them. Settings the saved
// project has (captions, music, the creator's fields) are kept.
export async function builtProject(
  job: Job,
  run: AgentRun = job.run,
): Promise<VideoProject> {
  const base =
    (await savedProject(job)) ??
    createEmptyProject(run.projectId, run.input.idea.slice(0, 60));
  return projectFromCode(projectFromScript(base, run), run);
}

export async function savedProject(
  job: Job,
): Promise<VideoProject | undefined> {
  const saved = await readJson(
    `projects/${slugify(job.run.projectId)}.json`,
    null,
  );
  return saved ? parseProject(saved) : undefined;
}

// The run with every scene's file planned (before the code exists): what the
// props file for `remotion still` is built from.
function withPlannedCode(run: AgentRun): AgentRun {
  const scenes = run.script?.scenes ?? [];
  const code: CodeInRun = run.code ?? {
    scenes: [],
    keywords: [],
    wishes: [],
    problems: [],
  };
  return {
    ...run,
    code: {
      ...code,
      scenes: scenes.map(
        (_, n) =>
          code.scenes[n] ?? {
            file: codeFile(run.projectId, n),
            description: "",
            version: 1,
          },
      ),
    },
  };
}

// Everything Claude Code gets for a write or a rewrite.
async function codeJob(
  job: Job,
  write: number[],
  instruction?: string,
): Promise<CodeJob> {
  const run = withPlannedCode(job.run);
  const script = run.script;
  if (!script) throw new Error("The pictures are written after the script");
  const folder = codeFolder(run.projectId);
  fs.mkdirSync(path.join(generatedDir(), folder), { recursive: true });
  const project = await builtProject(job, run);
  // the props file `remotion still` renders the video from
  const out = path.join(ROOT, "out", "agent", folder);
  fs.mkdirSync(out, { recursive: true });
  const propsFile = `out/agent/${folder}/props.json`;
  fs.writeFileSync(path.join(ROOT, propsFile), JSON.stringify({ project }));
  const total = projectDurationInFrames(project);
  const timings = computeSceneTimings(project);
  const scenes: CodeBriefScene[] = script.scenes.map((scene, n) => {
    const timing = timings.find(
      (t) => t.scene.id === `scene-${run.id}-${n + 1}`,
    );
    const from = timing?.from ?? 0;
    const durationInFrames = timing?.durationInFrames ?? 90;
    const file = run.code!.scenes[n].file;
    const onDisk = path.join(generatedDir(), file);
    return {
      scene,
      file,
      from,
      durationInFrames,
      words: sceneWords(
        project,
        { from, durationInFrames, vo: scene.voiceover },
        total,
      ),
      ...(instruction && write.includes(n) && fs.existsSync(onDisk)
        ? { current: fs.readFileSync(onDisk, "utf-8") }
        : {}),
    };
  });
  return {
    input: run.input,
    workspace: job.workspace,
    folder,
    scenes,
    write,
    instruction,
    propsFile,
    visuals: savedVisualsBrief(run.input.workspaceId),
    style: run.input.visualStyle ?? "clear",
    screens: tikmakerScreens(),
  };
}

// 4 Building: every scene written. Returns the run's code.
export async function writeCodeScenes(job: Job): Promise<CodeInRun> {
  const count = job.run.script?.scenes.length ?? 0;
  const all = [...Array(count).keys()];
  const brief = await codeJob(job, all);
  const answer = await job.ai(writeCode(brief, ROOT));
  return checkAndFix(job, brief, answer, undefined);
}

// One scene (or a few) written again – a message, the review. The scene's
// code before is kept as a version (Undo). Returns notes for the reply.
export async function rewriteCodeScenes(
  job: Job,
  scenes: number[],
  instruction: string,
): Promise<string[]> {
  const code = job.run.code;
  if (!code) throw new Error("The video is not built yet");
  for (const n of scenes) {
    const scene = code.scenes[n];
    if (!scene) throw new Error(`There is no scene ${n + 1}`);
    saveVersion(job.run.projectId, scene.file, scene.version);
  }
  const brief = await codeJob(job, scenes, instruction);
  const answer = await job.ai(writeCode(brief, ROOT));
  const next = await checkAndFix(job, brief, answer, code);
  return next.problems.filter((problem) =>
    scenes.some((n) => problem.startsWith(`Scene ${n + 1}:`)),
  );
}

// The checks, one fix with the errors, then the fallback for what still fails;
// the result saved in the run.
async function checkAndFix(
  job: Job,
  brief: CodeJob,
  answer: CodeFromAi,
  before: CodeInRun | undefined,
): Promise<CodeInRun> {
  let answers = answer;
  let errors = await checkScenes(brief);
  if (errors.size) {
    const fix = { ...brief, errors: [...errors.values()].flat() };
    const fixed = await job.ai(writeCode(fix, ROOT));
    answers = merge(answers, fixed);
    errors = await checkScenes(brief);
  }
  const problems: string[] = [];
  for (const [n, list] of errors) {
    const scene = brief.scenes[n];
    fs.writeFileSync(
      path.join(generatedDir(), scene.file),
      fallbackScene(scene.scene.onScreen, list.join("\n")),
    );
    problems.push(
      `Scene ${n + 1}: the code did not compile – a plain scene stands in. ${list[0] ?? ""}`,
    );
  }
  const code: CodeInRun = {
    scenes: brief.scenes.map(({ file }, n) => {
      const was = before?.scenes[n];
      if (!brief.write.includes(n) && was) return was;
      const said = answers.scenes.find((s) => s.sceneIndex === n);
      const history = was
        ? [
            ...(was.history ?? []).filter((h) => h.version < was.version),
            {
              version: was.version,
              description: was.description,
              ...(brief.instruction ? { changedBy: brief.instruction } : {}),
            },
          ]
        : undefined;
      return {
        file,
        description: said?.description ?? was?.description ?? "",
        ...(history ? { history } : {}),
        ...((said?.stage ?? was?.stage)
          ? { stage: said?.stage ?? was?.stage }
          : {}),
        ...((said?.sounds ?? was?.sounds)
          ? { sounds: said?.sounds ?? was?.sounds }
          : {}),
        ...((said?.transition ?? was?.transition)
          ? { transition: said?.transition ?? was?.transition }
          : {}),
        version: (was?.version ?? 0) + 1,
        ...(errors.has(n) ? { error: errors.get(n)!.join("\n") } : {}),
      };
    }),
    keywords: [...new Set([...(before?.keywords ?? []), ...answers.keywords])],
    wishes: [...new Set([...(before?.wishes ?? []), ...answers.wishes])],
    problems: [
      ...(before?.problems ?? []).filter(
        (p) => !brief.write.some((n) => p.startsWith(`Scene ${n + 1}:`)),
      ),
      ...problems,
    ],
  };
  await job.save({ code });
  return code;
}

const merge = (a: CodeFromAi, b: CodeFromAi): CodeFromAi => ({
  scenes: [
    ...a.scenes.filter(
      (s) => !b.scenes.some((t) => t.sceneIndex === s.sceneIndex),
    ),
    ...b.scenes,
  ],
  keywords: [...new Set([...a.keywords, ...b.keywords])],
  wishes: [...new Set([...a.wishes, ...b.wishes])],
});

// What is wrong with the scenes being written, by scene: no file, no
// component, or compile errors in the folder (errors in a shared file count
// for every scene written now).
export async function checkScenes(
  brief: CodeJob,
): Promise<Map<number, string[]>> {
  const found = new Map<number, string[]>();
  const add = (n: number, error: string) =>
    found.set(n, [...(found.get(n) ?? []), error]);
  for (const n of brief.write) {
    const file = path.join(generatedDir(), brief.scenes[n].file);
    if (!fs.existsSync(file)) add(n, `${brief.scenes[n].file} was not written`);
    else if (!/export\s+default\s/.test(fs.readFileSync(file, "utf-8")))
      add(n, `${brief.scenes[n].file} has no default export (the component)`);
  }
  const errors = await compileErrors(brief.folder);
  for (const error of errors) {
    const scene = /scene-(\d+)\.tsx/.exec(error.split("(")[0]);
    const n = scene ? Number(scene[1]) - 1 : undefined;
    if (n !== undefined && brief.write.includes(n)) add(n, error);
    else if (n === undefined) for (const m of brief.write) add(m, error);
  }
  return found;
}

// `tsc` over the project, only the lines about this folder. TIKMAKER_TSC=off
// skips it (the tests).
export function compileErrors(folder: string): Promise<string[]> {
  if (process.env.TIKMAKER_TSC === "off") return Promise.resolve([]);
  return new Promise((resolve) => {
    const child = spawn("npx", ["tsc", "--noEmit", "-p", "."], {
      cwd: ROOT,
      shell: true,
    });
    let out = "";
    child.stdout.on("data", (chunk) => (out += chunk));
    child.stderr.on("data", (chunk) => (out += chunk));
    child.on("close", () =>
      resolve(
        out
          .split(/\r?\n/)
          .map((line) => line.replace(/\\/g, "/"))
          .filter((line) => line.startsWith(`src/generated/${folder}/`))
          .slice(0, 30),
      ),
    );
  });
}

// A scene whose code failed: its on-screen words, big, and the error in small.
export function fallbackScene(onScreen: string, error: string): string {
  return `import { AbsoluteFill } from "remotion";
import { useBrand } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";

// The code written for this scene did not compile; this plain scene stands
// in until it is written again. The error:
${error
  .split("\n")
  .map((line) => `// ${line}`)
  .join("\n")}
export const description = ${JSON.stringify(`Fallback: ${onScreen}`)};

export default function Fallback(_: CodeSceneProps) {
  const c = useBrand();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 640 }}>
      <div style={{ fontFamily: c.fontStrong, fontSize: 96, color: c.text, textAlign: "center", padding: "0 90px", lineHeight: 1.1 }}>
        {${JSON.stringify(onScreen)}}
      </div>
    </AbsoluteFill>
  );
}
`;
}

// Undo: the scene's code goes back one version. The code there now is kept
// as its own version first, so nothing is lost.
export async function undoCodeScene(job: Job, n: number): Promise<void> {
  const code = job.run.code;
  const scene = code?.scenes[n];
  if (!code || !scene) throw new Error(`There is no scene ${n + 1}`);
  const back = (scene.history ?? [])
    .filter((h) => h.version < scene.version)
    .pop();
  if (!back) throw new Error(`Scene ${n + 1} has no earlier version`);
  saveVersion(job.run.projectId, scene.file, scene.version);
  restoreVersion(scene.file, back.version);
  const { error: _, ...rest } = scene;
  await job.save({
    code: {
      ...code,
      scenes: code.scenes.map((s, i) =>
        i === n
          ? {
              ...rest,
              version: back.version,
              description: back.description,
              history: (scene.history ?? []).filter(
                (h) => h.version < back.version,
              ),
            }
          : s,
      ),
      problems: code.problems.filter((p) => !p.startsWith(`Scene ${n + 1}:`)),
    },
  });
}

// TikMaker's own screens the agent can open for a recording (scripts/asset.ts
// tikmaker, "project" step): the newest run of every project, by where it
// stands – waiting for a hook pick, a script to approve, a finished video.
const SCREEN_OF: Partial<Record<string, string>> = {
  awaiting_hook: "the agent panel with three hooks to pick from",
  awaiting_approval: "the agent panel with a script waiting for Approve",
  done: "a finished video in the editor (scene strip, timeline, preview) with the agent's cards",
};
export function tikmakerScreens(): string[] {
  const dir = path.join(ROOT, "db", "agent-runs");
  if (!fs.existsSync(dir)) return [];
  const newest = new Map<
    string,
    { status: string; at: number; title: string }
  >();
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".json")) continue;
    try {
      const run = JSON.parse(fs.readFileSync(path.join(dir, name), "utf-8"));
      const project = path.join(
        ROOT,
        "db",
        "projects",
        `${run.projectId}.json`,
      );
      if (!SCREEN_OF[run.status] || !fs.existsSync(project)) continue;
      const seen = newest.get(run.projectId);
      if (seen && seen.at > run.createdAt) continue;
      const title = JSON.parse(fs.readFileSync(project, "utf-8")).title ?? "";
      newest.set(run.projectId, {
        status: run.status,
        at: run.createdAt,
        title,
      });
    } catch {
      // a file being written – skipped
    }
  }
  const byStatus = new Map<string, string[]>();
  for (const [id, { status, title }] of newest)
    byStatus.set(status, [
      ...(byStatus.get(status) ?? []),
      `${id} ("${title}")`,
    ]);
  return [...byStatus].map(
    ([status, ids]) => `${SCREEN_OF[status]}: ${ids.slice(0, 4).join(", ")}`,
  );
}
