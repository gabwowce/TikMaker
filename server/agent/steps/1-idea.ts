import type { AgentRun, AgentRunInput } from "../../../src/agent/agentRun.js";
import { newId } from "../../uploads.js";
import { saveRun } from "../runs.js";

// 1 Idea: the user filled the form and pressed Start. The run gets its own
// file in "created"; agent.ts takes it on from there.
export async function step1Idea(
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
