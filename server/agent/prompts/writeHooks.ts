import { z } from "zod";
import type {
  HookFormula,
  VideoTemplate,
  Workspace,
} from "../../../src/agent/knowledge.js";
import type { IdeaFromUser } from "../../../src/agent/run/1-idea.js";
import { hookFromAi, type HookFromAi } from "../../../src/agent/run/2-angle.js";
import { callStructured, type StructuredResult } from "../llm.js";

// Step 2b: three opening lines for the idea (FR-06). The model sees only the
// formulas whose type the template allows, with one example each — enough to
// follow them, and the prompt stays small.

const SYSTEM = `You write the opening line (hook) of a short vertical video (TikTok, Reels, Shorts):
the words shown and spoken in the first two seconds, which decide whether people keep watching.

Write THREE different hooks for the idea.
The formulas show openings that have worked: follow one where it fits this idea (fill it
in, do not copy its example) or write your own. formulaId = the formula's id, or null for
a hook of your own.
Fill a formula only with what the idea says: never claim something it does not
(no "I switched from…", no number, no result the idea does not give).
Each hook: one line, at most 12 words, plain spoken English, no hashtags, no emojis.
score: 5 = people stop scrolling, 3 = fine, 1 = weak.`;

function userPrompt(
  input: IdeaFromUser,
  workspace: Workspace,
  template: VideoTemplate,
  formulas: HookFormula[],
): string {
  const list = formulas
    .map(
      (f) =>
        `- id: ${f.id}\n  type: ${f.type}\n  formula: ${f.formula}\n` +
        `  example: ${f.examples[0]}`,
    )
    .join("\n");
  return `Channel: ${workspace.name}. ${workspace.brief}
Audience: ${workspace.audience}

Idea: ${input.idea}
Template: ${template.name} – ${template.oneLine}

Formulas:
${list}`;
}

export async function writeHooks(
  input: IdeaFromUser,
  workspace: Workspace,
  template: VideoTemplate,
  formulas: HookFormula[],
  model?: Parameters<typeof callStructured>[2],
): Promise<StructuredResult<HookFromAi[]>> {
  // Only the formulas this template's hooks can be (its hookTypes).
  const usable = formulas.filter((f) => template.hookTypes.includes(f.type));
  const ids = usable.map((f) => f.id);
  if (ids.length === 0)
    throw new Error(`No hook formula fits the template "${template.id}"`);

  // Three hooks; a formulaId, when given, must be one of the usable formulas.
  // A reply that breaks it is asked for again.
  const schema = z.object({
    hooks: z
      .array(
        hookFromAi.extend({
          formulaId: z.enum(ids as [string, ...string[]]).nullable(),
        }),
      )
      .length(3),
  });

  const result = await callStructured(
    schema,
    { system: SYSTEM, user: userPrompt(input, workspace, template, usable) },
    model,
  );
  return { ...result, data: result.data.hooks };
}
