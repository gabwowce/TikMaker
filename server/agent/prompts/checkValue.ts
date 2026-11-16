import type { Workspace } from "../../../src/agent/knowledge.js";
import type { IdeaFromUser } from "../../../src/agent/run/1-idea.js";
import {
  valueFromAi,
  type ValueFromAi,
} from "../../../src/agent/run/2-angle.js";
import { callStructured, type StructuredResult } from "../ai/llm.js";
import { creatorFacts } from "./productScreens.js";

// Step 2, first: is the idea worth a video on this channel? Judged against
// the channel's own direction (workspace.direction, offTopic) before a
// template, a hook or a word of the script exists – an empty idea written up
// beautifully is still an empty video. The answer also holds the idea written
// again as the video will tell it: every later step works from that text.

const SYSTEM = `You are the editor of a short-video channel (TikTok, Reels, Shorts). Before anything
is written, you decide whether a video idea is worth making for THIS channel, and you
write the idea down the way the video will tell it. You do not write the video itself.

Judge the idea by the channel's direction and what it does not make. Ask yourself:
1. wow – would someone scrolling stop? What surprising, beautiful or impossible-looking
   thing does the video SHOW? (A real project, a real result, something new working.)
2. takeaway – what does the VIEWER walk away with: something they can now do or know that
   they would NOT get by asking an AI one question (a tool and what it is for, a setting,
   a prompt, a method, a number that changes a decision, what to avoid). General knowledge
   ("what is X", "5 tips for Y" with tips anyone could list) is worth nothing on its own.
   The creator's own project or result is PROOF, not a takeaway: it counts only through
   what it teaches the viewer (how, what it took, what it costs, what surprised them).
3. firstStep – what could the viewer do this week to start their own? (Optional.)

Commodities: by now most viewers have seen AI build a game, an app, a website or an
animation from a description. That alone is neither a wow nor a takeaway – not even with
the creator's own footage, score or build time – unless the idea has a twist the viewer has
not seen: a surprising number or comparison, real stakes, or something they can copy today.

Judge the idea AS WRITTEN (plus the facts from the creator). Never assume the creator has
something the idea does not name – a finished project, renders, results, a test. If the
wow or the takeaway would depend on such a thing, it is missing: the verdict is "weak" and
you ask for it. A call to action ("comment X and I'll send it") is not a takeaway. Showing
something any viewer could get by asking an AI for it is not a wow.

verdict (for the creator):
- "strong": there is a real wow AND a takeaway for the viewer that one prompt would not
  give, both in the idea itself – and it is not a commodity.
- "weak": on topic, but generic, a commodity, or nothing real to show – it needs a real
  result the viewer can use, a test or a twist to carry it.
- "off_channel": the kind of video the channel does not make (see "does not make").
reason: one or two plain sentences for the creator.

idea: the idea written again, the way the video will tell it – every later step (the
template, the hooks, the research, the script) works from this text alone, not from the
creator's words. Keep the topic and everything the creator wrote that is real; make
clear the wow (what the video SHOWS that makes a scroller stop) and the takeaway (what
the viewer walks away with), when there are any; work in the facts from the creator.
Never invent a project, a result, a number or a tool the creator did not give. When the
verdict is "strong", change as little as possible. When it is not, sharpen it only with
what is real – and when the creator chose a stronger angle, write that angle.
A few plain sentences, at most 2000 characters.`;

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

// The first and main place the agent asks (the script is the only other):
// a weak or off-channel verdict always asks for what would carry the idea,
// and any idea may ask for a fact only the creator knows – the template and
// the hooks never ask.
function whenToAskValue(asked: boolean): string {
  if (asked)
    return `

You already asked the creator in this run: do not ask again (questions: []). Judge the
idea with their answers (the facts from the creator above) and write them into idea;
where they chose to keep it as it is, keep it, and write in assumptions what you
assumed.`;
  return `

questions (at most 3) – this is the one time the creator is asked about the idea; the
template and the hooks never ask, so ask now:
- When the verdict is "weak" or "off_channel": up to 2 short questions that would make it
  strong – e.g. "Do you have a real project, result or your own test to show for this?"
  (why: it is what the viewer cannot get from one prompt), and whether to take a stronger
  angle instead – one stronger take on the same topic that fits the channel, e.g. a test
  with a result the viewer can use, a comparison, a before/after, what it would cost them
  (options: that angle in a few words, "Keep my idea").
- Any verdict: a fact the video needs that only the creator knows and the idea does not
  say – which tool they really use, what the result really looks like on screen, a real
  number. Only when the answer would change the video; otherwise decide, never invent a
  fact, and write in assumptions (at most 3) what you assumed.
Each question says why it matters and, when the answer is one of a few, 2–4 options.
A "strong" idea that says everything the video needs: no questions.`;
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
