# C1. Žinių bazės schemos – planas

Tikslas: galima įkelti `knowledge/` failus ir gauti **visas** klaidas su failu ir lauku,
jei kas nors blogai. Pačių žinių (šablonų, formulių, taisyklių) čia nerašome – jas
pripildys C2–C5. Diagrama: `docs/bd/diagramos/ziniu-baze.puml`.

Visas kodas žemiau patikrintas: `npx tsc --noEmit` be klaidų, 9 / 9 testų žali.

## Sprendimai (kodėl taip)

- **Žodžiai iš dviejų vietų, ne išgalvoti.** Analizės žodžiai (`format`, `hookType`,
  `ctaType`, `act`, `connection`, `screenShare`, `syncedTo`) imami iš
  `knowledge/shared/analysis-vocabulary.json`, per pagalbinę funkciją `vocabulary()`.
  TikMaker žodžiai (fonai, šriftai, `entrance`, `kenBurns`, vaizdinių tipai, teksto
  dydžiai, paryškinimas) imami iš `src/schema/capabilities.ts`. Taip žinių bazė negali
  pasiūlyti to, ko analizė nematė arba ko TikMaker neatvaizduoja (`sprendimai.md`:
  „Agentas renkasi tik iš to, ką TikMaker moka“).
- **Rolė viena visiems.** `SceneTemplate.role` ir `LayoutExample.role` naudoja tą patį
  `scenePlanRoleSchema` kaip projekto scena (A2).
- **Kiekvienas objektas `.strict()`.** Šiuos failus rašys DI (C2). Su `.strict()`
  neteisingai parašytas laukas (pvz. `sevrity`) tampa klaida, o ne tyliai ignoruojamas.
- **`safeParse`, ne `parse`.** `parse` sustoja ties pirma klaida ir meta išimtį, o
  `safeParse` grąžina visas klaidas. Įkėlėjas surenka klaidas iš visų failų, todėl vienas
  blogas failas neužgožia kitų.
- **Failai neprivalomi.** Kol C2–C5 nepadaryti, `knowledge/shared/` beveik tuščias. Tai
  ne klaida, tiesiog žinių dar nėra.
- **Pavyzdiniai duomenys – tik testų aplanke** (`server/agent/__tests__/fixtures/`), ne
  `knowledge/shared/`. Į tikrą žinių bazę patenka tik tai, kas gauta iš analizės ir tavo
  peržiūrėta (C3). Išgalvotas šablonas ten klaidintų agentą.
- **Be `other`.** Analizei šio žodžio reikia tam, kas netinka jokiam kitam žodžiui, bet
  šablonas ar kabliukas su tipu `other` agentui nieko nepasako. `vocabulary()` jį
  išmeta, o rolėms naudojamas `knowledgeRoleSchema` (`scenePlanRoleSchema` be `other`).
  Prieš tai visi 28 `other` analizėse buvo peržiūrėti: iš jų atsirado nauji žodžiai
  `how-to`, `visual-first` (kabliukai) ir `escalation` (rolė).
- **Formulės turi `id`.** Agento paleidimas turi užrašyti, kurią formulę pasirinko, o
  vėliau iš to bus statistika. Diagramoje `id` formulėms nėra (6 žingsnis).
- **Dvi vietos, kur kodas skiriasi nuo diagramos.** Diagramoje laukas vadinasi
  `LayoutExample.type`, kode – `role`, nes tai ir yra scenos rolė („tinka rolei“). Ir
  formulės turi `id`. Diagramą verta pataisyti (6 žingsnis).
- **Aktai ir scenos – masyvai.** Diagramoje ryšys `ActTemplate *-- SceneTemplate`, JSON
  faile tai `scenes` masyvas akto viduje. Lygiai taip pat `VideoTemplate.acts`.

## Failai

| # | Failas | Kas |
|---|---|---|
| 1 | `src/schema/knowledge.ts` (naujas) | visos schemos + tipai |
| 2 | `server/agent/knowledge.ts` (naujas) | `loadKnowledge(dir)` → `{ knowledge, errors }` |
| 3 | `server/agent/__tests__/fixtures/knowledge/…` (nauji) | pavyzdiniai failai testui |
| 4 | `server/agent/__tests__/knowledge.test.ts` (naujas) | 9 testai |
| 5 | `src/schema/project.ts`, `src/schema/scene.ts` | `workspaceId`, `videoTemplateId`, `layoutExampleId` |
| 6 | `docs/darbu-eile.md`, `docs/mano-planas.md`, `ziniu-baze.puml` | `[x] C1`, atnaujintas 1 žingsnis |

Aplanko struktūra, kurią skaito įkėlėjas:

```
knowledge/
  shared/
    analysis-vocabulary.json        (jau yra, A0–A1)
    analysis-to-tikmaker.json       (jau yra, įkėlėjas jo neskaito)
    video-templates/<id>.json       po vieną VideoTemplate faile
    layout-examples/<id>.json       po vieną LayoutExample faile
    hook-formulas.json              masyvai, kiekvienas failas neprivalomas
    cta-formulas.json
    title-formulas.json
    transition-phrases.json
    design-rules.json
    sound-rules.json
  workspaces/<id>/
    workspace.json
    style.json
```

Šablonai ir išdėstymai laikomi po vieną faile, nes jie dideli ir peržiūrimi po vieną.
Formulės ir taisyklės trumpos, todėl laikomos sąrašu viename faile.

---

## 1. Schemos – `src/schema/knowledge.ts` (naujas)

Pirma perskaityk `src/schema/voiceSettings.ts` (`.strict()`) ir `src/schema/scene.ts`
24–31 eilutes (`scenePlanRoleSchema` iš analizės žodyno). Čia tas pats principas, tik
objektų daugiau.

```ts
import { z } from "zod";
import {
  analysisVocabulary,
  type AnalysisVocabularyField,
} from "../knowledge/analysisVocabulary";
import {
  backgroundIdSchema,
  entrancePresetSchema,
  highlightStyleSchema,
  kenBurnsPresetSchema,
  richTextFontSchema,
  richTextSizeSchema,
  visualTypeSchema,
} from "./capabilities";
import { scenePlanRoleSchema } from "./scene";

// The knowledge base (knowledge/): what the analysis of real videos taught,
// written in TikMaker's own words so the agent can only pick what TikMaker can
// draw. Diagram: docs/bd/diagramos/ziniu-baze.puml.
//
// Every object is .strict(): these files are written by an AI (C2) and then
// by hand, and a misspelled field silently ignored is worse than an error.

// One list from analysis-vocabulary.json as an enum — the same words the
// analysis used, so a knowledge file can't invent a hook type of its own.
// "other" is left out: the analysis needs it for what fits no word, but a
// template or a hook of type "other" tells the agent nothing.
function vocabulary(field: AnalysisVocabularyField) {
  const words = analysisVocabulary[field].filter((word) => word !== "other");
  return z.enum(words as [string, ...string[]]);
}

// The project's scene roles, minus "other" for the same reason.
const knowledgeRoleSchema = scenePlanRoleSchema.exclude(["other"]);

const secondsRangeSchema = z
  .object({ min: z.number().positive(), max: z.number().positive() })
  .strict()
  .refine((range) => range.min <= range.max, {
    message: "min must not be greater than max",
  });

const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "expected #RRGGBB");

// ---- knowledge/workspaces/<id>/ — one channel --------------------------------

export const workspaceSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    brief: z.string(),
    audience: z.string(),
    tone: z.string(),
    language: z.string().min(2),
    faceless: z.boolean(),
  })
  .strict();

export const workspaceStyleSchema = z
  .object({
    backgrounds: z.array(backgroundIdSchema).min(1),
    surface: hexColorSchema,
    textPrimary: hexColorSchema,
    textSecondary: hexColorSchema,
    accent: hexColorSchema,
    headlineFont: richTextFontSchema,
    bodyFont: richTextFontSchema,
  })
  .strict();

// ---- knowledge/shared/ — from the video analysis, shared by every channel ----

// `fixed`: a fact from the idea or the source, never invented.
// `creative`: the agent proposes options — the only place the user chooses.
export const sceneSlotSchema = z
  .object({
    name: z.string().min(1),
    kind: z.enum(["fixed", "creative"]),
  })
  .strict();

export const sceneTemplateSchema = z
  .object({
    role: knowledgeRoleSchema,
    purpose: z.string().min(1),
    seconds: secondsRangeSchema,
    repeatable: z.boolean(),
    optional: z.boolean(),
    connectionToNext: vocabulary("connection"),
    slots: z.array(sceneSlotSchema),
  })
  .strict();

export const actTemplateSchema = z
  .object({
    act: vocabulary("act"),
    scenes: z.array(sceneTemplateSchema).min(1),
  })
  .strict();

export const videoTemplateSchema = z
  .object({
    id: z.string().min(1),
    format: vocabulary("format"),
    name: z.string().min(1),
    oneLine: z.string().min(1),
    whenToUse: z.string().min(1),
    seconds: secondsRangeSchema,
    hookTypes: z.array(vocabulary("hookType")).min(1),
    ctaTypes: z.array(vocabulary("ctaType")).min(1),
    acts: z.array(actTemplateSchema).min(1),
    basedOnAnalysisIds: z.array(z.string()),
  })
  .strict();

// Formulas carry an id so an agent run can record which one it used.
export const hookFormulaSchema = z
  .object({
    id: z.string().min(1),
    type: vocabulary("hookType"),
    formula: z.string().min(1),
    examples: z.array(z.string()).min(1),
    fits: z.array(vocabulary("format")).min(1),
    basedOnAnalysisIds: z.array(z.string()),
  })
  .strict();

export const ctaFormulaSchema = z
  .object({
    id: z.string().min(1),
    type: vocabulary("ctaType"),
    formula: z.string().min(1),
    examples: z.array(z.string()).min(1),
  })
  .strict();

export const titleFormulaSchema = z
  .object({
    id: z.string().min(1),
    formula: z.string().min(1),
    examples: z.array(z.string()).min(1),
    fits: z.array(vocabulary("format")).min(1),
  })
  .strict();

export const transitionPhraseSchema = z
  .object({
    connection: vocabulary("connection"),
    phrases: z.array(z.string()).min(1),
  })
  .strict();

// A layout in words, never pixels: the layout compiler (D) turns it into x/y.
export const layoutElementSchema = z
  .object({
    kind: visualTypeSchema,
    order: z.number().int().min(0),
    size: vocabulary("screenShare"),
    enter: entrancePresetSchema,
    // Unset = the element holds still once it has arrived.
    alive: kenBurnsPresetSchema.optional(),
  })
  .strict();

export const layoutTextSchema = z
  .object({
    order: z.number().int().min(0),
    size: richTextSizeSchema,
    emphasis: highlightStyleSchema.optional(),
  })
  .strict();

export const layoutExampleSchema = z
  .object({
    id: z.string().min(1),
    // The scene role this arrangement suits (the diagram's `type`).
    role: knowledgeRoleSchema,
    arrangement: z.enum(["stack", "side-by-side", "overlay", "corner"]),
    anchor: z.enum(["center", "left", "right", "top", "bottom"]),
    elements: z.array(layoutElementSchema),
    textBlocks: z.array(layoutTextSchema),
    continuity: z.string().optional(),
    // Path to the frame this example was taken from (C4).
    frame: z.string().optional(),
  })
  .strict();

// Thresholds come from the analysis statistics (p90). `check` names a check
// the code implements; C5 narrows it to that list.
export const designRuleSchema = z
  .object({
    id: z.string().min(1),
    check: z.string().min(1),
    min: z.number().optional(),
    max: z.number().optional(),
    level: z.enum(["error", "warning"]),
  })
  .strict();

// Used by code (the sound planner), never by the AI. `sound` is an sfx id.
export const soundRuleSchema = z
  .object({
    event: vocabulary("syncedTo"),
    sound: z.string().min(1),
    maxPerScene: z.number().int().min(0),
  })
  .strict();

export type Workspace = z.infer<typeof workspaceSchema>;
export type WorkspaceStyle = z.infer<typeof workspaceStyleSchema>;
export type SceneSlot = z.infer<typeof sceneSlotSchema>;
export type SceneTemplate = z.infer<typeof sceneTemplateSchema>;
export type ActTemplate = z.infer<typeof actTemplateSchema>;
export type VideoTemplate = z.infer<typeof videoTemplateSchema>;
export type HookFormula = z.infer<typeof hookFormulaSchema>;
export type CtaFormula = z.infer<typeof ctaFormulaSchema>;
export type TitleFormula = z.infer<typeof titleFormulaSchema>;
export type TransitionPhrase = z.infer<typeof transitionPhraseSchema>;
export type LayoutElement = z.infer<typeof layoutElementSchema>;
export type LayoutText = z.infer<typeof layoutTextSchema>;
export type LayoutExample = z.infer<typeof layoutExampleSchema>;
export type DesignRule = z.infer<typeof designRuleSchema>;
export type SoundRule = z.infer<typeof soundRuleSchema>;
```

Į ką atkreipti dėmesį:
- `secondsRangeSchema` turi `.refine()`. Tai patikra, kurios neišreikši vieno lauko
  tipu (min ≤ max).
- `alive` ir `emphasis` neprivalomi. Nenurodyta reiškia, kad elementas stovi vietoje,
  o tekstas neparyškintas.
- `DesignRule.check` kol kas yra bet koks tekstas. Kai C5 metu kode atsiras tikros
  patikros, jį verta pakeisti į `z.enum([...])` su jų pavadinimais.

## 2. Įkėlėjas – `server/agent/knowledge.ts` (naujas)

Aplanko `server/agent/` dar nėra, jį sukuri pati. Vėliau ten bus visas agentas (D).
Serverio importai rašomi su `.js` galūne, kaip kituose `server/` failuose.

```ts
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
} from "../../src/schema/knowledge.js";

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
```

Kaip tai veikia, eilės tvarka:
1. `readFile`: jei failo nėra, grąžina `undefined` (tai ne klaida). Jei JSON sugadintas,
   į sąrašą įrašoma klaida.
2. `check`: kviečia `safeParse`, ir kiekviena Zod `issue` virsta
   `{ file, path, message }`. `issuePath` paverčia `[1, "formula"]` į `[1].formula`,
   kad vietą faile būtų lengva rasti.
3. `readList` skaito masyvo failą, `readFolder` – po vieną objektą iš kiekvieno failo,
   `readWorkspaces` – kanalų aplankus (kiekvienam reikia abiejų failų).
4. Pabaigoje tikrinami pasikartojantys `id`, nes objektai jungiami pagal `id`.

## 3. Pavyzdiniai failai testui

Sukurk aplanką `server/agent/__tests__/fixtures/knowledge/` ir jame šiuos failus.
Turinys sąmoningai trumpas: po vieną kiekvienos rūšies objektą, kad testas patikrintų,
jog **kiekviena** schema priima teisingą objektą.

`fixtures/knowledge/shared/video-templates/problem-fix.json`

```json
{
  "id": "problem-fix",
  "format": "explainer",
  "name": "Problem → fix",
  "oneLine": "Show what goes wrong, then the one change that fixes it.",
  "whenToUse": "A single, concrete pain the viewer recognises.",
  "seconds": { "min": 20, "max": 45 },
  "hookTypes": ["pain-shown", "result-first"],
  "ctaTypes": ["follow", "comment-keyword"],
  "acts": [
    {
      "act": "opening",
      "scenes": [
        {
          "role": "hook",
          "purpose": "Show the broken state in the first second.",
          "seconds": { "min": 1.5, "max": 3 },
          "repeatable": false,
          "optional": false,
          "connectionToNext": "question-answer",
          "slots": [{ "name": "pain", "kind": "fixed" }]
        }
      ]
    },
    {
      "act": "core",
      "scenes": [
        {
          "role": "demo",
          "purpose": "The fix, shown as its result.",
          "seconds": { "min": 3, "max": 6 },
          "repeatable": true,
          "optional": false,
          "connectionToNext": "sequence",
          "slots": [
            { "name": "step", "kind": "fixed" },
            { "name": "visual", "kind": "creative" }
          ]
        }
      ]
    },
    {
      "act": "close",
      "scenes": [
        {
          "role": "cta",
          "purpose": "One clear next action.",
          "seconds": { "min": 1.5, "max": 3 },
          "repeatable": false,
          "optional": false,
          "connectionToNext": "none",
          "slots": [{ "name": "cta", "kind": "creative" }]
        }
      ]
    }
  ],
  "basedOnAnalysisIds": []
}
```

`fixtures/knowledge/shared/layout-examples/hook-keycap.json`

```json
{
  "id": "hook-keycap",
  "role": "hook",
  "arrangement": "stack",
  "anchor": "center",
  "elements": [{ "kind": "keycap", "order": 1, "size": "medium", "enter": "pop" }],
  "textBlocks": [{ "order": 0, "size": "hero", "emphasis": "pill" }]
}
```

`fixtures/knowledge/shared/hook-formulas.json`

```json
[
  {
    "id": "still-by-hand",
    "type": "pain-shown",
    "formula": "Still doing ___ by hand?",
    "examples": ["Still renaming files by hand?"],
    "fits": ["explainer", "demo"],
    "basedOnAnalysisIds": []
  }
]
```

`fixtures/knowledge/shared/design-rules.json`

```json
[{ "id": "words-on-screen", "check": "wordsOnScreen", "max": 12, "level": "warning" }]
```

`fixtures/knowledge/shared/sound-rules.json`

```json
[{ "event": "transition", "sound": "soft-whoosh", "maxPerScene": 1 }]
```

`fixtures/knowledge/workspaces/example/workspace.json`

```json
{
  "id": "example",
  "name": "Example channel",
  "brief": "Short dev tips.",
  "audience": "Junior developers",
  "tone": "Direct, friendly",
  "language": "en",
  "faceless": true
}
```

`fixtures/knowledge/workspaces/example/style.json`

```json
{
  "backgrounds": ["soft-grid", "orange-glow"],
  "surface": "#171717",
  "textPrimary": "#FFFFFF",
  "textSecondary": "#A3A3A3",
  "accent": "#FF7024",
  "headlineFont": "tanker",
  "bodyFont": "clash"
}
```

## 4. Testai – `server/agent/__tests__/knowledge.test.ts` (naujas)

`vitest.config.ts` jau renka `server/**/__tests__/**/*.test.ts`, todėl nieko
konfigūruoti nereikia.

```ts
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { loadKnowledge } from "../knowledge.js";

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "knowledge");

// A fresh knowledge folder per test, holding only the files that test writes.
const temps: string[] = [];
async function knowledgeDir(files: Record<string, unknown>): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "knowledge-"));
  temps.push(dir);
  for (const [relative, data] of Object.entries(files)) {
    const file = path.join(dir, relative);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, typeof data === "string" ? data : JSON.stringify(data));
  }
  return dir;
}
afterEach(async () => {
  await Promise.all(temps.splice(0).map((dir) => fs.rm(dir, { recursive: true })));
});

describe("loadKnowledge", () => {
  it("loads a valid knowledge folder with no errors", async () => {
    const { knowledge, errors } = await loadKnowledge(FIXTURE);
    expect(errors).toEqual([]);
    expect(knowledge.videoTemplates.map((t) => t.id)).toEqual(["problem-fix"]);
    expect(knowledge.layoutExamples).toHaveLength(1);
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
        { id: "why", type: "question", formula: "Why ___?", examples: ["Why?"], fits: ["facts"], basedOnAnalysisIds: [] },
        { id: "why-2", type: "question", examples: ["Why?"], fits: ["facts"], basedOnAnalysisIds: [] },
      ],
    });
    const { knowledge, errors } = await loadKnowledge(dir);
    expect(errors).toEqual([
      { file: "shared/hook-formulas.json", path: "[1].formula", message: "Required" },
    ]);
    expect(knowledge.hookFormulas).toEqual([]);
  });

  it("rejects a word that is not in the analysis vocabulary", async () => {
    const dir = await knowledgeDir({
      "shared/sound-rules.json": [{ event: "explosion", sound: "d-pop", maxPerScene: 1 }],
    });
    const { errors } = await loadKnowledge(dir);
    expect(errors[0]).toMatchObject({ file: "shared/sound-rules.json", path: "[0].event" });
  });

  it("rejects \"other\", which the analysis allows but the knowledge base does not", async () => {
    const dir = await knowledgeDir({
      "shared/cta-formulas.json": [{ id: "dm", type: "other", formula: "DM me ___", examples: ["DM me 'guide'"] }],
    });
    const { errors } = await loadKnowledge(dir);
    expect(errors[0]).toMatchObject({ file: "shared/cta-formulas.json", path: "[0].type" });
  });

  it("rejects a field the schema does not know", async () => {
    const dir = await knowledgeDir({
      "shared/design-rules.json": [{ id: "a", check: "x", level: "error", sevrity: 2 }],
    });
    const { errors } = await loadKnowledge(dir);
    expect(errors[0].message).toContain("sevrity");
  });

  it("reports broken JSON without hiding the other files", async () => {
    const dir = await knowledgeDir({
      "shared/cta-formulas.json": "[{ not json",
      "shared/sound-rules.json": [{ event: "transition", sound: "soft-whoosh", maxPerScene: 1 }],
    });
    const { knowledge, errors } = await loadKnowledge(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0].file).toBe("shared/cta-formulas.json");
    expect(knowledge.soundRules).toHaveLength(1);
  });

  it("reports two objects with the same id", async () => {
    const rule = { id: "same", check: "x", level: "warning" };
    const dir = await knowledgeDir({ "shared/design-rules.json": [rule, rule] });
    const { errors } = await loadKnowledge(dir);
    expect(errors).toEqual([
      { file: "shared/design-rules.json", path: "id", message: 'duplicate id "same"' },
    ]);
  });

  it("loads the real knowledge/ folder with no errors", async () => {
    const { errors } = await loadKnowledge(path.resolve("knowledge"));
    expect(errors).toEqual([]);
  });
});
```

Ką tikrina kiekvienas testas:

| Testas | Kodėl |
|---|---|
| pavyzdinis aplankas be klaidų | kiekviena schema priima teisingą objektą |
| tuščias aplankas | kol C2–C5 nepadaryti, tai normalu |
| `[1].formula` – „Required“ | klaidoje matosi failas ir laukas (1 žingsnio patikra iš `mano-planas.md`) |
| `explosion` ne žodyne | žodžiai tik iš analizės žodyno |
| `type: "other"` | analizės „nežinau“ žodis žinių bazėje neleidžiamas |
| `sevrity` | `.strict()` pagauna netikslų lauką |
| sugadintas JSON | viena klaida neužgožia kito failo |
| pasikartojantis `id` | jungimas pagal `id` vienareikšmis |
| tikras `knowledge/` be klaidų | saugiklis C2–C5 metu: sugadintas žinių failas sustabdo `npm test` |

## 5. Projekto ryšiai su žinių baze

Tai vieninteliai projekto schemos pakeitimai iš `sprendimai.md` („TikMaker projekto
schemos pakeitimai“, 2–3 punktai). 1 punktas (`bridge`, `item`) jau padarytas A2 metu.
Visi laukai neprivalomi, todėl seni projektai ir rankinis redaktorius nesikeičia.

`src/schema/project.ts`, `videoProjectSchema` viduje, po `collection`:

```ts
  // Set when the agent built the project (D): which channel and which
  // knowledge-base VideoTemplate it followed. Absent for a hand-made video.
  workspaceId: z.string().optional(),
  videoTemplateId: z.string().optional(),
```

`src/schema/scene.ts`, `sceneSchema` viduje, po `plan`:

```ts
  // The knowledge-base LayoutExample this scene was laid out from, for
  // statistics only — neither the compiler nor the checks read it.
  layoutExampleId: z.string().optional(),
```

Dėmesio: `scene.ts` jau turi lauką `layout` – tai TikMaker išdėstymo preset'as (pvz.
`visual-hero`). `layoutExampleId` yra kitas dalykas: žinių bazės `LayoutExample.id`.

Pavadinimų taisyklė: nuoroda į žinių bazės objektą vadinasi taip pat kaip objektas +
`Id` (`VideoTemplate` → `videoTemplateId`, `LayoutExample` → `layoutExampleId`,
`Workspace` → `workspaceId`). Taip iš lauko pavadinimo iškart aišku, į ką jis rodo.

## 6. Dokumentai

- `docs/darbu-eile.md`: `- [ ] **C1.` → `- [x] **C1.`
- `docs/mano-planas.md`: 1 žingsnio sąrašą „Parašyti“ pakeisk į:

```md
- [x] `src/schema/knowledge.ts`: `Workspace`, `WorkspaceStyle`, `VideoTemplate` → `ActTemplate` → `SceneTemplate` → `SceneSlot`, `HookFormula`, `CtaFormula`, `TitleFormula`, `TransitionPhrase`, `LayoutExample` (+ `LayoutElement`, `LayoutText`), `DesignRule`, `SoundRule` + tipai per `z.infer`
- [x] `server/agent/knowledge.ts`: `loadKnowledge(dir): { knowledge, errors }`
- [x] Pavyzdžiai testui: `server/agent/__tests__/fixtures/knowledge/`
- [x] Projekto schemoje: `workspaceId?`, `videoTemplateId?`; scenoje `layoutExampleId?`
- [x] Testas `server/agent/__tests__/knowledge.test.ts`
```

  Senieji pavadinimai (`themeSchema`, `hookSchema`, `knowledge/themes/dev/…`) buvo
  sugalvoti dar prieš diagramą. `storyPlan.targetDuration` projekte jau yra.
- `docs/bd/diagramos/ziniu-baze.puml`: `LayoutExample` lauką `+ type : string`
  pakeisk į `+ role : string`, o `HookFormula`, `CtaFormula`, `TitleFormula` viršuje
  pridėk `+ id : string`.

## Patikra

1. `npx tsc --noEmit` – be klaidų.
2. `npm test` – visi testai žali, įskaitant 9 naujus.
3. Rankinė patikra (1 žingsnio iš `mano-planas.md`): fixture faile `hook-formulas.json`
   ištrink lauką `formula` ir paleisk `npx vitest run server/agent`. Pirmas testas turi
   kristi su `shared/hook-formulas.json`, `[0].formula`, `Required`. Tada grąžink lauką
   atgal.

## Gynimo klausimai

- **Kuo skiriasi `parse` ir `safeParse`?** `parse` grąžina duomenis arba meta išimtį ties
  pirma problema. `safeParse` išimties niekada nemeta: grąžina `{ success, data }` arba
  `{ success: false, error }` su visomis problemomis. Įkėlėjui reikia antrojo, nes jis
  renka klaidas iš daugelio failų.
- **Kam schema, jei TypeScript jau turi tipus?** Tipai tikrinami kompiliuojant, o JSON
  failai ir DI atsakymai ateina programai jau veikiant. Juos patikrinti gali tik schema.
  Be to, `z.infer` padaro, kad tipas ir patikra būtų vienas aprašas, o ne du, kurie
  ilgainiui gali išsiskirti.
- **Kodėl žodžiai imami iš žodyno, o ne laisvas tekstas?** Kad agentas negalėtų
  pasirinkti to, ko TikMaker nemoka atvaizduoti. Tokia klaida pagaunama jau įkeliant
  žinias, o ne renderinant.
