# Mano agento programavimo planas (mokymuisi)

> Eilė „ką daryti toliau“: `docs/darbu-eile.md`. Šis failas – fonui.

Tikslas: parašyti agentą **pačiai** ir suprasti kiekvieną eilutę, kad gynime
galėčiau paaiškinti ir pakeisti bet kurią vietą.

Kiekviename žingsnyje yra:
- **Tikslas**: ką baigus turi veikti;
- **Išmoksiu**: kokią sąvoką ar įrankį;
- **Pirma perskaityti**: esamas TikMaker kodas, iš kurio mokytis;
- **Parašyti**: failai ir funkcijos;
- **Patikra**: kaip žinoti, kad veikia;
- **Gynimo klausimai**: į ką turiu mokėti atsakyti be kodo prieš akis.

Platesnis kontekstas: `docs/igyvendinimas.md` (kas iš kur),
`docs/bd/2-reikalavimai.md` (FR/NFR).

---

## Darbo su DI taisyklės (kad suprasčiau, o ne nukopijuočiau)

1. **Pirma rašau pati**, net jei negražiai. DI prašau tik peržiūrėti
   („kas čia blogai ir kodėl?“), o ne parašyti iš naujo.
2. Jei DI parašo gabalą, **perrašau jį savais žodžiais** arba bent kiekvieną
   eilutę pakomentuoju sau, ką ji daro. Paskui komentarus ištrinu.
3. Nesuprantamą sąvoką klausiu atskirai: „paaiškink Zod `safeParse`
   paprastai, su mažu pavyzdžiu“.
4. Kiekvieno žingsnio pabaigoje **be kodo prieš akis** atsakau į gynimo
   klausimus. Jei nemoku, žingsnis nebaigtas.
5. Vedu **DI naudojimo žurnalą** `docs/di-zurnalas.md`: data, kam naudojau,
   ką pakeičiau pati. Jo reikės Aprašui (kolegijos DI gairės).
6. Kiekvienas žingsnis = vienas ar keli commit'ai su aiškia žinute.

Komandos, kurių reikės visur:
```bash
npm run dev         # redaktorius :5173 + serveris :3001
npm test            # visi testai
npm run test:watch  # testai persikrauna keičiant kodą
npm run typecheck   # TypeScript klaidos
npx tsx scripts/kazkas.ts   # paleisti vieną TS failą
```

---

## 0 žingsnis. Pasiruošimas (½ dienos)

**Tikslas:** aplinka paruošta, suprantu, kur kas yra.

- [ ] `npx skills add remotion-dev/skills` (kad Claude Code geriau padėtų su Remotion)
- [ ] Gauti nemokamą Gemini API raktą: https://aistudio.google.com → „Get API key“
- [ ] `npm install ai @ai-sdk/google zod` (Vercel AI SDK: vienas kodas, modelį galima keisti; vėliau `@ai-sdk/anthropic` Claude)
- [ ] `.env.local` įrašyti `GOOGLE_GENERATIVE_AI_API_KEY=...` (failas jau `.gitignore`)
- [ ] Modelio pavadinimas konfigūracijoje (`AGENT_MODEL`), ne kode
- [ ] Sukurti `docs/di-zurnalas.md`

**Pirma perskaityti** (tik suprasti, ne keisti):
- `src/schema/project.ts`, `src/schema/scene.ts`: kaip atrodo projektas
- `db/projects/vibe-trap-01-forms.json`: tikras projektas
- `src/utils/normalizeProject.ts` → `parseProject()`
- `server/trpc/router.ts`, `server/trpc/renders.ts`, `server/renderJobs.ts`

**Gynimo klausimai:** kas yra scena, sluoksnis (layer) ir išdėstymas
(layout)? Kodėl projektas yra JSON, o ne kodas?

---

## 1 žingsnis. Žinių bazės schemos (1–2 dienos)

**Tikslas:** galiu įkelti `knowledge/` failus ir gauti klaidas, jei jie blogi.
**Išmoksiu:** Zod schemos, `z.infer`, `safeParse`, klaidų keliai.

**Pirma perskaityti:** `src/schema/voiceSettings.ts` (paprasta schema),
`src/schema/scene.ts` (`scenePlanSchema`, `scenePlanRoleSchema`).

**Parašyti:**
- [ ] `src/schema/knowledge.ts`: `themeSchema`, `templateSchema`, `hookSchema`, `designRefSchema` + tipai per `z.infer`
- [ ] `knowledge/themes/dev/theme.json`, `brief.md`, `templates/problem-fix.json`, `templates/curiosity-loop.json`, `hooks.json` (5 formulės)
- [ ] `server/agent/knowledge.ts`: `loadKnowledge(dir): { themes, errors }`
- [ ] Projekto schemoje (`src/schema/project.ts`): `theme?: string`, `storyPlan.targetDuration?: number`
- [ ] Testas `server/agent/__tests__/knowledge.test.ts`: geras failas įsikelia, blogas grąžina klaidą su keliu

**Patikra:** `npm test` žalias; sugadinus `hooks.json` lauką, klaidoje matosi failas ir laukas.

**Gynimo klausimai:** kuo skiriasi `parse` ir `safeParse`? Kodėl schema
reikalinga, jei TypeScript jau turi tipus? (Atsakymas: tipai tikrinami
kompiliuojant, o failai ir DI atsakymai ateina vykdymo metu.)

---

## 2 žingsnis. Pirmas DI kvietimas (1–2 dienos)

**Tikslas:** iš skripto iškviečiu Claude ir gaunu schemą atitinkantį atsakymą.
**Išmoksiu:** AI SDK `generateObject` (atsakymas pagal Zod schemą), tokenai, kaip keisti modelį be kodo keitimo.
(Dabartinį API pasitikrinti https://ai-sdk.dev/docs — versijos keičiasi.)

**Parašyti:**
- [ ] `server/agent/llm.ts`: `callStructured(schema, { system, user })` → `{ data, usage, ms }`; jei `parsed_output == null`, iki 2 pakartojimų
- [ ] `scripts/try-llm.ts`: pabandyti su mažyte schema (pvz. `{ title: string, scenes: string[] }`)

**Patikra:** `npx tsx scripts/try-llm.ts` atspausdina objektą ir tokenų skaičių;
antrą kartą paleidus su tuo pačiu `system`, `cache_read_input_tokens > 0`
(jei `system` pakankamai ilgas; Gemini podėlį daro automatiškai, žiūrėti `usage`).

**Gynimo klausimai:** kas yra struktūrizuota išvestis? Kas nutinka, jei
modelis grąžina netinkamą JSON? Kas yra užklausų podėlis ir kodėl jis pigesnis?

---

## 3 žingsnis. Agento paleidimas fone (2 dienos)

**Tikslas:** `agent.start` sukuria paleidimą, `agent.get` grąžina jo būseną.
**Išmoksiu:** tRPC procedūros (`query`/`mutation`), fono darbai, būsenų mašina.

**Pirma perskaityti:** `server/renderJobs.ts` ir `server/trpc/renders.ts`
(tas pats modelis: pradėti darbą → klausti būsenos).

**Parašyti:**
- [ ] `src/schema/agentRun.ts`: `agentRunInputSchema`, `agentRunSchema` (`status`: `created | picking_template | awaiting_hook | writing_script | awaiting_approval | laying_out | checking | done | error`, `steps[]`)
- [ ] `server/agent/runs.ts`: `startRun()`, `getRun()`, `saveRun()` (į `db/agent-runs/<id>.json`)
- [ ] `server/trpc/agent.ts` + pridėti į `appRouter`

**Patikra:** iš naršyklės konsolės arba testo iškvietus `agent.start`, faile
`db/agent-runs/` atsiranda įrašas, o `agent.get` grąžina būseną.

**Gynimo klausimai:** kodėl agentas vykdomas fone, o ne vienoje užklausoje?
Nupiešk paleidimo būsenų diagramą (tai bus ir UML būsenų diagrama Apraše).

---

## 4 žingsnis. Šablonas → kabliukai → scenarijus (4–5 dienos)

**Tikslas:** iš idėjos gaunu parinktą šabloną, 3 kabliukus ir scenarijų.
**Išmoksiu:** promptų rašymas, kodo patikra po DI, žingsnių sujungimas.

**Pirma perskaityti:** `src/utils/pacing.ts` (`voDurationSeconds`),
`.claude/skills/tiktok-video/SKILL.md` (kokie scenarijai geri).

**Parašyti:**
- [ ] `server/agent/steps/pickTemplate.ts` (FR-04, FR-05)
- [ ] `server/agent/steps/hooks.ts` (FR-06) + kodo patikra „bent 2 iš bazės“
- [ ] `server/agent/steps/script.ts` (FR-08)
- [ ] `src/agent/checkScript.ts` (FR-09) + testai
- [ ] `runs.ts`: sujungti žingsnius; po kabliukų būsena `awaiting_hook`

**Patikra:** 3 skirtingoms idėjoms skriptas atspausdina šabloną, kabliukus ir
scenarijų; `checkScript` testai žali.

**Gynimo klausimai:** kodėl šablono sąraše DI duodu tik `id` ir `whenToUse`?
Ką daro kodas po DI atsakymo ir kodėl negalima pasitikėti vien DI?

---

## 5 žingsnis. Naudotojo sąsaja: paleidimas ir patvirtinimas (3–4 dienos)

**Tikslas:** iš redaktoriaus paleidžiu agentą, pasirenku kabliuką ir patvirtinu scenarijų.
**Išmoksiu:** React + Mantine formos, TanStack Query (`useQuery`, `useMutation`, `refetchInterval`).

**Pirma perskaityti:** `src/editor/ImportJsonDialog.tsx`,
`src/editor/RenderButton.tsx` (kaip klausiama būsenos),
`src/editor/storyboard/ProjectStoryboardView.tsx`.

**Parašyti:**
- [ ] `src/editor/agent/NewAgentRunDialog.tsx` (FR-03)
- [ ] `src/editor/agent/HookPicker.tsx` (FR-07)
- [ ] `src/editor/agent/AgentScriptBar.tsx` (FR-10), įdėti į Storyboard viršų
- [ ] tRPC: `chooseHook`, `reviseScript`, `approveScript`

**Patikra:** visas kelias iki patvirtinto scenarijaus veikia naršyklėje.

**Gynimo klausimai:** kur laikoma serverio būsena, o kur redaguojamo
projekto būsena (TanStack Query vs Zustand)? Kodėl?

---

## 6 žingsnis. Kadrų dėliojimas ir kompiliatorius (6–7 dienos, svarbiausias)

**Tikslas:** iš patvirtinto scenarijaus gaunu projektą, kuris atsidaro redaktoriuje.
**Išmoksiu:** grynos funkcijos, determinizmas, esamų išdėstymo taisyklių naudojimas.

**Pirma perskaityti:** `src/video/layout/layoutPresets.ts`
(`layoutPresets`, `fitPositionedVisual`), `src/registries/visualTemplateRegistry.ts`,
`src/registries/sceneRegistry.ts`, CLAUDE.md skyrius „Generating a full script“ (judesio taisyklės).

**Parašyti:**
- [ ] `server/agent/catalog.ts`: trumpas katalogas iš registrų pagal `theme.json` (FR-11)
- [ ] `src/agent/sceneSpec.ts`: Zod schema; `templateId` = `z.enum(leidžiami)` (FR-11)
- [ ] `server/agent/steps/layout.ts`
- [ ] `src/agent/compileProject.ts` (FR-12, FR-13) + **daug testų**
- [ ] Išteklių vietos (FR-22–FR-24): esamą REC vietą (`screen` + `checkpoint`) apibendrinti į REC / IMG / VID su `spec` ir `generationPrompt`; `scripts/checkProject.ts` atpažįsta visas tris; ataskaitoje gamybos planas

**Patikra:** sugeneruotas projektas atsidaro redaktoriuje; testas
`compile(x)` du kartus duoda lygiai tą patį (NFR-04); kiekvienas rezultatas
praeina `parseProject()` (NFR-05).

**Gynimo klausimai:** kodėl DI nerašo koordinačių? Kas nustato elemento
poziciją ir dydį? Kodėl kompiliatoriuje nėra DI?

---

## 7 žingsnis. Taisyklės ir taisymo ciklas (5–6 dienos)

**Tikslas:** projektas patikrinamas, o agentas pats pataiso pažeidimus.
**Išmoksiu:** sąsajos (`interface Rule`) ir polimorfizmas, DI įrankių naudojimas (tool use), ciklo sustojimo sąlygos.

**Pirma perskaityti:** `scripts/checkProject.ts`,
`layoutPresets.ts` (`visualOverflowWarning`, `layerOverflowWarning`),
`pacing.ts` (`pacingWarning`). Remotion Superpowers taisyklės (užrašams).

**Parašyti:**
- [ ] `src/agent/rules/types.ts` (`Rule`, `Violation`), `index.ts` (`runRules`)
- [ ] 3 taisyklės, apgaubiančios esamas funkcijas + 3 naujos (FR-14), po testą kiekvienai
- [ ] `scripts/checkProject.ts` perjungti į `runRules`
- [ ] `server/agent/steps/revise.ts` su `toolRunner` + `betaZodTool` (FR-16)

**Patikra:** projektas su sąmoningai per ilga antrašte → ciklas ją sutrumpina
ir pažeidimų sumažėja; žurnale matosi kiekvienas ratas.

**Gynimo klausimai:** kuo skiriasi taisyklė kodu ir DI vertinimas? Kada
ciklas sustoja ir kodėl būtinas limitas?

---

## 8 žingsnis. Kadrų nuotraukos ir vertinimas (3–4 dienos)

**Tikslas:** agentas „pamato“ kadrus ir pateikia pastabas.
**Išmoksiu:** `@remotion/renderer` (`bundle`, `selectComposition`, `renderStill`), vaizdų siuntimas DI.

**Pirma perskaityti:** `scripts/render-project.ts`, `server/renderJobs.ts`.

**Parašyti:**
- [ ] `npm install @remotion/renderer@4.0.290`
- [ ] `server/agent/stills.ts` (FR-15)
- [ ] `server/agent/steps/critique.ts`; pastabos jungiamos į taisymo ciklą

**Patikra:** `out/agent-runs/<id>/` atsiranda PNG; sąmoningai perkrautam
kadrui DI pateikia pastabą.

**Gynimo klausimai:** kodėl kadrai tikrinami prieš pilną atvaizdavimą? Kuo
tai geriau nei Remotion Superpowers peržiūra?

---

## 9 žingsnis. Ataskaita, progresas, įgarsinimas (3 dienos)

**Parašyti:**
- [ ] `src/editor/agent/AgentProgressPanel.tsx` (FR-20), `AgentReportPanel.tsx` (FR-18)
- [ ] Iškelti ElevenLabs logiką iš `server/trpc/voice.ts` į `server/voice/generate.ts`; agentas ją kviečia (FR-19)
- [ ] `agent.saveProposal` (FR-02)

**Patikra:** visas kelias iš UI: idėja → rezultatas redaktoriuje su ataskaita.

---

## 10 žingsnis. Testavimas ir matavimai (1 savaitė)

- [ ] Integraciniai testai su užfiksuotais DI atsakymais (`server/agent/__tests__/fixtures/`), be tinklo (NFR-09)
- [ ] 8–10 idėjų rinkinys `docs/bd/testines-ideros.md`; kiekviena paleidžiama su taisymo ciklu ir be jo
- [ ] Lentelė: pažeidimai prieš ir po, laikas, kaina, mano pataisų skaičius
- [ ] Funkcinių reikalavimų patikros lentelė (FR-01 … FR-21: ✓ / ✗ + kaip tikrinta)

---

## Laiko planas (orientacinis)

| Savaitė | Žingsniai |
|---|---|
| 1 | 0, 1, 2 |
| 2 | 3, 4 |
| 3 | 5, pradėti 6 |
| 4 | 6 |
| 5 | 7 |
| 6 | 8, 9 |
| 7 | 10 |
| 8 | Apraše likę skyriai, pristatymas |

Rašymą (analizė, reikalavimai, UML) daryti po truputį nuo 2 savaitės, ne
pabaigoje.

**Jei vėluoju:** 8 žingsnį supaprastinti (kadrai tik rodomi ataskaitoje, be DI
vertinimo). 6 ir 7 žingsnių neatsisakyti.
