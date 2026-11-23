// Which Claude model each agent step runs on. A step not listed here runs on
// AGENT_CLAUDE_MODEL (.env.local). The cheap ones are steps that pick from a
// list, look facts up or follow rules that code checks afterwards; the
// creative ones (hooks, script, pictures, review) stay on the main model.
const STEP_MODELS: Record<string, string> = {
  pickTemplate: "sonnet",
  research: "sonnet",
  routeMessage: "sonnet",
  // the pictures as code: the creative heart of the video
  writeCode: "opus",
};

// The model for a step. Order: the step's own line in .env.local
// (AGENT_MODEL_WRITESCRIPT=opus), then the table above, then AGENT_CLAUDE_MODEL.
export function claudeModel(step?: string): string {
  if (step) {
    const own = process.env[`AGENT_MODEL_${step.toUpperCase()}`];
    if (own) return own;
    if (STEP_MODELS[step]) return STEP_MODELS[step];
  }
  return process.env.AGENT_CLAUDE_MODEL ?? "sonnet";
}
