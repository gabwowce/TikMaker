import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DesignRule } from "../../../schema/knowledge";
import type { VideoProject } from "../../../schema/project";
import { ruleChecks, runRules } from "../index";

const project = { fps: 30, scenes: [] } as unknown as VideoProject;

describe("runRules", () => {
  it("reports a rule whose check does not exist", () => {
    const rules: DesignRule[] = [{ id: "typo", check: "wordsOnScren", max: 1, level: "warning" }];
    expect(runRules(project, rules)).toEqual([
      { ruleId: "typo", level: "error", message: 'No check called "wordsOnScren" exists (rule typo).' },
    ]);
  });

  it("has a check for every rule in the knowledge base", () => {
    const rules: DesignRule[] = JSON.parse(readFileSync("knowledge/shared/design-rules.json", "utf-8"));
    expect(rules.filter((rule) => !ruleChecks[rule.check])).toEqual([]);
  });
});
