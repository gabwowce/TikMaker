import type { DesignRule } from "../../schema/knowledge";
import type { VideoProject } from "../../schema/project";

// One problem a check found. sceneId lets the editor select the scene.
export type Violation = {
  ruleId: string;
  sceneId?: string;
  level: "error" | "warning";
  message: string;
};

// One check. The limit comes in `rule` (knowledge/shared/design-rules.json),
// so the number lives in the knowledge base, not in the code.
export type RuleCheck = (
  project: VideoProject,
  rule: DesignRule,
) => Violation[];
