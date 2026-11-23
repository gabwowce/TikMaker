// The model's usage limit (Claude Code's "You've hit your 5-hour limit ·
// resets 5pm", an API's 429). Not a failure of the run: the work is fine and
// can go on once the limit resets, so the run is paused instead of stopped
// (agent.ts), and "Continue" picks it up from where it was (runAgent knows
// where every status goes on from).
const LIMIT =
  /hit your .*limit|usage limit|rate.?limit|quota|resource.?exhausted|\b429\b/i;

export function isLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return LIMIT.test(message);
}
