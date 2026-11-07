import { agentRun, type AgentRun } from "../../src/agent/run/run.js";
import { readAll, readJson, slugify, writeOne } from "../db.js";

// Agent runs live in db/agent-runs/<id>.json, one file per run, the same way
// projects live in db/projects/. Every change is written straight away, so a
// run survives closing the editor or restarting the server (NFR-06).
const FOLDER = "agent-runs";

export async function saveRun(run: AgentRun): Promise<void> {
  await writeOne(FOLDER, run.id, run);
}

// One change at a time per run: read the file as it is now, change it, write
// it – with no other change to the same run in between. Two writers (the
// agent working, and the user's message arriving meanwhile) otherwise both
// read the old file and the later write drops the earlier one's change.
const queues = new Map<string, Promise<unknown>>();
export function updateRun(
  id: string,
  change: (latest: AgentRun | undefined) => AgentRun,
): Promise<AgentRun> {
  const previous = queues.get(id) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(async () => {
      const run = change(await getRun(id));
      await saveRun(run);
      return run;
    });
  queues.set(id, next);
  // forget the queue once it is empty again
  void next
    .catch(() => undefined)
    .finally(() => {
      if (queues.get(id) === next) queues.delete(id);
    });
  return next;
}

// undefined = no such run, or a file that no longer matches the schema.
export async function getRun(id: string): Promise<AgentRun | undefined> {
  const data = await readJson(`${FOLDER}/${slugify(id)}.json`, undefined);
  const parsed = agentRun.safeParse(data);
  return parsed.success ? parsed.data : undefined;
}

// Every run on disk (files that no longer match the schema are skipped).
export async function allRuns(): Promise<AgentRun[]> {
  return (await readAll(FOLDER)).flatMap((data) => {
    const parsed = agentRun.safeParse(data);
    return parsed.success ? [parsed.data] : [];
  });
}

// One project's runs, newest first: the AI panel's history for the open project.
export async function listRuns(projectId: string): Promise<AgentRun[]> {
  const runs = (await allRuns()).filter((run) => run.projectId === projectId);
  return runs.sort((a, b) => b.createdAt - a.createdAt);
}
