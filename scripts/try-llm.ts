import { z } from "zod";
import { callStructured } from "../server/agent/llm";

// Usage: npx tsx --env-file=.env.local scripts/try-llm.ts
//
// The smallest possible agent call: one prompt, one tiny schema, and what it
// cost. Run it twice to see whether the provider cached the prompt.

const videoPlanSchema = z.object({
  title: z.string(),
  scenes: z.array(z.string()).min(3).max(6),
});

const { data, usage, ms, attempts } = await callStructured(videoPlanSchema, {
  system:
    "You plan short vertical videos for a developer audience. Answer in English.",
  user: "Plan a 30-second video: how to undo the last git commit.",
});

console.log(data);
console.log(
  `${ms} ms, ${attempts} attempt(s); tokens in ${usage.inputTokens}` +
    ` (cached ${usage.cachedInputTokens}), out ${usage.outputTokens}` +
    ` (thinking ${usage.thinkingTokens})`,
);
