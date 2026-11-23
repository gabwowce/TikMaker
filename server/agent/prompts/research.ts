import type { Workspace } from "../../../src/agent/knowledge.js";
import type { IdeaFromUser } from "../../../src/agent/run/1-idea.js";
import type { ValueInRun } from "../../../src/agent/run/2-angle.js";
import { videoValue } from "./productScreens.js";
import {
  callWithSearch,
  type SearchAnswer,
  type StructuredResult,
} from "../llm.js";

// Step 3a: before the script, the agent looks the topic up on the web, so the
// video can explain more than the idea itself says. The facts go into the
// script's prompt; the pages they came from stay in the run's log.

// What it looks for is what makes the video worth watching (run.value), not
// what the topic is: a definition is exactly what the viewer could get by
// asking an AI one question.
const SYSTEM = `You research the facts for a short vertical video (TikTok, Reels, Shorts).
Search the web for the idea's topic and answer with 4 to 6 short facts that make the video
REAL, not general: who built or made what and how, real results and numbers, what is new
(with its date), and a concrete first step a viewer could take to start their own.
Skip definitions and general explanations ("X is a tool that…") – the viewer could get
those by asking an AI one question.
One fact per line, starting with "- ", plain English, each one true and checkable, with
the name of the person, project or source where it matters.
No opinions, no advice, nothing about the creator – only the topic.`;

export async function research(
  input: IdeaFromUser,
  workspace: Workspace,
  model?: Parameters<typeof callWithSearch>[1],
  value?: ValueInRun,
): Promise<StructuredResult<SearchAnswer>> {
  return callWithSearch(
    {
      step: "research",
      system: SYSTEM,
      user: `Audience: ${workspace.audience}\n\nIdea: ${input.idea}${videoValue(value)}`,
    },
    model,
  );
}
