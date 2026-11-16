import type { RunStatus } from "../../src/agent/run/status.js";

// The model's usage limit (Claude Code's "You've hit your 5-hour limit ·
// resets 5pm", an API's 429). Not a failure of the run: the work is fine and
// can go on once the limit resets, so the run is paused instead of stopped
// (agent.ts), and "Continue" picks it up from where it was.
const LIMIT =
  /hit your .*limit|usage limit|rate.?limit|quota|resource.?exhausted|\b429\b/i;

export function isLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return LIMIT.test(message);
}

// Where "Continue" restarts a paused run: the nearest point the agent can
// start from. Work saved before the pause is not done again – the build
// skips what it already has (agent.ts).
export function resumeStatus(pausedFrom: RunStatus | undefined): RunStatus {
  switch (pausedFrom) {
    case "writing_script":
      return "awaiting_hook"; // the hook is picked: the script is written next
    case "generating_voice":
    case "laying_out":
    case "reviewing":
      return "awaiting_approval"; // the script is approved: the build goes on
    case "answering":
      return "done";
    case undefined:
    case "picking_template":
    case "writing_hooks":
      return "created";
    default:
      return pausedFrom;
  }
}
