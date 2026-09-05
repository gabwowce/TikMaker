import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const projects = path.resolve(root, "projects");
const trash = path.resolve(root, "library", ".trash", "project");
if (!projects.startsWith(path.resolve(root) + path.sep)) throw new Error("Invalid projects directory");
if (!trash.startsWith(path.resolve(root) + path.sep)) throw new Error("Invalid trash directory");
fs.mkdirSync(trash, { recursive: true });

const keep = new Set([
  "project-mtii3v8d",
  "claude-code-browser-acceptance-tests",
  "claude-code-hooks",
  "claude-connectors",
]);

for (const file of fs.readdirSync(projects).filter((name) => name.endsWith(".json"))) {
  const source = path.resolve(projects, file);
  if (!source.startsWith(projects + path.sep)) throw new Error(`Invalid project path: ${file}`);
  const project = JSON.parse(fs.readFileSync(source, "utf8"));
  if (keep.has(project.id)) {
    project.collection = "Claude Code + Chrome";
    fs.writeFileSync(source, `${JSON.stringify(project, null, 2)}\n`);
    continue;
  }
  const destination = path.join(trash, `${Date.now()}-${file}`);
  fs.renameSync(source, destination);
  console.log(`TRASH ${file}`);
}
