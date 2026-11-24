import type { Workspace } from "../../../src/agent/knowledge.js";

// What the creator told the agent – remembered for the channel, and answered
// in this run (job.ts puts both into workspace.facts). True: the model uses
// them instead of guessing. Every prompt that writes or shows the video.
export function creatorFacts(workspace: Workspace): string {
  if (!workspace.facts?.length) return "";
  return `

Facts from the creator (true – use them, do not ask about them again):
${workspace.facts.map((fact) => `- ${fact}`).join("\n")}`;
}

// When the script may ask the creator instead of guessing (the value check
// has its own, checkValue.ts; askingSteps, src/agent/run/asking.ts). `asked`: it asked already in this run – then it
// decides by itself.
export function whenToAsk(asked: boolean): string {
  if (asked)
    return `

You already asked the creator in this run: do not ask again (questions: []). Decide, and
write in assumptions what you assumed.`;
  return `

questions (optional, at most 3): ask the creator only when the answer would change the
video and neither the idea nor the facts say it – a real number or result, what the
product really does, what a screen really shows. Each says why it matters and, when the
answer is one of a few, 2–4 short options. Otherwise decide yourself – never invent a
fact – and write in assumptions (at most 3) what you assumed, so the creator sees it.`;
}

// The channel's product as it really looks (workspace.screens), for the
// prompts that describe or ask for recordings of it – the script (what a scene
// shows) and the blocks (what to record). Empty when the channel lists none.
export function productScreens(workspace: Workspace): string {
  if (!workspace.screens?.length) return "";
  const list = workspace.screens
    .map((screen) => `- ${screen.name}: ${screen.shows}`)
    .join("\n");
  return `

The product's real screens – when a scene shows the product, or asks for a recording of
it, describe only what these screens really show; never invent cards, buttons, previews
or animations they do not have:
${list}`;
}
