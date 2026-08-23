import { generatedSfx } from "./assets.generated";

export type SfxGroup = "ui" | "impact" | "text" | "transition" | "reveal" | "success" | "misc";

const groupByFileId: Record<string, SfxGroup> = {
  tick: "ui",
  "d-tick": "ui",
  select: "ui",
  "d-select": "ui",
  snap: "ui",
  check: "ui",
  "d-mark": "ui",

  slam: "impact",
  "d-enter": "impact",
  "d-ping": "impact",
  "d-pop": "impact",
  drop: "impact",
  "d-break": "impact",

  "d-word": "text",
  "type-word": "text",
  type: "text",

  whoosh: "transition",
  "soft-whoosh": "transition",
  swipe: "transition",
  "paper-slide": "transition",
  "whoop-click": "transition",

  bloom: "reveal",
  riser: "reveal",
  "riser-2": "reveal",
  splash: "reveal",

  "d-done": "success",
  "d-fix": "success",

  "msg-in": "ui",
  "msg-out": "ui",
  "d-msg-in": "ui",
  "d-msg-out": "ui",
  "counter-short": "ui",
  counter: "ui",
  "d-count": "ui",
  "d-count-short": "ui",
};

export type SfxDefinition = {
  id: string;
  group: SfxGroup;
  src: string;
};

export const sfxRegistry: Record<string, SfxDefinition> = Object.fromEntries(
  generatedSfx.map((entry) => [
    entry.id,
    {
      id: entry.id,
      group: groupByFileId[entry.id] ?? "misc",
      src: `/assets/sfx/${entry.file}`,
    },
  ])
);

export const sfxList = Object.values(sfxRegistry);

export function getSfx(id: string): SfxDefinition | undefined {
  return sfxRegistry[id];
}

export function sfxByGroup(group: SfxGroup): SfxDefinition[] {
  return sfxList.filter((s) => s.group === group);
}
