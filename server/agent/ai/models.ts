import { AsyncLocalStorage } from "node:async_hooks";

// Which Claude model each model call runs on. The keys are not the steps'
// numbers but the names of the calls (job.ai("<name>", …)) – one step makes
// one or more of them:
//
//   2 Angle        checkValue, pickTemplate, writeHooks
//   3 Script       research, writeScript
//   5 Pictures     writeCode
//   6 Self-review  reviewFrames, (then writeCode / rewriteScene to fix)
//   7 Chat         routeMessage, writeHooks, rewriteScene, writeCode, reviewFrames
//
// A call not listed here runs on AGENT_CLAUDE_MODEL (.env.local). The cheap
// ones pick from a list, look facts up or sort a message; the creative ones
// (hooks, script, review) stay on the main model, the pictures on the best.
const STEP_MODELS: Record<string, string> = {
  pickTemplate: "sonnet",
  research: "sonnet",
  routeMessage: "sonnet",
  // the pictures as code: the creative heart of the video
  writeCode: "opus",
};

// The name of the call being run right now (job.ai), so the call deep inside
// llm.ts knows it without every prompt function passing it along.
const currentStep = new AsyncLocalStorage<string>();

export function inStep<T>(name: string, call: () => Promise<T>): Promise<T> {
  return currentStep.run(name, call);
}

// The model for the call being run. Order: the call's own line in .env.local
// (AGENT_MODEL_WRITESCRIPT=opus), then the table above, then AGENT_CLAUDE_MODEL.
export function claudeModel(): string {
  const step = currentStep.getStore();
  if (step) {
    const own = process.env[`AGENT_MODEL_${step.toUpperCase()}`];
    if (own) return own;
    if (STEP_MODELS[step]) return STEP_MODELS[step];
  }
  return process.env.AGENT_CLAUDE_MODEL ?? "sonnet";
}
