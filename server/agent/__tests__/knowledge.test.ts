import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { loadKnowledge } from "../knowledge.js";

const FIXTURE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "knowledge",
);

// A fresh knowledge folder per test, holding only the files that test writes.
const temps: string[] = [];
async function knowledgeDir(files: Record<string, unknown>): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "knowledge-"));
  temps.push(dir);
  for (const [relative, data] of Object.entries(files)) {
    const file = path.join(dir, relative);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(
      file,
      typeof data === "string" ? data : JSON.stringify(data),
    );
  }
  return dir;
}
afterEach(async () => {
  await Promise.all(
    temps.splice(0).map((dir) => fs.rm(dir, { recursive: true })),
  );
});

describe("loadKnowledge", () => {
  it("loads a valid knowledge folder with no errors", async () => {
    const { knowledge, errors } = await loadKnowledge(FIXTURE);
    expect(errors).toEqual([]);
    expect(knowledge.videoTemplates.map((t) => t.id)).toEqual(["problem-fix"]);
    expect(knowledge.hookFormulas[0].type).toBe("pain-shown");
    expect(knowledge.workspaces[0].style.accent).toBe("#FF7024");
    expect(knowledge.designRules).toHaveLength(1);
    expect(knowledge.soundRules).toHaveLength(1);
  });

  it("treats a missing folder as empty knowledge, not an error", async () => {
    const { knowledge, errors } = await loadKnowledge(await knowledgeDir({}));
    expect(errors).toEqual([]);
    expect(knowledge.videoTemplates).toEqual([]);
  });

  it("names the file and the field that is wrong", async () => {
    const dir = await knowledgeDir({
      "shared/hook-formulas.json": [
        {
          id: "why",
          type: "question",
          formula: "Why ___?",
          examples: ["Why?"],
          fits: ["facts"],
          basedOnAnalysisIds: [],
        },
        {
          id: "why-2",
          type: "question",
          examples: ["Why?"],
          fits: ["facts"],
          basedOnAnalysisIds: [],
        },
      ],
    });
    const { knowledge, errors } = await loadKnowledge(dir);
    expect(errors).toEqual([
      {
        file: "shared/hook-formulas.json",
        path: "[1].formula",
        message: "Required",
      },
    ]);
    expect(knowledge.hookFormulas).toEqual([]);
  });

  it("rejects a word that is not in the analysis vocabulary", async () => {
    const dir = await knowledgeDir({
      "shared/sound-rules.json": [
        { event: "explosion", sound: "d-pop", maxPerScene: 1 },
      ],
    });
    const { errors } = await loadKnowledge(dir);
    expect(errors[0]).toMatchObject({
      file: "shared/sound-rules.json",
      path: "[0].event",
    });
  });

  it('rejects "other", which the analysis allows but the knowledge base does not', async () => {
    const dir = await knowledgeDir({
      "shared/cta-formulas.json": [
        {
          id: "dm",
          type: "other",
          formula: "DM me ___",
          examples: ["DM me 'guide'"],
        },
      ],
    });
    const { errors } = await loadKnowledge(dir);
    expect(errors[0]).toMatchObject({
      file: "shared/cta-formulas.json",
      path: "[0].type",
    });
  });

  it("rejects a field the schema does not know", async () => {
    const dir = await knowledgeDir({
      "shared/design-rules.json": [
        { id: "a", check: "x", level: "error", sevrity: 2 },
      ],
    });
    const { errors } = await loadKnowledge(dir);
    expect(errors[0].message).toContain("sevrity");
  });

  it("reports broken JSON without hiding the other files", async () => {
    const dir = await knowledgeDir({
      "shared/cta-formulas.json": "[{ not json",
      "shared/sound-rules.json": [
        { event: "transition", sound: "soft-whoosh", maxPerScene: 1 },
      ],
    });
    const { knowledge, errors } = await loadKnowledge(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0].file).toBe("shared/cta-formulas.json");
    expect(knowledge.soundRules).toHaveLength(1);
  });

  it("reports two objects with the same id", async () => {
    const rule = { id: "same", check: "x", level: "warning" };
    const dir = await knowledgeDir({
      "shared/design-rules.json": [rule, rule],
    });
    const { errors } = await loadKnowledge(dir);
    expect(errors).toEqual([
      {
        file: "shared/design-rules.json",
        path: "id",
        message: 'duplicate id "same"',
      },
    ]);
  });

  it("loads the real knowledge/ folder with no errors", async () => {
    const { errors } = await loadKnowledge(path.resolve("knowledge"));
    expect(errors).toEqual([]);
  });
});
