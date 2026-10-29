import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { loadKnowledge } from "../server/agent/knowledge";
import {
  actTemplateSchema,
  ctaFormulaSchema,
  hookFormulaSchema,
  sceneTemplateSchema,
  titleFormulaSchema,
  transitionPhraseSchema,
  videoTemplateSchema,
} from "../src/schema/knowledge";

// Usage: npm run knowledge:draft [-- knowledge/draft/proposal.json]
//
// Turns a proposal into knowledge/draft/. The split is deliberate:
// - the PROPOSAL holds judgement — which analyses form a template, its name,
//   the order of its scenes, their purpose and slots, the formulas with their
//   [replaceable parts]. Prompt 3 (docs/bd/video-analizes-promptas.md) writes it.
// - THIS SCRIPT computes everything that can be counted, because language
//   models count badly: which scenes stay, optional, repeatable, seconds, the
//   type lists and every quoted example. Nothing here is invented — examples
//   are copied from docs/bd/analizes/.
// At the end the draft is loaded with loadKnowledge, the same check the agent
// will use, and a report of every decision goes to build-report.md.

const analysesDir = "docs/bd/analizes";
const draftDir = "knowledge/draft";
const proposalFile = process.argv[2] ?? join(draftDir, "proposal.json");

// A scene stays in a template when its role is in at least this share of the
// template's analyses. Keeping every role ANY analysis used made almost every
// scene optional (142 of 194), which tells the agent nothing.
const SCENE_MIN_SHARE = 0.5;

// ---- the proposal: the knowledge-base shapes minus what is computed ---------

const proposalSceneSchema = sceneTemplateSchema.omit({
  seconds: true,
  repeatable: true,
  optional: true,
});
const proposalSchema = z
  .object({
    templates: z.array(
      videoTemplateSchema
        .omit({ seconds: true, hookTypes: true, ctaTypes: true, acts: true })
        .extend({
          acts: z
            .array(actTemplateSchema.extend({ scenes: z.array(proposalSceneSchema).min(1) }))
            .min(1),
        }),
    ),
    hookFormulas: z.array(hookFormulaSchema.omit({ examples: true, fits: true })),
    ctaFormulas: z.array(
      ctaFormulaSchema
        .omit({ examples: true })
        .extend({ basedOnAnalysisIds: z.array(z.string()).min(1) }),
    ),
    titleFormulas: z.array(
      titleFormulaSchema
        .omit({ examples: true, fits: true })
        .extend({ basedOnAnalysisIds: z.array(z.string()).min(1) }),
    ),
    transitionPhrases: z.array(transitionPhraseSchema),
  })
  .strict();

const parsed = proposalSchema.safeParse(
  JSON.parse(readFileSync(proposalFile, "utf-8")),
);
if (!parsed.success) {
  console.error(`${proposalFile} does not match the proposal shape:`);
  for (const issue of parsed.error.issues)
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  process.exit(1);
}
const proposal = parsed.data;

// ---- the analyses ------------------------------------------------------------

type Beat = {
  role?: string;
  startSeconds?: number;
  endSeconds?: number;
  voiceover?: string;
  connectionToNext?: string;
  transitionPhrase?: string;
};
type Analysis = {
  title?: string;
  format?: string;
  durationSeconds: number;
  hook: { type: string; voiceover?: string; onScreenText?: string };
  cta?: { type?: string; text?: string };
  beats: Beat[];
};

const analyses = new Map<string, Analysis>();
for (const file of readdirSync(analysesDir).filter((f) => f.endsWith(".json")))
  analyses.set(
    file.slice(0, -".json".length),
    JSON.parse(readFileSync(join(analysesDir, file), "utf-8")),
  );

const report: string[] = [];
const problems: string[] = [];
const uniq = <T>(values: T[]) => [...new Set(values)];
const oneLine = (text = "") => text.replace(/\s+/g, " ").trim();
const allowed = (word: string | undefined): word is string =>
  !!word && word !== "other";

function analysis(id: string, where: string): Analysis | undefined {
  const found = analyses.get(id);
  if (!found) problems.push(`${where}: unknown analysis ${id}`);
  return found;
}

// Same quantile and rounding as scripts/analysisStats.ts.
function quantile(values: number[], q: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const low = Math.floor(pos);
  const high = Math.ceil(pos);
  return sorted[low] + (sorted[high] - sorted[low]) * (pos - low);
}
const round = (n: number) => Math.round(n * 10) / 10;

// ---- templates ---------------------------------------------------------------

rmSync(join(draftDir, "shared"), { recursive: true, force: true });
mkdirSync(join(draftDir, "shared", "video-templates"), { recursive: true });
const write = (relative: string, data: unknown) =>
  writeFileSync(
    join(draftDir, "shared", relative),
    JSON.stringify(data, null, 2) + "\n",
  );

const inTemplate = new Map<string, string>();
for (const template of proposal.templates) {
  const where = `template ${template.id}`;
  const members = template.basedOnAnalysisIds
    .map((id) => [id, analysis(id, where)] as const)
    .filter((entry): entry is readonly [string, Analysis] => !!entry[1]);
  if (members.length < 3) problems.push(`${where}: fewer than 3 analyses`);
  for (const [id, a] of members) {
    if (inTemplate.has(id))
      problems.push(`${where}: ${id} is already in ${inTemplate.get(id)}`);
    inTemplate.set(id, template.id);
    if (a.format !== template.format)
      problems.push(`${where}: ${id} is format "${a.format}"`);
  }
  const n = members.length;
  report.push(`\n### ${template.id} (${n} analyses)`);

  const acts = template.acts
    .map(({ act, scenes }) => ({
      act,
      scenes: scenes.flatMap((scene) => {
        const perAnalysis = members.map(
          ([, a]) => a.beats.filter((b) => b.role === scene.role),
        );
        const present = perAnalysis.filter((beats) => beats.length > 0);
        if (present.length < n * SCENE_MIN_SHARE) {
          report.push(
            `- dropped ${act}/${scene.role}: in ${present.length} of ${n} analyses`,
          );
          return [];
        }
        const lengths = present
          .flat()
          .map((b) => (b.endSeconds ?? NaN) - (b.startSeconds ?? NaN))
          .filter((length) => length > 0);
        const repeating = present.filter((beats) => beats.length > 1).length;
        return [
          {
            ...scene,
            seconds: {
              min: round(quantile(lengths, 0.1)),
              max: round(quantile(lengths, 0.9)),
            },
            // Repeats in at least half of the analyses that have it at all.
            repeatable: repeating > 0 && repeating >= present.length / 2,
            optional: present.length < n,
          },
        ];
      }),
    }))
    .filter((act) => act.scenes.length > 0);

  // Roles most analyses use that the proposal left out: worth a second look.
  const roles = new Set<string>(acts.flatMap((a) => a.scenes.map((s) => s.role)));
  const used = uniq(members.flatMap(([, a]) => a.beats.map((b) => b.role)));
  for (const role of used.filter(allowed)) {
    const count = members.filter(([, a]) => a.beats.some((b) => b.role === role)).length;
    if (!roles.has(role) && count >= n * SCENE_MIN_SHARE)
      report.push(`- missing ${role}: in ${count} of ${n} analyses, not in the proposal`);
  }

  const durations = members.map(([, a]) => a.durationSeconds);
  const ctaTypes = uniq(members.map(([, a]) => a.cta?.type ?? "none")).filter(allowed);
  write(`video-templates/${template.id}.json`, {
    id: template.id,
    format: template.format,
    name: template.name,
    oneLine: template.oneLine,
    whenToUse: template.whenToUse,
    seconds: { min: Math.min(...durations), max: Math.max(...durations) },
    hookTypes: uniq(members.map(([, a]) => a.hook.type)).filter(allowed),
    ctaTypes: ctaTypes.length ? ctaTypes : ["none"],
    acts,
    basedOnAnalysisIds: template.basedOnAnalysisIds,
  });
}
const outside = [...analyses.keys()].filter((id) => !inTemplate.has(id));
report.push(`\n### In no template (${outside.length})\n${outside.join(", ") || "none"}`);

// ---- formulas: examples and fits come from the analyses ---------------------

// The longest spoken version of the hook, else its on-screen text.
function hookExample(a: Analysis) {
  const hookBeat = a.beats.find((b) => b.role === "hook");
  const spoken = [a.hook.voiceover, hookBeat?.voiceover]
    .map((text) => oneLine(text))
    .filter(Boolean)
    .sort((x, y) => y.length - x.length)[0];
  return spoken || oneLine(a.hook.onScreenText);
}

const formats = (ids: string[], where: string) => {
  const found = ids.map((id) => analysis(id, where)?.format);
  const skipped = found.filter((format) => !allowed(format));
  if (skipped.length) report.push(`- ${where}: format "other" left out of fits`);
  return uniq(found.filter(allowed));
};

const covered = (label: string, ids: string[], wanted: (a: Analysis) => boolean) => {
  const missing = [...analyses].filter(([id, a]) => wanted(a) && !ids.includes(id));
  if (missing.length)
    report.push(`- ${label} not covered: ${missing.map(([id]) => id).join(", ")}`);
};

report.push("\n### Formulas");
write(
  "hook-formulas.json",
  proposal.hookFormulas.flatMap((formula) => {
    const where = `hook ${formula.id}`;
    const members = formula.basedOnAnalysisIds.map((id) => analysis(id, where));
    members.forEach((a, i) => {
      if (a && a.hook.type !== formula.type)
        problems.push(`${where}: ${formula.basedOnAnalysisIds[i]} is "${a.hook.type}"`);
    });
    const fits = formats(formula.basedOnAnalysisIds, where);
    if (!fits.length) {
      report.push(`- dropped ${where}: no allowed format to fit`);
      return [];
    }
    return [
      {
        ...formula,
        examples: uniq(members.filter((a) => !!a).map(hookExample)),
        fits,
      },
    ];
  }),
);
covered("hooks", proposal.hookFormulas.flatMap((f) => f.basedOnAnalysisIds), () => true);

write(
  "cta-formulas.json",
  proposal.ctaFormulas.map(({ basedOnAnalysisIds, ...formula }) => {
    const where = `cta ${formula.id}`;
    const members = basedOnAnalysisIds.map((id) => analysis(id, where));
    members.forEach((a, i) => {
      if (a && a.cta?.type !== formula.type)
        problems.push(`${where}: ${basedOnAnalysisIds[i]} is "${a.cta?.type}"`);
    });
    return {
      ...formula,
      examples: uniq(members.map((a) => oneLine(a?.cta?.text)).filter(Boolean)),
    };
  }),
);
covered(
  "CTAs",
  proposal.ctaFormulas.flatMap((f) => f.basedOnAnalysisIds),
  (a) => allowed(a.cta?.type) && a.cta?.type !== "none",
);

write(
  "title-formulas.json",
  proposal.titleFormulas.flatMap(({ basedOnAnalysisIds, ...formula }) => {
    const where = `title ${formula.id}`;
    const members = basedOnAnalysisIds.map((id) => analysis(id, where));
    members.forEach((a, i) => {
      if (a && !a.title) problems.push(`${where}: ${basedOnAnalysisIds[i]} has no title`);
    });
    const fits = formats(basedOnAnalysisIds, where);
    if (!fits.length) {
      report.push(`- dropped ${where}: no allowed format to fit`);
      return [];
    }
    return [
      {
        ...formula,
        examples: uniq(members.map((a) => oneLine(a?.title)).filter(Boolean)),
        fits,
      },
    ];
  }),
);
covered("titles", proposal.titleFormulas.flatMap((f) => f.basedOnAnalysisIds), (a) => !!a.title);

// A phrase stays only when that exact phrase leads into that connection
// somewhere in the data.
const realPhrases = new Map<string, Set<string>>();
for (const a of analyses.values())
  for (const beat of a.beats)
    if (beat.transitionPhrase && beat.connectionToNext) {
      const set = realPhrases.get(beat.connectionToNext) ?? new Set();
      set.add(oneLine(beat.transitionPhrase));
      realPhrases.set(beat.connectionToNext, set);
    }
write(
  "transition-phrases.json",
  proposal.transitionPhrases.flatMap(({ connection, phrases }) => {
    const real = phrases.filter((p) => realPhrases.get(connection)?.has(oneLine(p)));
    const fake = phrases.filter((p) => !real.includes(p));
    if (fake.length) report.push(`- ${connection}: dropped phrases not in the data: ${fake.join(" | ")}`);
    return real.length ? [{ connection, phrases: real }] : [];
  }),
);

// ---- check and report ------------------------------------------------------

const { knowledge, errors } = await loadKnowledge(draftDir);
const counts = Object.entries(knowledge)
  .filter(([, items]) => items.length)
  .map(([name, items]) => `${name} ${items.length}`)
  .join(", ");

writeFileSync(
  join(draftDir, "build-report.md"),
  [
    "# Knowledge draft build report",
    "",
    `Written by scripts/buildKnowledgeDraft.ts from ${proposalFile}. Do not edit by hand.`,
    "",
    `Loaded: ${counts}.`,
    `Problems: ${problems.length}. Schema errors: ${errors.length}.`,
    ...problems.map((p) => `- PROBLEM ${p}`),
    ...errors.map((e) => `- SCHEMA ${e.file} ${e.path}: ${e.message}`),
    ...report,
    "",
  ].join("\n"),
);

console.log(`knowledge/draft: ${counts}`);
console.log(`problems: ${problems.length}, schema errors: ${errors.length}`);
console.log(`details: ${join(draftDir, "build-report.md")}`);
if (problems.length || errors.length) process.exit(1);
