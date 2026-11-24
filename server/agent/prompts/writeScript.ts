import type { VideoTemplate, Workspace } from "../../../src/agent/knowledge.js";
import type { IdeaFromUser } from "../../../src/agent/run/1-idea.js";
import {
  scriptFromAi,
  type ScriptFromAi,
} from "../../../src/agent/run/3-script.js";
import type { Knowledge } from "../knowledge.js";
import {
  creatorFacts,
  productScreens,
  whenToAsk,
} from "./productScreens.js";
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

The template is a guide: a structure that has worked for videos like this – its scenes,
their order and how they link. Follow it where it serves this idea; change the order,
leave a scene out or add one when that tells this story better. A "repeatable" scene
may appear several times in a row (one per step or item). Put every template scene you
leave out in "skipped" with a short reason.
A scene's "facts" come from the idea and the facts found online only – never invent a
tool, a number or a result.
When the idea has no fact for a scene, leave it out if it is optional; if it is required,
fill it with what the idea does say rather than with an invented claim.
Its "creative" parts are yours to word.

The first scene is the hook: say the chosen hook as it is, and show its key words. Its
visual is the hook's first frame when one is given – a picture on screen from the very
first word, never the words alone.
The template's links ("→ next") and the transition phrases are examples of how scenes
can follow each other; use them only where they read naturally. End the way that fits
this video best: the CTA formulas show endings that have worked – use one, or write
your own, or none if no ending asks for one.
The call to action never sends people to a link, a website, a download or a giveaway
the idea does not mention – then pick a CTA formula that needs none of those.

One scene = one thought, shown by one picture. When a part of the story has two
thoughts (what a chatbot does, then what an agent does), it is two scenes, not one long
voiceover – a long scene forces two pictures into one frame and neither reads.

For every scene:
- voiceover: what is said, natural spoken English. When a scene lists things (tools,
  mistakes, steps), the voice names every one of them – the list on screen fills point by
  point as each is named; a point that needs it gets a short sentence after its name
- onScreen: the key words shown big, not the whole sentence
- visual: what the viewer sees happening, concrete and with a verb – a terminal running a
  command, a price counting down, the idea turning into a video – one picture for the
  thought, understandable with the sound off; never "something engaging"
- needsRecording: your call – true when the scene is shown best with the creator's own
  screen recording rather than a picture the video editor draws. Then the voiceover says
  what the recording shows while it shows it (the click, what appears). Keep recordings
  for the moments where the real screen is the proof – about 3–4 in a video at most

Keep within the limits. Each scene lasts about as long as its voiceover. Treat the wanted
length as a target, not a requirement to fill at any cost: use the repeatable scenes and
the optional scenes that genuinely help, but never add empty explanations, repeated
statements or invented steps just to reach it. If the idea cannot support the length,
write the strongest shorter version.

Your job is WHAT the viewer sees (visual), not how it is drawn: the next step picks the
recording, block or animation that shows it, knowing what the editor can really do – so
do not limit the visual to what you think the editor has.`;

// CTA types that send people somewhere or promise something, and what in the
// idea counts as giving one: an address, or an offer said in words – a link in
// the bio, a free PDF / guide / template, "comment GUIDE and I'll send…"
// (English or Lithuanian). Without one, the script may not promise it.
const OFFERS = ["link", "lead-magnet"];
const LINK = /https?:\/\/|www\.|\b[\w-]+\.(com|io|dev|app|ai|lt)\b/i;
const OFFER_WORDS =
  /\b(bio|pdf|e-?book|guide|template|checklist|download|newsletter|sign up|dm me|i'?ll send|send you)\b|nuorod|atsisi[uų]s|atsi[uų]s|[sš]ablon/i;
// "comment GUIDE": a code word in capitals (case matters, so no /i).
const COMMENT_CODE =
  /\b[Cc]omment\s+["'“]?[A-Z]{2,}\b|[Kk]omentuok\s+["'“]?[A-ZĄČĘĖĮŠŲŪŽ]{2,}/;
export function ideaGivesOffer(idea: string): boolean {
  return LINK.test(idea) || OFFER_WORDS.test(idea) || COMMENT_CODE.test(idea);
}

// What to change when writing again: the code's problems, or the user's
// comment, with the script it is about.
export type ScriptChange = { previous: ScriptFromAi; change: string[] };

// The chosen hook: its line, and what it shows when the agent wrote it.
export type HookForScript = { text: string; firstFrame?: string };

// What the script needs from the knowledge base besides the template.
export type ScriptKnowledge = Pick<
  Knowledge,
  "ctaFormulas" | "transitionPhrases" | "designRules"
>;

function userPrompt(
  input: IdeaFromUser,
  workspace: Workspace,
  template: VideoTemplate,
  hook: HookForScript,
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
    (type) => !OFFERS.includes(type) || ideaGivesOffer(input.idea),
  );
  const ctas = knowledge.ctaFormulas
    .filter((c) => ctaTypes.includes(c.type))
    .map((c) => `- ${c.type}: ${c.formula} (e.g. "${c.examples[0]}")`)
    .join("\n");

  const limit = (check: string) =>
    knowledge.designRules.find((rule) => rule.check === check)?.max;

  const prompt = `Channel: ${workspace.name}. ${workspace.brief}
Audience: ${workspace.audience}${productScreens(workspace)}${creatorFacts(workspace)}

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
Hook: ${hook.text}${
    hook.firstFrame
      ? `
First frame (what the hook shows): ${hook.firstFrame}`
      : ""
  }

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
  hook: HookForScript,
  knowledge: ScriptKnowledge,
  revise?: ScriptChange,
  model?: Parameters<typeof callStructured>[2],
  facts?: string,
  // it asked the creator already in this run: decide, do not ask again
  asked = false,
): Promise<StructuredResult<ScriptFromAi>> {
  // Any scene role (the template is a guide, not a cage); the first scene is
  // the hook the user chose.
  const schema = scriptFromAi.refine(
    (script) => script.scenes[0].role === "hook",
    "The first scene must be the hook",
  );

  const result = await callStructured(
    schema,
    {
      step: "writeScript",
      system: SYSTEM,
      user: userPrompt(
        input,
        workspace,
        template,
        hook,
        knowledge,
        revise,
        facts,
      ) + whenToAsk(asked),
    },
    model,
  );
  // "Motion graphics only": no scene asks for a recording, whatever the model said.
  const scenes = input.motionOnly
    ? result.data.scenes.map((scene) => ({ ...scene, needsRecording: false }))
    : result.data.scenes;
  return { ...result, data: { ...result.data, scenes } };
}
