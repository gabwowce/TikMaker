# Kaip įgyvendinsime: FR/NFR → kodas (darbinis, ne ataskaitai)

Trys šaltiniai kiekvienam reikalavimui:
- **TikMaker** — kas jau yra ir perpanaudojama (nerašom iš naujo);
- **Open-source** — iš ko imam idėją / taisykles / įrankį (kodo nekopijuojam, cituojam);
- **Nauja** — ką rašom patys (tai ir yra BD indėlis, skaičiuojasi į 2000 eilučių).

## 1. Open-source: kur tiksliai panaudojam

| Projektas | Kur | Ką konkrečiai | Kaip |
|---|---|---|---|
| **Remotion Agent Skills** | visam darbui (kūrimo įrankis) | Claude Code rašo teisingesnį Remotion kodą (`renderStill`, kompozicijos) | `npx skills add remotion-dev/skills` repo šaknyje, vieną kartą. Į agentą neįeina. Apraše → „DI įrankių naudojimas“ |
| **chuk-motion** (Apache 2.0) | FR-11, NFR-12 | 1) Katalogo „discovery“ modelis: agentas gauna trumpą sąrašą, o pilną komponento schemą užklausia įrankiu `get_component_schema(id)` — mažiau tokenų. 2) Saugių paraščių žetonai pagal platformą. 3) Temų struktūra (kas tema apima) | Perskaityti jų README + temų/žetonų failus, išsirašyti struktūrą, parašyti savo TS versiją. Cituoti Apraše |
| **Remotion Superpowers** (MIT) | FR-14, FR-16 | Jų 18 „production rules“ — kandidatai į mūsų taisyklių sąrašą (perskaityt, atsirinkt tas, kurias galima matuoti kodu). Jų `/review-video` ciklo struktūra kaip palyginimas (render → feedback → fix) | Perskaityti `skills/` aplanką, išsirašyti taisykles į `knowledge/rules-candidates.md` su nuoroda. Apraše: „taisyklių šaltiniai“ |
| **short-video-maker** (MIT) | FR-13 (ateičiai) | Pexels paieška pagal scenos `searchTerms` | **Neimplementuojam** BD metu. Išvadose → plėtra antrai temai |
| **Remotion** (jau naudojamas) | FR-15 | `@remotion/renderer` `bundle()` + `selectComposition()` + `renderStill()` | Oficiali biblioteka, ne kopija — trečiųjų šalių komponentas, leidžiamas |

Ko **neimam**: Creatomate/Shotstack (mokama išorinė atvaizdavimo API — pakeistų esminę dalį), Descript API.

## 2. Kiekvienas FR: kaip įgyvendinam

### Žinių bazė

**FR-01 Įkėlimas ir validacija**
- Nauja: `src/schema/knowledge.ts` (Zod: `themeSchema`, `templateSchema`, `hookSchema`, `designRefSchema`); `server/agent/knowledge.ts` — `loadKnowledge()` skaito `knowledge/**`, validuoja, grąžina `{ data, errors[] }` (klaida = failas + `zodError.issues[].path`).
- TikMaker: `server/trpc/jsonFile.ts` rodo, kaip skaitom JSON; Zod jau visur.
- Testas: blogas failas → klaida su keliu.

**FR-02 Pasiūlymo išsaugojimas**
- Nauja: tRPC `agent.saveProposal({ kind, data })` → rašo `knowledge/themes/<t>/templates/<id>.json` per tą pačią schemą.
- TikMaker: `collectionRouter` modelis (rašymas į failą).

### Paleidimas, šablonas

**FR-03 Paleidimo forma**
- Nauja: `src/editor/agent/NewAgentRunDialog.tsx` (Mantine `Modal`, `Select`, `Textarea`, `NumberInput`, `Checkbox`); tRPC `agent.start(input)` → `runId`.
- Nauja: `src/schema/agentRun.ts` (`agentRunInputSchema`, `agentRunSchema` su `status` ir `steps[]`).
- TikMaker: dialogų pavyzdys `ImportJsonDialog.tsx`; fono darbų modelis `server/renderJobs.ts` (`startRender`/`getRenderJob`) — kopijuojam **šabloną** į `server/agent/runs.ts`.

**FR-04 / FR-05 Šablono parinkimas / pasiūlymas**
- Nauja: `server/agent/steps/pickTemplate.ts` — `client.messages.parse()` + `zodOutputFormat({ templateId | null, score 1–5, reason, proposed? })`. Prompt'e tik `id + name + whenToUse` (trumpas sąrašas).
- Logika kode: `score < 3` arba `templateId === null` → naudojam `proposed` su žyma `source: "agent"`.

### Įtraukianti pradžia

**FR-06 3 variantai**
- Nauja: `steps/hooks.ts` — į prompt'ą tik formulės, kurių `type ∈ template.hookTypes` ir `themes` turi temą. Išvestis `{ variants: [{ text, hookId | null, score }] }` (3 vnt).
- Kodo patikra: `variants.filter(v => v.hookId).length >= 2`, žodžių ≤ `hook.maxWords`; jei ne — vienas pakartojimas su klaidos tekstu.

**FR-07 Pasirinkimas**
- Nauja: `src/editor/agent/HookPicker.tsx` (3 kortelės + „savo tekstas“); tRPC `agent.chooseHook(runId, text)`. Run'as laukia būsenoje `awaiting_hook`.

### Scenarijus

**FR-08 Generavimas**
- Nauja: `steps/script.ts` (žr. ankstesnį pavyzdį) — `system` = `brief.md` + bendros taisyklės, **cache_control** ant `system` (NFR-02).
- TikMaker: `scene.plan` (`role`, `purpose`, `visualBrief`) jau schemoje — rašom tiesiai į jį.

**FR-09 Scenarijaus patikra**
- Nauja: `src/agent/checkScript.ts` (grynos funkcijos).
- TikMaker: `voDurationSeconds()` iš `src/utils/pacing.ts` trukmei — **neperskaičiuojam patys**.

**FR-10 Patvirtinimas / komentaras**
- TikMaker: **Storyboard režimas** (`src/editor/storyboard/ProjectStoryboardView.tsx`) jau redaguoja `plan`, `vo`, tekstą.
- Nauja: `src/editor/agent/AgentScriptBar.tsx` — juosta Storyboard viršuje (pastabos, komentaro laukas, „Perrašyti“, „Tvirtinu →“); tRPC `agent.reviseScript(runId, comment)`, `agent.approveScript(runId, editedScript)`.

### Kadrų dėliojimas

**FR-11 Komponentų parinkimas**
- Nauja: `server/agent/catalog.ts` — iš `sceneRegistry`, `visualTemplateRegistry`, `layoutIds`, `assets.generated` sugeneruoja trumpą katalogą, filtruotą `theme.allowedScenes/allowedVisualTemplates`.
- Open-source (chuk-motion idėja): įrankis `get_template_fields(id)` — pilni laukai tik pasirinktiems.
- Nauja: `src/agent/sceneSpec.ts` (Zod) — `templateId` yra `z.enum(leidžiamų id)`, sukonstruotas runtime iš temos → neleidžiamas id **neįmanomas** schemos lygiu.
- Nauja: `steps/layout.ts`.

**FR-12 Kompiliatorius**
- Nauja: `src/agent/compileProject.ts` (+ testai). Didžiausias savas modulis.
- TikMaker perpanaudojam: `layoutPresets` + `fitPositionedVisual()` (pozicija/dydis), `parseProject()` (galutinė normalizacija), `visualTemplateRegistry[].visual` (preset'o `VisualConfig` kaip pradinis taškas, laukus perrašom iš spec), CLAUDE.md judesio taisyklės (perėjimų ciklas, `entrance: "none"`, stagger 4/6, sfx `"none"` ne svarbiose scenose).
- Svarbu: kompiliatorius — **leaf** modulis, jokių React importų (CLAUDE.md „Keep leaf modules leaf“).

**FR-13 REC placeholder'iai**
- TikMaker: formatas jau aprašytas `tiktok-video` skill'e (`screen` + `checkpoint` `label: "REC …"`). Kompiliatorius jį įterpia, kai `needsRecording`.

### Patikra, taisymas

**FR-14 Taisyklės**
- Nauja: `src/agent/rules/` — `Rule` interfeisas, `runRules()`, po failą taisyklei.
- TikMaker perpanaudojam (apgaubiam į `Rule`):
  - saugi zona → `visualOverflowWarning()` / `layerOverflowWarning()` (`layoutPresets.ts`);
  - per trumpa scena → `pacingWarning()` (`pacing.ts`);
  - dev teksto ilgis → `MAX_LINE_CHARS` (`devText.ts`).
- Naujos: žodžiai ekrane, bendra trukmė (`computeSceneTimings`), vienodos gretimos scenos, sfx kiekis.
- Open-source: kandidatai iš Remotion Superpowers taisyklių.
- Po to: `scripts/checkProject.ts` perrašyti, kad kviestų `runRules()` (viena patikros vieta).

**FR-15 Kadrų nuotraukos + vertinimas**
- Nauja: `server/agent/stills.ts` — `bundle()` vieną kartą run'ui (kešuoti), kiekvienai scenai `renderStill({ frame: from + entranceEnd })` → PNG `out/agent-runs/<runId>/scene-N.png`.
- TikMaker: tas pats composition id ir props mechanizmas kaip `server/renderJobs.ts` / `scripts/render-project.ts`.
- Nauja: `steps/critique.ts` — vaizdai base64 + `brief.md` + 4–6 `design/*.png` pavyzdžiai + rubrika → `zodOutputFormat({ critiques: [...] })`.

**FR-16 Taisymo ciklas**
- Nauja: `steps/revise.ts` — `client.beta.messages.toolRunner()` + `betaZodTool` įrankiai, kurie keičia `specs[]` (ne projektą). Išorinis `for` ciklas: compile → rules → (critique) → revise; sustojimo sąlygos kode.

### Rezultatas

**FR-17 Projektas redaktoriuje**
- TikMaker: `projects` collectionRouter (`db/projects/`) + `parseProject`; redaktorius atidaro esamu būdu. Nauja: tik `projectStore` iškvietimas atidaryti `projectId` po run'o.

**FR-18 Ataskaita**
- Nauja: `src/editor/agent/AgentReportPanel.tsx`; paspaudus → `selectScene(sceneId)` (jau yra `projectStore`).

**FR-19 Įgarsinimas**
- TikMaker: ElevenLabs logika `server/trpc/voice.ts` `generate`. **Nedidelis refaktoringas**: ištraukti į funkciją `generateVoice(text, settings)` (`server/voice/generate.ts`), kad kviestų ir tRPC, ir agentas. Klipų išdėstymas — `src/utils/voiceClips.ts`; subtitrai — automatiškai (`CaptionLayer`).

**FR-20 Progresas**
- Nauja: `AgentProgressPanel.tsx`; TanStack Query `refetchInterval: 1000` ant `agent.get` (kaip `RenderButton.tsx` poll'ina `renders.get`).

**FR-21 Žurnalas**
- Nauja: `server/agent/llm.ts` apvalkalas registruoja kiekvieną kvietimą (`usage.input_tokens`, `cache_read_input_tokens`, `output_tokens`, trukmė); `db/agent-runs/<id>.json` per `collectionRouter("agent-runs", agentRunSchema)`.

## 3. NFR: kaip užtikrinam

| NFR | Kaip |
|---|---|
| 01 Laikas ≤5 min | 1 kvietimas etapui; `bundle()` kešas; vizualinė kritika tik 1-ame ir paskutiniame rate |
| 02 Kaina ≤1 USD | `cache_control` ant `system` (brief + taisyklės + katalogas); trumpas katalogas; balsas tik pabaigoje |
| 03 Validacija | `messages.parse` + `zodOutputFormat`; `llm.ts` → jei `parsed_output == null` arba kodo patikra krenta: ≤2 pakartojimai su klaidos tekstu |
| 04 Determinizmas | Kompiliatoriuje id iš indeksų (`scene-${i}`), ne `random`; testas `compile(x) deepEqual compile(x)` |
| 05 Suderinamumas | Kiekvienas rezultatas per `parseProject()`; testas visiems testiniams run'ams |
| 06 Atsparumas | Run'o būsena rašoma į failą po kiekvieno etapo; `agent.retryStep(runId)` tęsia nuo paskutinio sėkmingo |
| 07 Plečiamumas | Temos = `knowledge/` failai; taisyklės = `Rule` masyvas |
| 08 Moduliškumas | Visas agentas: `server/agent/**`, `src/agent/**`, `src/schema/knowledge.ts`, `src/schema/agentRun.ts`, `src/editor/agent/**`, `knowledge/**` |
| 09 Testai | `src/agent/__tests__/` (compile, rules, checkScript); `server/agent/__tests__/` — `llm.ts` priima `client` parametrą → testuose mock'as su `fixtures/*.json` |
| 10 Raktai | `ANTHROPIC_API_KEY` tik `.env.local` (jau `.gitignore`?) — **patikrinti**; klientas kuriamas tik `server/` |
| 11 ≤3 sprendimai | UI eiga: forma → kabliukas → patvirtinimas |
| 12 Konfigūracija | `db/agent-settings.json` (modelis, effort, max rounds) + `theme.rules` |
| 13 Aplinka | README skyrius „AI agentas“ |

## 4. Darbų eilė (ką daryti pirmiausia)

1. `npx skills add remotion-dev/skills`; perskaityti chuk-motion temų/žetonų struktūrą ir Superpowers taisykles → užrašai `knowledge/rules-candidates.md`.
2. Schemos: `knowledge.ts`, `agentRun.ts`, `sceneSpec.ts` + `knowledge/themes/dev/` (1 tema, 2 šablonai, 5 kabliukai).
3. `llm.ts` + `runs.ts` + tRPC `agent.start/get` (be UI, testuoti per skriptą).
4. pickTemplate → hooks → script → checkScript (+ testai).
5. UI: dialogas, HookPicker, AgentScriptBar.
6. catalog → layout → **compileProject (+ testai)**.
7. rules (+ testai) → revise ciklas.
8. stills → critique.
9. Ataskaita, progresas, voice refaktoringas.
10. Testinis idėjų rinkinys, matavimai.

Kiekvienas žingsnis = atskiras commit'as su aiškia žinute (git istorija = indėlio įrodymas).
