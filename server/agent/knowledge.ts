import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  ctaFormulaSchema,
  designRuleSchema,
  hookFormulaSchema,
  layoutExampleSchema,
  soundRuleSchema,
  titleFormulaSchema,
  transitionPhraseSchema,
  videoTemplateSchema,
  workspaceSchema,
  workspaceStyleSchema,
  type CtaFormula,
  type DesignRule,
  type HookFormula,
  type LayoutExample,
  type SoundRule,
  type TitleFormula,
  type TransitionPhrase,
  type VideoTemplate,
  type Workspace,
  type WorkspaceStyle,
} from "../../src/agent/knowledge.js";

// Loads knowledge/ and reports every problem instead of stopping at the
// first: one bad hook formula must not hide the rest of the knowledge base,
// and the person fixing the files wants the whole list at once.
//
// Layout of the folder:
//   shared/video-templates/<id>.json   one VideoTemplate per file
//   shared/layout-examples/<id>.json   one LayoutExample per file
//   shared/hook-formulas.json          arrays — every file is optional
//   shared/cta-formulas.json
//   shared/title-formulas.json
//   shared/transition-phrases.json
//   shared/design-rules.json
//   shared/sound-rules.json
//   workspaces/<id>/workspace.json     + style.json

export type KnowledgeError = {
  file: string; // relative to the knowledge folder
  path: string; // where inside the file, e.g. "[2].formula"; "" = the file itself
  message: string;
};

export type WorkspaceEntry = { workspace: Workspace; style: WorkspaceStyle };

export type Knowledge = {
  videoTemplates: VideoTemplate[];
  layoutExamples: LayoutExample[];
  hookFormulas: HookFormula[];
  ctaFormulas: CtaFormula[];
  titleFormulas: TitleFormula[];
  transitionPhrases: TransitionPhrase[];
  designRules: DesignRule[];
  soundRules: SoundRule[];
  workspaces: WorkspaceEntry[];
};

// "[2].formula" from Zod's ["2", "formula"] — numbers as indexes, the way the
// error reads when you open the file.
function issuePath(segments: (string | number)[]): string {
  return segments
    .map((segment, i) =>
      typeof segment === "number"
        ? `[${segment}]`
        : i === 0
          ? segment
          : `.${segment}`,
    )
    .join("");
}

export async function loadKnowledge(
  dir: string,
): Promise<{ knowledge: Knowledge; errors: KnowledgeError[] }> {
  const errors: KnowledgeError[] = [];

  // undefined = missing (fine, the file is optional) or broken (reported).
  async function readFile(relative: string): Promise<unknown> {
    let text: string;
    try {
      text = await fs.readFile(path.join(dir, relative), "utf-8");
    } catch {
      return undefined;
    }
    try {
      return JSON.parse(text);
    } catch (error) {
      errors.push({
        file: relative,
        path: "",
        message: `not valid JSON: ${String(error)}`,
      });
      return undefined;
    }
  }

  function check<T>(
    schema: z.ZodType<T>,
    data: unknown,
    file: string,
  ): T | undefined {
    const result = schema.safeParse(data);
    if (result.success) return result.data;
    for (const issue of result.error.issues) {
      errors.push({
        file,
        path: issuePath(issue.path),
        message: issue.message,
      });
    }
    return undefined;
  }

  async function readList<T>(
    relative: string,
    schema: z.ZodType<T>,
  ): Promise<T[]> {
    const data = await readFile(relative);
    if (data === undefined) return [];
    return check(z.array(schema), data, relative) ?? [];
  }

  async function readFolder<T>(
    relative: string,
    schema: z.ZodType<T>,
  ): Promise<T[]> {
    const files = await fs.readdir(path.join(dir, relative)).catch(() => []);
    const items: T[] = [];
    for (const name of files.filter((file) => file.endsWith(".json")).sort()) {
      const file = path.posix.join(relative, name);
      const data = await readFile(file);
      if (data === undefined) continue;
      const item = check(schema, data, file);
      if (item) items.push(item);
    }
    return items;
  }

  async function readWorkspaces(): Promise<WorkspaceEntry[]> {
    const entries = await fs
      .readdir(path.join(dir, "workspaces"), { withFileTypes: true })
      .catch(() => []);
    const workspaces: WorkspaceEntry[] = [];
    for (const entry of entries.filter((e) => e.isDirectory())) {
      const workspaceFile = `workspaces/${entry.name}/workspace.json`;
      const styleFile = `workspaces/${entry.name}/style.json`;
      const workspaceData = await readFile(workspaceFile);
      const styleData = await readFile(styleFile);
      if (workspaceData === undefined || styleData === undefined) {
        errors.push({
          file: `workspaces/${entry.name}`,
          path: "",
          message: "a workspace needs both workspace.json and style.json",
        });
        continue;
      }
      const workspace = check(workspaceSchema, workspaceData, workspaceFile);
      const style = check(workspaceStyleSchema, styleData, styleFile);
      if (workspace && style) workspaces.push({ workspace, style });
    }
    return workspaces;
  }

  const knowledge: Knowledge = {
    videoTemplates: await readFolder(
      "shared/video-templates",
      videoTemplateSchema,
    ),
    layoutExamples: await readFolder(
      "shared/layout-examples",
      layoutExampleSchema,
    ),
    hookFormulas: await readList(
      "shared/hook-formulas.json",
      hookFormulaSchema,
    ),
    ctaFormulas: await readList("shared/cta-formulas.json", ctaFormulaSchema),
    titleFormulas: await readList(
      "shared/title-formulas.json",
      titleFormulaSchema,
    ),
    transitionPhrases: await readList(
      "shared/transition-phrases.json",
      transitionPhraseSchema,
    ),
    designRules: await readList("shared/design-rules.json", designRuleSchema),
    soundRules: await readList("shared/sound-rules.json", soundRuleSchema),
    workspaces: await readWorkspaces(),
  };

  // Objects are joined by id (a project's videoTemplateId, the formula an agent
  // run used, a workspace's id), so two with the same id make the join ambiguous.
  const idGroups: [string, { id: string }[]][] = [
    ["shared/video-templates", knowledge.videoTemplates],
    ["shared/layout-examples", knowledge.layoutExamples],
    ["shared/hook-formulas.json", knowledge.hookFormulas],
    ["shared/cta-formulas.json", knowledge.ctaFormulas],
    ["shared/title-formulas.json", knowledge.titleFormulas],
    ["shared/design-rules.json", knowledge.designRules],
    ["workspaces", knowledge.workspaces.map((entry) => entry.workspace)],
  ];
  for (const [file, items] of idGroups) {
    const seen = new Set<string>();
    for (const { id } of items) {
      if (seen.has(id))
        errors.push({ file, path: "id", message: `duplicate id "${id}"` });
      seen.add(id);
    }
  }

  return { knowledge, errors };
}
