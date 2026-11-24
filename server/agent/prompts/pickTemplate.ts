import { creatorFacts } from "./productScreens.js";
import { z } from "zod";
import type { IdeaFromUser } from "../../../src/agent/run/1-idea.js";
import {
  templateFromAi,
  type TemplateFromAi,
} from "../../../src/agent/run/2-angle.js";
import type { VideoTemplate, Workspace } from "../../../src/agent/knowledge.js";
import { callStructured, type StructuredResult } from "../llm.js";

// Step 2a: which video template fits the idea (FR-04). The model sees only a
// short card per template — not its acts and scenes — which is all it needs
// to choose and keeps the prompt cheap.

const SYSTEM = `You are the producer of a short-video channel (TikTok, Reels, Shorts).
Your job in this step: choose how the video will be told, by picking ONE template
from the list you are given. You do not write the video yet.

You get the channel, the video idea and the templates.
Pick the template whose "when to use" fits the idea best; the length matters less.
A template's "needs" are the facts its required scenes are built on. Pick one the idea
can fill with its OWN facts: a rise-to-success story needs a success to show, a how-to
needs steps, a list needs items. If the idea lacks what a template needs, that template
does not fit, however close its topic is.
Never invent a template: answer only with an id from the list.
score: 5 = made for this idea and the idea has every fact it needs, 3 = workable,
1 = nothing in the list fits.
reason: one or two sentences for the creator, in plain English, about this idea.
needsFacts: true when the script will need facts from outside the idea that should be
checked online first – prices, numbers, dates, news, how another company's tool works;
false when the idea itself (or the channel's own product, which the channel knows) gives
everything the video says.`;

// The facts a template's required scenes are built on ("fixed" slots), once
// each: what the idea must already say for the template to work.
function needs(template: VideoTemplate): string {
  const facts = template.acts.flatMap((act) =>
    act.scenes
      .filter((scene) => !scene.optional)
      .flatMap((scene) =>
        scene.slots.filter((s) => s.kind === "fixed").map((s) => s.name),
      ),
  );
  return [...new Set(facts)].join(", ") || "nothing special";
}

function userPrompt(
  input: IdeaFromUser,
  workspace: Workspace,
  templates: VideoTemplate[],
): string {
  const cards = templates
    .map(
      (t) =>
        `- id: ${t.id}\n  name: ${t.name}\n  what: ${t.oneLine}\n` +
        `  when to use: ${t.whenToUse}\n  needs: ${needs(t)}\n` +
        `  length: ${t.seconds.min}–${t.seconds.max} s`,
    )
    .join("\n");
  return `Channel: ${workspace.name}. ${workspace.brief}
Audience: ${workspace.audience}${creatorFacts(workspace)}

Idea: ${input.idea}
Wanted length: about ${input.targetSeconds} s
Face on camera: ${input.withFace ? "yes" : "no, a faceless video"}

Templates:
${cards}`;
}

export async function pickTemplate(
  input: IdeaFromUser,
  workspace: Workspace,
  templates: VideoTemplate[],
  model?: Parameters<typeof callStructured>[2],
): Promise<StructuredResult<TemplateFromAi>> {
  const ids = templates.map((t) => t.id);
  if (ids.length === 0) throw new Error("The knowledge base has no templates");
  // Only real ids are a valid answer, so a made-up template is caught by the
  // schema and asked for again (callStructured) instead of reaching the run.
  const schema = templateFromAi.extend({
    videoTemplateId: z.enum(ids as [string, ...string[]]),
  });
  return callStructured(
    schema,
    {
      step: "pickTemplate",
      system: SYSTEM,
      user: userPrompt(input, workspace, templates),
    },
    model,
  );
}
