import type { Workspace } from "../../../src/agent/knowledge.js";
import type { IdeaFromUser } from "../../../src/agent/run/1-idea.js";
import {
  valueFromAi,
  type ValueFromAi,
} from "../../../src/agent/run/2-angle.js";
import { callStructured, type StructuredResult } from "../llm.js";
import { creatorFacts } from "./productScreens.js";

// Step 2, first: is the idea worth a video on this channel? Judged against
// the channel's own direction (workspace.direction, offTopic) before a
// template, a hook or a word of the script exists – an empty idea written up
// beautifully is still an empty video.

const SYSTEM = `You are the editor of a short-video channel (TikTok, Reels, Shorts). Before anything
is written, you decide whether a video idea is worth making for THIS channel. You do not
write the video.

Judge the idea by the channel's direction and what it does not make. Ask yourself:
1. wow – would someone scrolling stop? What surprising, beautiful or impossible-looking
   thing does the video SHOW? (A real project, a real result, something new working.)
2. takeaway – what does the viewer get that they would NOT get by asking an AI one
   question? General knowledge ("what is X", "5 tips for Y" with tips anyone could list)
   is worth nothing on its own. A real project, a real result, a number someone measured,
   the creator's own experience, or a concrete first step is worth something.
3. firstStep – what could the viewer do this week to start their own? (Optional.)

Judge the idea AS WRITTEN (plus the facts from the creator). Never assume the creator has
something the idea does not name – a finished project, renders, results, a test. If the
wow or the takeaway would depend on such a thing, it is missing: the verdict is "weak" and
you ask for it. A call to action ("comment X and I'll send it") is not a takeaway. Showing
something any viewer could get by asking an AI for it is not a wow.

verdict:
- "strong": there is a real wow AND a takeaway one prompt would not give, both in the
  idea itself.
- "weak": on topic, but generic or nothing real to show – it needs a real project,
  result or the creator's own test to carry it.
- "off_channel": the kind of video the channel does not make (see "does not make").
wow / takeaway: one sentence each, about THIS idea; an empty string when there is none –
never dress up a generic idea.
reason: one or two plain sentences for the creator.
betterAngle (when not "strong"): one stronger take on the same topic that would fit the
channel – e.g. a real project built with it, a before/after, the creator trying it.`;

function userPrompt(input: IdeaFromUser, workspace: Workspace): string {
  const offTopic = workspace.offTopic?.length
    ? `
The channel does not make:
${workspace.offTopic.map((item) => `- ${item}`).join("\n")}`
    : "";
  return `Channel: ${workspace.name}. ${workspace.brief}
Audience: ${workspace.audience}
Direction: ${workspace.direction ?? "(not set – judge by the brief and audience)"}${offTopic}${creatorFacts(workspace)}

Idea: ${input.idea}`;
}

// The questions differ from the other steps: here asking is how a weak idea
// gets what it is missing, so a weak or off-channel verdict always asks.
function whenToAskValue(asked: boolean): string {
  if (asked)
    return `

You already asked the creator in this run: do not ask again (questions: []). Judge the
idea with their answers (the facts from the creator above); where they chose to keep it
as it is, keep it, and write in assumptions what you assumed.`;
  return `

questions: when the verdict is "strong", none. When it is "weak" or "off_channel", ask the
creator at most 2 short questions that would make it strong – e.g. "Do you have a real
project, result or your own test to show for this?" (why: it is what the viewer cannot
get from one prompt), and whether to take the betterAngle instead (options: the
betterAngle in a few words, "Keep my idea"). Each says why it matters.`;
}

export async function checkValue(
  input: IdeaFromUser,
  workspace: Workspace,
  model?: Parameters<typeof callStructured>[2],
  // it asked the creator already in this run: decide, do not ask again
  asked = false,
): Promise<StructuredResult<ValueFromAi>> {
  return callStructured(
    valueFromAi,
    {
      system: SYSTEM,
      user: userPrompt(input, workspace) + whenToAskValue(asked),
    },
    model,
  );
}
