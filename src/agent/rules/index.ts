import type { DesignRule } from "../knowledge";
import type { VideoProject } from "../../schema/project";
import { onScreenWordsPerScene } from "./onScreenWords";
import { hookSeconds, sceneSeconds } from "./sceneLength";
import { sfxPer10s } from "./sfxDensity";
import { voiceWordsPerSecond } from "./speechRate";
import type { RuleCheck, Violation } from "./types";
import { secondsWithoutChange } from "./visualChange";

// Every check a rule in knowledge/shared/design-rules.json can name. The rule
// file holds the limits; this map holds the code that measures.
export const ruleChecks: Record<string, RuleCheck> = {
  onScreenWordsPerScene,
  sceneSeconds,
  hookSeconds,
  sfxPer10s,
  voiceWordsPerSecond,
  secondsWithoutChange,
};

// Runs every rule against the project. A rule naming a check that does not
// exist is reported, not skipped, so a typo in the rule file is visible.
export function runRules(project: VideoProject, rules: DesignRule[]): Violation[] {
  return rules.flatMap((rule) => {
    const check = ruleChecks[rule.check];
    if (!check)
      return [
        {
          ruleId: rule.id,
          level: "error" as const,
          message: `No check called "${rule.check}" exists (rule ${rule.id}).`,
        },
      ];
    return check(project, rule);
  });
}
