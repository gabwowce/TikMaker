import { z } from "zod";
import type { LayoutExample, Workspace } from "../../../src/agent/knowledge.js";
import type { IdeaFromUser } from "../../../src/agent/run/1-idea.js";
import type { SceneFromAi } from "../../../src/agent/run/3-script.js";
import {
  sceneLayoutFromAi,
  type LayoutFromAi,
} from "../../../src/agent/run/4-building.js";
import {
  generatedLogos,
  generatedProps,
} from "../../../src/registries/assets.generated.js";
import { callStructured, type StructuredResult } from "../llm.js";

// Step 4: a layout example for every scene of the approved script, and what
// goes into each picture of it (FR-11). The model sees, per scene, only a few
// examples of the scene's role, as words (no images), and the library's file
// ids (FR-24). Where things go and how big is left to compileProject.

// Pictures of real material in the successful video the example came from: a
// recording, a screenshot, a photo. The user supplies it, so each becomes a
// placeholder saying what to put there (FR-13).
const MEDIA = [
  "image",
  "recording",
  "screen",
  "phone",
  "browser",
  "talking-head",
];
// Pictures the library fills (FR-24).
const LIBRARY = ["logo", "prop"];
// Enough to choose from; more only makes the prompt longer.
const MAX_CHOICES = 5;

const logoIds = generatedLogos.map((asset) => asset.id);
const propIds = generatedProps.map((asset) => asset.id);
const hasMedia = (example: LayoutExample) =>
  example.elements.some((element) => MEDIA.includes(element.kind));

// The examples a scene may follow, used as they are. Only examples TikMaker
// can fill (no checklists or diagrams yet), and a face on camera only when
// the form asked for one. "Motion graphics only" leaves out every example
// with real material; when the scene's role then has none, it borrows a real
// example of another role rather than making one up.
export function layoutChoices(
  scene: SceneFromAi,
  examples: LayoutExample[],
  input: IdeaFromUser,
): LayoutExample[] {
  const usable = examples.filter(
    (example) =>
      example.elements.every((element) =>
        [...LIBRARY, ...MEDIA].includes(element.kind),
      ) &&
      (input.withFace ||
        !example.elements.some((element) => element.kind === "talking-head")) &&
      !(input.motionOnly && hasMedia(example)),
  );
  const forRole = usable.filter((example) => example.role === scene.role);
  // A scene without a recording sees the examples with nothing to capture
  // first, so they are not cut off by MAX_CHOICES.
  const ranked = (forRole.length ? forRole : usable)
    .slice()
    .sort(
      (a, b) =>
        Number(!scene.needsRecording && hasMedia(a)) -
        Number(!scene.needsRecording && hasMedia(b)),
    );
  return ranked.slice(0, MAX_CHOICES);
}

const SYSTEM = `You lay out the scenes of a short vertical video (TikTok, Reels, Shorts).
Every layout example is taken from a successful video. For every scene, pick ONE
example from that scene's list (layoutExampleId) and fill each of its pictures, in
the order they are listed (fills):
- a logo or prop picture: an id from Logos or Props (both are icons from the library)
- any other picture (a recording, a screen, a photo, a phone): one short sentence
  telling the user what to record or capture there for this scene.
Pick the example whose arrangement suits what the scene shows. When a scene is
marked "own recording: yes", prefer an example with a recording or screen; when it is
marked "own recording: no", prefer an example whose pictures are all logos or props
(nothing to capture), if its list has one.
Answer with one entry per scene, in the same order.`;

// One example as the model reads it: each picture with what it takes, so a
// logo id never lands where the successful video showed real material.
function describe(example: LayoutExample): string {
  const pictures = example.elements
    .map((element, index) => {
      const takes = LIBRARY.includes(element.kind)
        ? "a logo or prop id"
        : "a sentence: what to capture";
      return `${index + 1} ${element.kind} → ${takes}`;
    })
    .join("; ");
  const text = example.textBlocks.length ? "with text" : "no text";
  return `  - ${example.id}: pictures: ${pictures || "none"}; ${text}. ${example.note ?? ""}`;
}

function userPrompt(
  input: IdeaFromUser,
  workspace: Workspace,
  scenes: SceneFromAi[],
  choices: LayoutExample[][],
): string {
  const list = scenes
    .map(
      (scene, index) =>
        `Scene ${index + 1} (${scene.role}) – own recording: ${scene.needsRecording ? "yes" : "no"}
  On screen: ${scene.onScreen}
  Shows: ${scene.visual}
  Examples:
${choices[index].map(describe).join("\n")}`,
    )
    .join("\n\n");
  return `Channel: ${workspace.name}. ${workspace.brief}
Idea: ${input.idea}

Logos: ${logoIds.join(", ")}
Props: ${propIds.join(", ")}

${list}`;
}

export async function pickLayouts(
  input: IdeaFromUser,
  workspace: Workspace,
  scenes: SceneFromAi[],
  examples: LayoutExample[],
  model?: Parameters<typeof callStructured>[2],
): Promise<StructuredResult<LayoutFromAi>> {
  const choices = scenes.map((scene) => layoutChoices(scene, examples, input));

  // The code checks every choice (FR-11): one entry per scene, an example
  // from that scene's list, one fill per picture, a library id in every logo
  // and prop picture and words, not a library id, where real material goes.
  // A reply that breaks any of it is asked for again.
  const schema = z
    .object({ scenes: z.array(sceneLayoutFromAi).length(scenes.length) })
    .superRefine((answer, ctx) => {
      answer.scenes.forEach((choice, index) => {
        const problem = (message: string) =>
          ctx.addIssue({
            code: "custom",
            message: `Scene ${index + 1}: ${message}`,
          });
        const example = choices[index].find(
          (e) => e.id === choice.layoutExampleId,
        );
        if (!example)
          return problem(`${choice.layoutExampleId} is not in its list`);
        if (choice.fills.length !== example.elements.length)
          return problem(`needs ${example.elements.length} fills`);
        example.elements.forEach((element, n) => {
          const fill = choice.fills[n];
          const library = logoIds.includes(fill) || propIds.includes(fill);
          if (LIBRARY.includes(element.kind) && !library)
            problem(`"${fill}" is not a logo or prop id`);
          if (MEDIA.includes(element.kind) && library)
            problem(`picture ${n + 1} is real material: say what to capture`);
        });
      });
    });

  return callStructured(
    schema,
    { system: SYSTEM, user: userPrompt(input, workspace, scenes, choices) },
    model,
  );
}
