import type { Scene } from "../../schema/scene";
import type { RuleCheck } from "./types";

function countWords(text: string | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Designed text in the frame, not captions: the same thing the analysis
// counted as onScreenText. A rich headline replaces the plain headline.
export function sceneOnScreenWords(scene: Scene): number {
  const c = scene.content;
  const headline = c.richHeadline?.length
    ? c.richHeadline.map((line) => line.text)
    : [c.headline];
  const sides = [c.left, c.right].flatMap((side) => [
    side?.label,
    side?.headline,
    side?.body,
  ]);
  const items = (c.items ?? []).flatMap((item) => [item.label, item.value]);
  const blocks = (c.blocks ?? []).map((block) => block.text);
  return [c.eyebrow, ...headline, ...sides, ...items, ...blocks].reduce(
    (sum, text) => sum + countWords(text),
    0,
  );
}

export const onScreenWordsPerScene: RuleCheck = (project, rule) =>
  project.scenes.flatMap((scene, index) => {
    const words = sceneOnScreenWords(scene);
    if (rule.max === undefined || words <= rule.max) return [];
    return [
      {
        ruleId: rule.id,
        sceneId: scene.id,
        level: rule.level,
        message: `Scene ${index + 1}: ${words} words on screen, the limit is ${rule.max}.`,
      },
    ];
  });
