import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { videoProjectSchema } from "../src/schema/project";

const [, , projectPathArg, outputPathArg] = process.argv;

if (!projectPathArg) {
  console.error("Usage: npm run render:project -- <path-to-project.json> [output.mp4]");
  console.error("Example: npm run render:project -- projects/template-showcase.json out/showcase.mp4");
  process.exit(1);
}

const projectPath = path.resolve(process.cwd(), projectPathArg);

let raw: unknown;
try {
  raw = JSON.parse(readFileSync(projectPath, "utf-8"));
} catch (err) {
  console.error(`Could not read/parse ${projectPath}:`, err instanceof Error ? err.message : err);
  process.exit(1);
}

const parseResult = videoProjectSchema.safeParse(raw);
if (!parseResult.success) {
  console.error(`"${projectPathArg}" does not match the project schema:`);
  console.error(parseResult.error.format());
  process.exit(1);
}
const project = parseResult.data;

const outputPath = outputPathArg
  ? path.resolve(process.cwd(), outputPathArg)
  : path.resolve(process.cwd(), "out", `${project.id}.mp4`);

mkdirSync(path.dirname(outputPath), { recursive: true });

const propsPath = path.resolve(process.cwd(), ".render-props.tmp.json");
writeFileSync(propsPath, JSON.stringify({ project }), "utf-8");

console.log(`Rendering "${project.title}" (${project.scenes.length} scenes) -> ${outputPath}`);

const result = spawnSync("npx", ["remotion", "render", "TikTokVideo", outputPath, `--props=${propsPath}`], {
  stdio: "inherit",
  shell: true,
});

if (result.error) {
  console.error("Failed to launch the render process:", result.error);
  process.exit(1);
}
if (result.signal) {
  console.error(`Render process was killed by signal ${result.signal}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
