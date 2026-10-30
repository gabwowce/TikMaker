import {
  agentRunSchema,
  type AgentRun,
  type AgentRunInput,
} from "../../src/agent/agentRun.js";
import { readAll, readJson, slugify, writeOne } from "../db.js";
import { newId } from "../uploads.js";

// Agent runs live in db/agent-runs/<id>.json, one file per run, the same way
// projects live in db/projects/. Every change is written straight away, so a
// run survives closing the editor or restarting the server (NFR-06).
const FOLDER = "agent-runs";

// A new run waits in "created"; the agent's steps (D4 onwards) move it on.
export async function startRun(
  projectId: string,
  input: AgentRunInput,
): Promise<AgentRun> {
  const run: AgentRun = {
    id: newId("run"),
    projectId,
    input,
    status: "created",
    steps: [],
    createdAt: Date.now(),
  };
  await saveRun(run);
  return run;
}

export async function saveRun(run: AgentRun): Promise<void> {
  await writeOne(FOLDER, run.id, run);
}

// undefined = no such run, or a file that no longer matches the schema.
export async function getRun(id: string): Promise<AgentRun | undefined> {
  const data = await readJson(`${FOLDER}/${slugify(id)}.json`, undefined);
  const parsed = agentRunSchema.safeParse(data);
  return parsed.success ? parsed.data : undefined;
}

// One project's runs, newest first: the AI panel's history for the open project.
export async function listRuns(projectId: string): Promise<AgentRun[]> {
  const runs = (await readAll(FOLDER)).flatMap((data) => {
    const parsed = agentRunSchema.safeParse(data);
    return parsed.success && parsed.data.projectId === projectId
      ? [parsed.data]
      : [];
  });
  return runs.sort((a, b) => b.createdAt - a.createdAt);
}
