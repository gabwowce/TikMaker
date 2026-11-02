import { z } from "zod";
import type { VideoTemplate, Workspace } from "../../../src/agent/knowledge.js";
import type { IdeaFromUser } from "../../../src/agent/run/1-idea.js";
import {
  scriptFromAi,
  type ScriptFromAi,
} from "../../../src/agent/run/3-script.js";
import type { Knowledge } from "../knowledge.js";
import { callStructured, type StructuredResult } from "../llm.js";

// Step 3: the script — the video as scenes, in words (FR-08). The model gets
// the template's scenes in order and fills them in for the idea, with what
// the analysis of successful videos found: how scenes link up (transition
// phrases), how the video ends (CTA formulas) and the limits of a watchable
// scene (design rules). Written again when the code found problems (once,
// FR-09) or the user left a comment (FR-10): then it also gets its previous
// script and what to change.

const SYSTEM = `You write the script of a short vertical video (TikTok, Reels, Shorts).

Tell ONE connected story. The idea may be written as loose thoughts in any order: sort
them into the order the template's scenes tell (the problem before the fix, the cause
before the result), and let every scene follow from the one before it – the voiceovers
read in a row must make sense as one spoken text. A scene that promises something ("what I learned", "here's why") is
followed by the scene that says it.

Follow the template's scenes in their order. A "repeatable" scene may appear several
times in a row (one per step or item); an "optional" scene may be left out – then put it
in "skipped" with a short reason. Never use a role the template does not have.
A scene's "facts" come from the idea and the facts found online only – never invent a
tool, a number or a result.
When the idea has no fact for a scene, leave it out if it is optional; if it is required,
fill it with what the idea does say rather than with an invented claim.
Its "creative" parts are yours to word.

The first scene is the hook: say the chosen hook as it is, and show its key words.
Link each scene to the next the way the template says ("→ next"); the transition phrases
are examples, use one only where it reads naturally. "First / Second / Third" only
number the steps or items of a list (a repeatable scene) – never scenes that tell one
story. End with a call to action that follows one of the
CTA formulas, unless the template's CTA types include "none" and none fits.
The call to action never sends people to a link, a website, a download or a giveaway
the idea does not mention – then pick a CTA formula that needs none of those.

For every scene:
- voiceover: what is said, natural spoken English
- onScreen: the key words shown big, not the whole sentence
- visual: what the viewer sees, concrete (a terminal running a command, a settings page,
  an app icon), never "something engaging"
- needsRecording: true when the scene shows real actions in an app (clicks, menus,
  several windows) or a real result only a recording can prove; false for a single
  command, a line of code, a key press or a simple graphic – the video editor draws
  those.

Keep within the limits. Each scene lasts about as long as its voiceover: fill the wanted
length – add more steps or items with the repeatable scenes, keep the optional scenes
that help – rather than stopping short.`;

// CTA types that send people somewhere or promise something, and what in the
// idea counts as somewhere to send them.
const OFFERS = ["link", "lead-magnet"];
const LINK = /https?:\/\/|www\.|\b[\w-]+\.(com|io|dev|app|ai|lt)\b/i;

// What to change when writing again: the code's problems, or the user's
// comment, with the script it is about.
export type ScriptChange = { previous: ScriptFromAi; change: string[] };

// What the script needs from the knowledge base besides the template.
export type ScriptKnowledge = Pick<
  Knowledge,
  "ctaFormulas" | "transitionPhrases" | "designRules"
>;

function userPrompt(
  input: IdeaFromUser,
  workspace: Workspace,
  template: VideoTemplate,
  hook: string,
  knowledge: ScriptKnowledge,
  revise?: ScriptChange,
  facts?: string,
): string {
  const scenes = template.acts
    .flatMap((act) =>
      act.scenes.map((s) => {
        const facts = s.slots.filter((slot) => slot.kind === "fixed");
        const creative = s.slots.filter((slot) => slot.kind === "creative");
        return (
          `- ${act.act} / ${s.role} (${s.seconds.min}–${s.seconds.max} s): ${s.purpose}` +
          (s.optional ? " [optional]" : " [required]") +
          (s.repeatable ? " [repeatable]" : "") +
          ` → next: ${s.connectionToNext}` +
          (facts.length
            ? `; facts: ${facts.map((f) => f.name).join(", ")}`
            : "") +
          (creative.length
            ? `; creative: ${creative.map((c) => c.name).join(", ")}`
            : "")
        );
      }),
    )
    .join("\n");

  // Phrases only for the links this template uses, a handful each.
  const links = new Set(
    template.acts.flatMap((act) => act.scenes.map((s) => s.connectionToNext)),
  );
  const transitions = knowledge.transitionPhrases
    .filter((t) => links.has(t.connection))
    .map((t) => `- ${t.connection}: ${t.phrases.slice(0, 6).join(" | ")}`)
    .join("\n");

  // Only the CTA formulas whose type the template allows – and no link or
  // freebie unless the idea gives one, or the model makes one up.
  const ctaTypes = template.ctaTypes.filter(
    (type) => !OFFERS.includes(type) || LINK.test(input.idea),
  );
  const ctas = knowledge.ctaFormulas
    .filter((c) => ctaTypes.includes(c.type))
    .map((c) => `- ${c.type}: ${c.formula} (e.g. "${c.examples[0]}")`)
    .join("\n");

  const limit = (check: string) =>
    knowledge.designRules.find((rule) => rule.check === check)?.max;

  const prompt = `Channel: ${workspace.name}. ${workspace.brief}
Audience: ${workspace.audience}

Idea: ${input.idea}
${
  facts
    ? `
Facts found online (true – use them to explain the idea):
${facts}
`
    : ""
}Wanted length: about ${input.targetSeconds} s
Face on camera: ${input.withFace ? "yes" : "no, a faceless video"}
${input.motionOnly ? "Motion graphics only: no recordings at all (needsRecording is always false).\n" : ""}
Hook: ${hook}

Template: ${template.name} – ${template.oneLine}
Scenes:
${scenes}

Transition phrases:
${transitions}

CTA formulas (types allowed: ${ctaTypes.join(", ")}):
${ctas || "- none: end on the last scene, without a call to action (skip the cta scene)"}

Limits, from the analysis of successful videos:
- speak at most ${limit("voiceWordsPerSecond")} words per second
- a scene lasts at most ${limit("sceneSeconds")} s, the hook at most ${limit("hookSeconds")} s
- at most ${limit("onScreenWordsPerScene")} words on screen in a scene`;
  if (!revise) return prompt;
  return `${prompt}

Your previous script:
${JSON.stringify(revise.previous, null, 2)}

Write it again and change this:
${revise.change.map((line) => `- ${line}`).join("\n")}`;
}

export async function writeScript(
  input: IdeaFromUser,
  workspace: Workspace,
  template: VideoTemplate,
  hook: string,
  knowledge: ScriptKnowledge,
  revise?: ScriptChange,
  model?: Parameters<typeof callStructured>[2],
  facts?: string,
): Promise<StructuredResult<ScriptFromAi>> {
  // Only the roles this template has; the first scene is the hook.
  const roles = [
    ...new Set(template.acts.flatMap((act) => act.scenes.map((s) => s.role))),
  ];
  const role = z.enum(roles as [string, ...string[]]);
  const schema = scriptFromAi
    .extend({
      scenes: z
        .array(scriptFromAi.shape.scenes.element.extend({ role }))
        .min(2),
      skipped: z.array(scriptFromAi.shape.skipped.element.extend({ role })),
    })
    .refine(
      (script) => script.scenes[0].role === "hook",
      "The first scene must be the hook",
    );

  const result = await callStructured(
    schema,
    {
      system: SYSTEM,
      user: userPrompt(
        input,
        workspace,
        template,
        hook,
        knowledge,
        revise,
        facts,
      ),
    },
    model,
  );
  // "Motion graphics only": no scene asks for a recording, whatever the model said.
  const scenes = input.motionOnly
    ? result.data.scenes.map((scene) => ({ ...scene, needsRecording: false }))
    : result.data.scenes;
  return { ...result, data: { ...result.data, scenes } };
}
