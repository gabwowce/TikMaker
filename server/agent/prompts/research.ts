import type { Workspace } from "../../../src/agent/knowledge.js";
import type { IdeaFromUser } from "../../../src/agent/run/1-idea.js";
import {
  callWithSearch,
  type SearchAnswer,
  type StructuredResult,
} from "../llm.js";

// Step 3a: before the script, the agent looks the topic up on the web, so the
// video can explain more than the idea itself says. The facts go into the
// script's prompt; the pages they came from stay in the run's log.

const SYSTEM = `You research the facts for a short vertical video (TikTok, Reels, Shorts).
Search the web for the idea's topic and answer with 4 to 6 short facts that help explain
it to the video's audience: what it is, how it works, a clear example or number.
One fact per line, starting with "- ", plain English, each one true and checkable.
No opinions, no advice, nothing about the creator – only the topic.`;

export async function research(
  input: IdeaFromUser,
  workspace: Workspace,
  model?: Parameters<typeof callWithSearch>[1],
): Promise<StructuredResult<SearchAnswer>> {
  return callWithSearch(
    {
      system: SYSTEM,
      user: `Audience: ${workspace.audience}\n\nIdea: ${input.idea}`,
    },
    model,
  );
}
