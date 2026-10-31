import { z } from "zod";
import {
  templateChoiceSchema,
  type AgentRunInput,
  type TemplateChoice,
} from "../../../src/agent/agentRun.js";
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
Never invent a template: answer only with an id from the list.
score: 5 = made for this idea, 3 = workable, 1 = nothing in the list fits.
reason: one or two sentences for the creator, in plain English, about this idea.`;

function userPrompt(
  input: AgentRunInput,
  workspace: Workspace,
  templates: VideoTemplate[],
): string {
  const cards = templates
    .map(
      (t) =>
        `- id: ${t.id}\n  name: ${t.name}\n  what: ${t.oneLine}\n` +
        `  when to use: ${t.whenToUse}\n  length: ${t.seconds.min}–${t.seconds.max} s`,
    )
    .join("\n");
  return `Channel: ${workspace.name}. ${workspace.brief}
Audience: ${workspace.audience}

Idea: ${input.idea}
Wanted length: about ${input.targetSeconds} s
Face on camera: ${input.withFace ? "yes" : "no, a faceless video"}

Templates:
${cards}`;
}

export async function pickTemplate(
  input: AgentRunInput,
  workspace: Workspace,
  templates: VideoTemplate[],
  model?: Parameters<typeof callStructured>[2],
): Promise<StructuredResult<TemplateChoice>> {
  const ids = templates.map((t) => t.id);
  if (ids.length === 0) throw new Error("The knowledge base has no templates");
  // Only real ids are a valid answer, so a made-up template is caught by the
  // schema and asked for again (callStructured) instead of reaching the run.
  const schema = templateChoiceSchema.extend({
    videoTemplateId: z.enum(ids as [string, ...string[]]),
  });
  return callStructured(
    schema,
    { system: SYSTEM, user: userPrompt(input, workspace, templates) },
    model,
  );
}
