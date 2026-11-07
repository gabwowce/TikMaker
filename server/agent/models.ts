import { AsyncLocalStorage } from "node:async_hooks";

// Which Claude model each agent step runs on. A step not listed here runs on
// AGENT_CLAUDE_MODEL (.env.local). The cheap ones are steps that pick from a
// list, look facts up or follow rules that code checks afterwards; the
// creative ones (hooks, script, pictures, review) stay on the main model.
const STEP_MODELS: Record<string, string> = {
  pickTemplate: "sonnet",
  research: "sonnet",
  pickMotion: "sonnet",
  routeMessage: "sonnet",
};

// The name of the step being run right now (job.ai), so the call deep inside
// llm.ts knows it without every prompt function passing it along.
const currentStep = new AsyncLocalStorage<string>();

export function inStep<T>(name: string, call: () => Promise<T>): Promise<T> {
  return currentStep.run(name, call);
}

// The model for the step being run. Order: the step's own line in .env.local
// (AGENT_MODEL_PICKMOTION=opus), then the table above, then AGENT_CLAUDE_MODEL.
export function claudeModel(): string {
  const step = currentStep.getStore();
  if (step) {
    const own = process.env[`AGENT_MODEL_${step.toUpperCase()}`];
    if (own) return own;
    if (STEP_MODELS[step]) return STEP_MODELS[step];
  }
  return process.env.AGENT_CLAUDE_MODEL ?? "sonnet";
}
