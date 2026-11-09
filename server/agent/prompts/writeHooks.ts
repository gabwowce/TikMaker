import { creatorFacts, videoValue } from "./productScreens.js";
import type { ValueInRun } from "../../../src/agent/run/2-angle.js";
import { z } from "zod";
import type {
  HookFormula,
  VideoTemplate,
  Workspace,
} from "../../../src/agent/knowledge.js";
import type { IdeaFromUser } from "../../../src/agent/run/1-idea.js";
import {
  hookAngle,
  hookFromAi,
  type HookFromAi,
} from "../../../src/agent/run/2-angle.js";
import { blockKind } from "../../../src/agent/run/4-blocks.js";
import {
  generatedLogos,
  generatedProps,
} from "../../../src/registries/assets.generated.js";
import { callStructured, type StructuredResult } from "../llm.js";

// Step 2b: three opening lines for the idea (FR-06). The model sees only the
// formulas whose type the template allows, with one example each — enough to
// follow them, and the prompt stays small.

const SYSTEM = `You are an expert short-form video strategist and hook writer for TikTok, Reels and
YouTube Shorts. Create THREE genuinely different hooks for the video idea.

A hook is the first 1–2 seconds of the video. It combines the opening words (spoken and
shown), the first visual frame, and the curiosity or emotion that makes someone keep
watching.

## 1. What makes a strong hook
Use one or more of these – not all of them in every hook:
- CURIOSITY GAP: the viewer wants to find out something they don't know yet.
- SPECIFICITY: concrete details instead of vague promises.
- UNEXPECTEDNESS: a surprising angle, contrast or observation.
- RELEVANCE: tied to something this audience cares about.
- PAYOFF PROMISE: a valuable result, insight or discovery the viewer gets by watching.

Avoid: openings like "Today we're going to talk about…"; obvious questions with
predictable answers; empty clickbait that promises more than the video delivers; vague
claims like "This will change everything"; hooks that only announce the topic.

## 2. Three different approaches
The three hooks take genuinely different creative angles – for example curiosity (how or
why something works), outcome (a valuable result), surprise (an assumption challenged),
problem (the pain the viewer knows), demonstration (the thing shown working). Pick the
three strongest for this idea and name each one's angle; all three angles are different.
Never three rewordings of one hook.

## 3. Formulas
The formulas given are proven structures. Use one when it truly improves the hook and
fill it only with what the idea supports (formulaId = its id); or write your own
(formulaId = null). Never invent personal experiences, results, statistics, product
capabilities or comparisons the idea does not give. Create interest without misleading.

## 4. Writing
One short line, at most 12 words, natural spoken English, understood at once, no hashtags,
no emojis, no filler words, concrete rather than marketing language. It should sound like
a real person talking, not an ad or an AI headline.

## 5. First frame – the visual hook
firstFrame: exactly what the viewer SEES in the first two seconds – ONE concrete
composition: an action or an object, not a mood. The words create curiosity or give
context; the picture proves, demonstrates or makes the idea more interesting.
Prefer, in this order: the actual result; the product or tool performing an action; a
before / after; the problem shown; a striking object or visual metaphor.
Bad: "A futuristic AI animation", "An exciting digital scene", "Technology comes to life".
Good: "A screen recording of an AI agent generating a complete video from one text
prompt", "The finished vertical video appears next to the one-line idea that made it".
Use only what this video can really show – listed under "This video can show". Never
assume footage, faces or stock images it does not have. Words on an empty background are
the weakest opening; avoid them when a meaningful picture is possible.

## 6. Score
Score each complete opening – words AND first frame together – from 1 to 5, judging
clarity, curiosity, relevance to the audience and visual potential:
1 weak, generic or unclear · 2 understandable but little reason to stay · 3 clear and
relevant, not memorable · 4 specific, interesting, visually strong · 5 exceptional: grabs
at once and makes people need to see what happens. Be critical – 5 is rare; polish alone
is not a reason for a high score.

## 7. Before answering
Check: three different angles; each supported by the idea; each first frame concrete and
showable; the picture adds something the words don't; understood within two seconds; no
misleading clickbait.`;

function userPrompt(
  input: IdeaFromUser,
  workspace: Workspace,
  template: VideoTemplate,
  formulas: HookFormula[],
  value?: ValueInRun,
): string {
  const list = formulas
    .map(
      (f) =>
        `- id: ${f.id}\n  type: ${f.type}\n  formula: ${f.formula}\n` +
        `  example: ${f.examples[0]}`,
    )
    .join("\n");
  return `Channel: ${workspace.name}. ${workspace.brief}
Audience: ${workspace.audience}${creatorFacts(workspace)}

Idea: ${input.idea}${videoValue(value)}
Template: ${template.name} – ${template.oneLine}

This video can show:
${canShow(input)}

Formulas:
${list}`;
}

// What a first frame can be made of in this video: the creator's own screen
// recordings (unless "motion graphics only"), the motion blocks the editor
// draws, and the library's logos and objects – by name, so the model does not
// promise a picture nobody can make.
function canShow(input: IdeaFromUser): string {
  const kinds = blockKind.options.filter(
    (kind) => !(input.motionOnly && kind === "screen"),
  );
  return [
    input.motionOnly
      ? "- no screen recordings (motion graphics only)"
      : "- the creator's own screen recordings (the product, an app, a website in use)",
    `- motion blocks: ${kinds.join(", ")}`,
    `- logos: ${generatedLogos.map((asset) => asset.id).join(", ")}`,
    `- objects: ${generatedProps.map((asset) => asset.id).join(", ")}`,
  ].join("\n");
}

export async function writeHooks(
  input: IdeaFromUser,
  workspace: Workspace,
  template: VideoTemplate,
  formulas: HookFormula[],
  model?: Parameters<typeof callStructured>[2],
  // the conversation: the hooks written before and what the user wants
  // instead – three new ones are written with it
  change?: { previous: HookFromAi[]; instruction: string },
  // what makes the video worth watching (run.value): the hooks open on it
  value?: ValueInRun,
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
          // a new hook always says what it shows and which angle it takes
          firstFrame: z.string().trim().min(10).max(200),
          angle: hookAngle,
        }),
      )
      .length(3)
      // three different angles, not one hook reworded – a reply that
      // repeats one is asked for again
      .refine(
        (hooks) => new Set(hooks.map((hook) => hook.angle)).size === 3,
        "The three hooks must take three different angles",
      ),
  });

  const result = await callStructured(
    schema,
    {
      system: SYSTEM,
      user:
        userPrompt(input, workspace, template, usable, value) +
        (change
          ? `

Your previous hooks:
${change.previous.map((hook) => `- ${hook.text} | ${hook.firstFrame ?? ""}`).join("\n")}

The creator wants different hooks: ${change.instruction}`
          : ""),
    },
    model,
  );
  return { ...result, data: result.data.hooks };
}
