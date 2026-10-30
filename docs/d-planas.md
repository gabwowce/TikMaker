# D. Agentas ir jo sąsaja – darbo planas

Vienintelis planas D daliai (agentui). Kiekvienas žingsnis turi dvi puses:
**S – serveris** (agento logika) ir **U – sąsaja** (ką naudotojas mato redaktoriuje),
ir jos daromos kartu, kad kiekvieną agento žingsnį iškart būtų galima pamatyti ekrane.
Šis failas pakeičia `docs/mano-planas.md` 3–9 žingsnius: ten liko „Išmoksiu“ ir gynimo
klausimai, čia – eiga, failai ir būsena.

## Kaip dirbame (kita sesija – skaityk pirmiausia)

- **Kodą rašo autorė pati**, ir serverio, ir sąsajos (BD darbas; turi mokėti paaiškinti
  kiekvieną eilutę). Claude: duoda kodą **mažomis dalimis** (vienas failas ar funkcija),
  prieš tai patikrina, kad jis kompiliuojasi (laikinai, paskui pašalina), paaiškina
  paprastai, be žargono, ir patikrina autorės rezultatą (`npx tsc --noEmit`, `npm test`).
  Kodą įrašyti pats tik tada, kai autorė aiškiai paprašo.
- Kalba – lietuvių; atsakymai trumpi, be ilgų sąrašų.
- Vienas žingsnis = vienas ar keli commitai. Commitai autorės vardu (`gabwowce`),
  **be jokių Claude žymių** (žr. `CLAUDE.md`). Pushinti tik paprašius.
- Pažymėti `[x]` šiame faile, kai žingsnio dalis baigta ir patikrinta.
- DI kvietimai – tik per `callStructured` (`server/agent/llm.ts`). Testuojama su
  **nemokamu Gemini** (`gemini-flash-lite-latest`, `AGENT_THINKING=minimal`):
  Flash modeliai nemokamame plane atsako per 110–145 s, Flash-Lite – per 4–8 s.
  Nemokamame plane Google gali naudoti užklausas – nesiųsti konfidencialių duomenų.
- „Įdėk, kas trūksta“ reiškia tik trūkstamus, jau aptartus failus. **Naują dalį** (naują
  failą ar funkciją) vis tiek duoti kodu ir paaiškinti – net jei ją reikėjo padaryti
  taisant klaidą. Jei Claude ką nors įrašė pats, kitą žinutę paaiškina tą kodą.

## Kita sesija pradeda nuo čia (2026-10-30)

- [x] **Pertvarka (2026-10-30):** `pipeline.ts` išskaidytas pagal „Kur kas guli“
  struktūrą: `agent.ts` + `steps/1-idea.ts`, `steps/2-angle.ts` + `prompts/pickTemplate.ts`
  + `job.ts`; `runs.startRun` → `step1Idea`. Elgsena ta pati, testai praeina. Autorė kodą
  matė ir patvirtino. Liko paaiškinti 2–8 punktus žemiau (1 punktas – nebeaktualus).

D4.3 Claude įrašė pats, autorė kodo negavo – **pirma paaiškinti jį eilutė po eilutės,
paprastai**, paskui tęsti D4.5. Commitas `733e2b8`. Paaiškinti, ką daro ir kodėl:
1. `server/agent/pipeline.ts` – visas: `continueRun` (darbas fone, klaidos įrašymas į
   failą), `advance` (kanalo paieška, žingsnis `created` → `picking_template` →
   `writing_hooks`), `aiStep` (būsena prieš kvietimą, žurnalo įrašas su laiku ir tokenais,
   nepavykęs kvietimas irgi įrašomas).
2. `server/trpc/agent.ts` – eilutė `continueRun(run)` po `startRun`.
3. `server/db.ts` – `writeOne`: rašymas per laikiną failą ir pervadinimas, kartojimas
   Windows EPERM/EBUSY atveju (kodėl: skydelis skaitė pusiau įrašytą failą).
4. `server/agent/llm.ts` – `agentModel()` kuria Gemini tiekėją kvietimo metu (kodėl:
   `server/index.ts` `.env.local` įkelia po importų, raktas buvo tuščias).
5. `server/config.ts` – `KNOWLEDGE_DIR` ir `TIKMAKER_KNOWLEDGE`.
6. `server/__tests__/agent.test.ts` – netikras modelis (`MockLanguageModelV4` per
   `vi.mock("@ai-sdk/google")`), `settled()` laukimas, du nauji testai.
7. `server/agent/steps/pickTemplate.ts` ir `server/agent/__tests__/pickTemplate.test.ts` –
   trumpai priminti (aptarta), parodyti du pakeitimus: AI vaidmuo ir „Face on camera“.
8. `src/editor/agent/AgentPanel.tsx` – klaidos eilutė virš formos;
   `IdeaForm.tsx` – varnelė „With face“ (`withFace`).

## Kas jau padaryta (2026-10-29)

| Kas | Kur |
|---|---|
| Žinių bazės schemos ir įkėlimas su klaidų keliais | `src/agent/knowledge.ts`, `server/agent/knowledge.ts` (`loadKnowledge`) |
| 20 šablonų, ~80 kabliukų, 20 CTA, 55 pavadinimų formulės, perėjimų frazės | `knowledge/shared/` (generuojama: `knowledge/draft/proposal.json` → `npm run knowledge:draft`) |
| 61 išdėstymo pavyzdys su tiksliomis dėžutėmis (x, y, w, h), fonu, teksto stiliumi | `knowledge/shared/layout-examples/`, kadrai `docs/bd/kadrai/geri/` |
| 6 dizaino taisyklės + jų patikra kodu | `knowledge/shared/design-rules.json`, `src/agent/rules/` (`runRules`) |
| DI kvietimas pagal Zod schemą (AI SDK v7) | `server/agent/llm.ts` (`callStructured`), `scripts/try-llm.ts` |
| Projekte nuorodos į žinių bazę | `VideoProject.workspaceId`, `videoTemplateId`; `Scene.layoutExampleId` |

Ko dar nėra: `knowledge/workspaces/` (kanalo aprašo ir stiliaus) – pirmą sukurti D4
pradžioje; blogų kadrų pavyzdžių; reveal / setup / problem kadrų po 1–3.

## Kur kas guli (agentas atskirai nuo platformos – NFR-08)

- **`src/agent/`** – tai, ką naudoja ir naršyklė, ir serveris: `knowledge.ts` (žinių bazės
  schemos), `agentRun.ts` (paleidimo schemos), `rules/` (taisyklės), vėliau
  `checkScript.ts`, `compileProject.ts`.
- **`server/agent/`** – tik serveryje: `llm.ts` (DI kvietimas), `knowledge.ts` (žinių
  bazės įkėlimas iš failų), `runs.ts` (paleidimų saugojimas). Agentas – trys lygiai,
  kaip knygoje (turinys → skyriai → sakiniai):
  ```
  agent.ts          TURINYS: visas agentas viename lape – kas po ko (switch pagal būseną)
  steps/
    1-idea.ts       forma → paleidimo failas (kviečia agent.start)
    2-angle.ts      šablonas → kabliukai → LAUKIA: naudotoja renkasi kabliuką
    3-script.ts     scenarijus → patikra → LAUKIA: patvirtinimo
    4-building.ts   išdėstymas → taisyklės → taisymas
    5-result.ts     įgarsinimas → ataskaita → done
  prompts/          ko tiksliai klausiam DI: pickTemplate.ts, writeHooks.ts…
  job.ts            aptarnavimas: job.save(...), job.ai(...) – laikas, tokenai, klaidos
  ```
  Naujas DI klausimas = failas `prompts/` + eilutė `job.ai(...)` savo žingsnyje.
  Žingsnis, kuris laukia naudotojos, baigiasi `awaiting_*`; jos atsakymą priima naujas
  endpoint'as `server/trpc/agent.ts`, kuris vėl kviečia `continueRun`.
- **`src/editor/agent/`** – sąsaja; **`src/api/agent.ts`** – sąsajos ryšys su serveriu.
- Paleidimas = **vienas failas** `db/agent-runs/<id>.json`: būsena perrašoma tame pačiame
  faile, o istorija kaupiasi jo `steps[]`; keli paleidimai – keli failai.

**Schemų pavyzdys (`src/agent/agentRun.ts`): vienas langas – vienas skyrius**, kiekviename
„ką agentas parodo“ ir „ką naudotojas atsako“. Skyrius pridedamas tame žingsnyje, kuriame
langas atsiranda (laukai priklauso nuo to, ką grąžina DI):

```
1 Idea      agentRunInputSchema                                         (D3)
2 Angle     templateChoiceSchema, hookOptionSchema + chooseHookInputSchema  (D4–D5)
3 Script    scriptSceneSchema + approve / revise / setSceneMedia            (D6)
4 Building  tik būsena ir žurnalas                                        (D7–D8)
5 Result    reportSchema                                                   (D10)
```

## Naudotojo kelias (UX) – agentas redaktoriaus viduje

Agentas **ne atskiras langas ar režimas**, o **AI skydelis** dešinėje, matomas ir
Storyboard, ir Scenes režimuose. Jis dirba **tame pačiame atidarytame projekte**:
scenarijus atsiranda Storyboard'e, išdėstymas – Scenes. Dizaino maketai (Claude Design,
2026-10-30): skydelis su eiga, „Run“ ir „Assets to make“ skirtukais, pokalbio laukas
su kontekstu apačioje, „Asset to make“ blokas scenos Content skiltyje.

**Skydelis:**
- Atidarytas – plotis **keičiamas tempiant kraštą** (įsimenamas, kaip laiko juostos
  aukštis `editorPrefs`); suskleidžiamas.
- Suskleistas – **vienas ✦ mygtukas** dešiniame krašte su skaičiumi (kiek liko įkelti /
  nepataisytų įspėjimų) ir eigos taškeliais (5 žingsniai). Jokių atskirų „upload“ ar
  „chat“ mygtukų – visa tai skydelio viduje.
- Viršuje – eiga Idea → Angle → Script → Building → Result (5 žingsniai, ne ekranai).
- Skirtukai: **Run** (šio projekto užduočių istorija: idėja, kabliukas, patvirtintas
  scenarijus, sudėliota, įspėjimai su „Go to scene“) ir **Assets to make** (ką įkelti,
  surikiuota pagal scenas; paspaudus – atidaroma scena).
- Apačioje – **pokalbio laukas su kontekstu**: pažymėta scena (Storyboard'e, scenų
  juostoje ar laiko juostoje) tampa kontekstu „Scene 3 · Benefit“ (ant scenos – ženkliukas
  „AI context“); keičiama tik ji. Konteksto nėra → keičiamas visas video.

**Kelias:**
```
Pradžia   „+ New“ → „With AI“: tuščias projektas, Storyboard, skydelyje forma
          (agentRunInputSchema)                                 → [Generate]  ← sprendimas 1
Angle     skydelyje: parinktas šablonas (įvertinimas, priežastis; < 3 – „nė vienas
          gerai netinka“; galima pakeisti) ir 3 kabliukų kortelės
                                                                → pasirinkti   ← sprendimas 2
Script    scenarijus atsiranda Storyboard'e (rolė, įgarsinimas, tekstas ekrane, ką
          rodyti); taisoma ranka ten pat arba komentaru skydelyje;
          scenoms su pasiūlytu įrašu – „Įrašysiu pati“ / „Padaryk be įrašo“
                                                                → [Approve]    ← sprendimas 3
Building  Scenes režime atsiranda išdėstymas; skydelyje eiga ir taisyklių įspėjimai
Result    įspėjimai su „Go to scene“, „Assets to make“, laikas, kaina
```

**Esami ir importuoti projektai** irgi redaguojami su DI: atidarai bet kurį projektą,
pažymi sceną ir rašai. Jei projektas neturi `videoTemplateId` ar scenų rolių, agentas
pirma jas nustato pagal tekstą.

**Ištekliai (savi įrašai, paveikslėliai):**
- Ar reikia savo įrašo, sprendžiama **scenarijaus žingsnyje** prie konkrečios scenos.
  „Tik judanti grafika“ – agentas iš karto planuoja scenas be įrašų.
- Kol kas tik **įkėlimas (Upload)**. „Generate“ (DI sugeneruotas paveikslėlis ar video)
  – vėliau, ne dabar.
- „Asset to make“ scenos Content skiltyje ir skydelio sąrašas – **vienas komponentas,
  vienas veiksmas** (ne dvi „Upload“ versijos). Laiko juostoje – eilutė „Media (missing)“.

**DI pakeitimai ir atšaukimas:** agentas serveryje apskaičiuoja pakeitimus, o
**redaktorius juos pritaiko atidarytam projektui** (Zustand), todėl AutoSave išsaugo kaip
įprastai ir niekas neperrašo vienas kito. DI pakeitimas atšaukiamas vienu žingsniu, bet
**su patvirtinimu** („Atšaukti DI pakeitimą (3 scena)?“); rankinis Ctrl+Z – kaip dabar.

**Užduotys ir projektas:** viena DI užduotis = vienas paleidimas (`db/agent-runs/`):
sukūrimas, „sutrumpink 3 sceną“, „pridėk CTA“ – atskiri paleidimai, susieti su projektu
(`projectId`). Skirtukas „Run“ rodo jų istoriją ir kainą.

**Įgarsinimas – ne DI.** Agentas tik parašo kiekvienos scenos tekstą (`vo`). Garsą
sukuria ElevenLabs per esamą `voice.generate` – tai daro **kodas**, kai įjungta
„Generuoti įgarsinimą“; kitaip įgarsinimą galima sugeneruoti redaktoriuje vėliau.

Skydelį galima suskleisti bet kada: paleidimas tęsiasi serveryje ir saugomas faile.

## Ką agentas gali keisti (DI įrankiai)

DI kadro nemato ir koordinačių nerašo: jis renkasi iš **aprašytų veiksmų** (įrankių), o
kodas kiekvieną patikrina ir pritaiko. Šaltiniai skirtingi:
- **`src/schema/capabilities.ts`** – ką TikMaker **moka nupiešti** (vaizdinių tipai,
  animacijos, fonai, šriftai). Agentas renkasi tik iš to.
- **`src/agent/tools.ts`** (naujas, D8) – ką agentas **gali pakeisti**: vienas Zod
  aprašas kiekvienam veiksmui. Tai ir yra „ką DI moka“ sąrašas – BD aprašui ir UI.

1 pakopa (D8): pakeisti tekstą, įgarsinimą, išdėstymą (kitas iš 61 pavyzdžio), vaizdinį,
trukmę, perėjimą; pridėti, pašalinti, suskaidyti sceną.
2 pakopa (jei liks laiko): sluoksnio keyframe'ai, elemento perkėlimas tarp scenų
(„carry“, `link.groupId`), garsai.

## DI tiekėjai

Modelis pasirenkamas `.env.local` (`callStructured` nesikeičia, keičiasi tik tiekėjas):
- **Gemini** (`@ai-sdk/google`, nemokamas planas) – numatytasis kūrimui ir testams.
- **Claude per API raktą** (`@ai-sdk/anthropic`) – antras tiekėjas palyginimui; galutinėje
  programoje (F) kiekvienas naudotojas įrašo **savo** raktą nustatymuose.
- **Claude Code per prenumeratą (Pro/Max limitai)** – tyrimo išvada 2026-10-30 (antriniai
  šaltiniai, oficialiai nepatvirtinta): Anthropic prenumeratos prisijungimo naudojimą
  kitose programose, įskaitant Agent SDK, laiko Consumer Terms pažeidimu, o trečiųjų
  šalių programos turi naudoti API raktus. Todėl **platinamai programai – ne**. Asmeniškai
  savo kompiuteryje egzistuoja bendruomenės `ai-sdk-provider-claude-code` (neoficialus),
  bet ir jis patenka į tą pačią ribą. Prieš bet kokį jungimą – patikrinti Anthropic
  Consumer Terms ir Agent SDK dokumentaciją; jei leidžiama, tai būtų vienas naujas
  tiekėjas `llm.ts`, be kito kodo keitimo.

**Paleidimo būsenos** (viena būsena = viena vieta lange; `awaiting_*` – laukia
naudotojo, ir tai lygiai du privalomi sprendimai po paleidimo):

```
created → picking_template → writing_hooks → awaiting_hook → writing_script → awaiting_approval
        → laying_out → checking → generating_voice (jei įjungta) → done

pakeistas šablonas:     awaiting_hook → writing_hooks (kabliukai iš naujo)
komentaras scenarijui:  awaiting_approval → writing_script (perrašo)
klaida bet kur:         → error (etapą galima paleisti iš naujo – NFR-06)
nutraukta:              → cancelled
```

- **Kabliukai** atsiranda iš žinių bazės formulių, kurios tinka parinktam šablonui
  (jo `hookTypes`): DI pagal jas parašo 3 kabliukus konkrečiai idėjai.
- **Netinka nė vienas šablonas** (geriausias < 3): kol kas tik parodoma „nė vienas
  gerai netinka“, naudojamas geriausias. Naujo šablono pasiūlymas (FR-05) ir jo
  įrašymas į žinių bazę (FR-02) – **vėlesnis etapas** (D12), kai visas srautas veiks.

---

## D3. Paleidimas fone + AI skydelio karkasas

**Tikslas:** iš AI skydelio paspaudus „Generate“, serveris sukuria paleidimą, išsaugo jį
faile, o skydelis rodo jo būseną ir atnaujina ją pats. DI dar nekviečiamas.

**Pirma perskaityti:** `server/renderJobs.ts`, `server/trpc/renders.ts`,
`src/editor/RenderButton.tsx` – lygiai tas pats principas (pradėti darbą → klausti būsenos).

S – serveris:
- [x] `src/agent/agentRun.ts`: `agentRunInputSchema` (idėja, `workspaceId`, trukmė,
  `motionOnly`, `generateVoice`), `agentRunStatusSchema` (būsenos aukščiau),
  `agentRunSchema` (`id`, `input`, `status`, `steps[]`, `createdAt`, `error?`)
- [x] `agentRunSchema` + `projectId` (paleidimas susietas su projektu); `listRuns(projectId)`
- [x] `server/agent/runs.ts`: `startRun(projectId, input)`, `getRun(id)`, `saveRun(run)`,
  `listRuns(projectId)` → `db/agent-runs/<id>.json`
- [x] `server/trpc/agent.ts`: `start`, `get`, `list`; `appRouter` → `agent`
- [x] testas `server/__tests__/agent.test.ts` (4 testai)

U – sąsaja (tikrinta 2026-10-30 naršyklėje; Mantine `Stepper` stilius įkeliamas
`src/editor/styles.css` – be jo rodoma be stiliaus):
- [x] `src/api/agent.ts` – `useStartRun()`, `useAgentRun(id)` su `refetchInterval`
  (kaip `RenderButton`), `useAgentRuns(projectId)`, `useLatestRun(projectId)`
  (naujausias paleidimas + ar agentas dar dirba; jį skaito ir skydelis, ir juosta)
- [x] `src/editor/usePanelResize.ts` – bendras skydelio dydžio keitimas tempiant kraštą
  (laiko juosta ir AI skydelis)
- [x] `src/editor/agent/AgentPanel.tsx` – skydelis dešinėje abiejuose režimuose
  (`Editor.tsx`), keičiamo pločio, suskleidžiamas; būsena – `editorPrefs`
  (`agentPanelOpen`, `agentPanelWidth`). Turinys pagal **projektą**, ne istoriją:
  agentas dirba → eiga; nėra scenų → forma; yra scenų → redagavimas (D8)
- [x] `src/editor/agent/AgentRail.tsx` – suskleista juosta: ✦ ir eigos taškeliai, kol
  agentas dirba. Skaičius ant ✦ – D8–D9 (kai bus ką skaičiuoti)
- [x] `src/editor/agent/IdeaForm.tsx` – idėja, trukmė, „Generuoti įgarsinimą“;
  tikrinama ta pačia `agentRunInputSchema`. Kanalas kol kas visada `dev`
- [x] `src/editor/agent/RunProgress.tsx` – eiga (`Stepper`, 5–6 žingsniai pagal
  `status`; `runRoad` bendras su juostos taškeliais)

**Patikra:** skydelyje įrašai idėją → „Generate“ → `db/agent-runs/` atsiranda failas,
skydelis rodo `created`; suskleidus, perkrovus puslapį ir išskleidus – tas pats paleidimas.

## D4. Šablono parinkimas („2 Angle“, pirma pusė)

**Tikslas:** agentas parenka šabloną ir paaiškina kodėl; naudotojas gali pakeisti.

S – serveris:
- [x] pirmas kanalas `knowledge/workspaces/dev/workspace.json` + `style.json`;
  „su veidu“ – ne kanalo, o idėjos formos varnelė (`input.withFace`, `docs/bd/sprendimai.md`)
- [x] `templateChoiceSchema` + `run.template` (`src/agent/agentRun.ts`)
- [x] `server/agent/steps/pickTemplate.ts`: į promptą tik šablonų `id`, `name`,
  `oneLine`, `whenToUse` (ne visas šablonas – pigiau); atsakymas
  `{ videoTemplateId, score 1–5, reason }`; kodas patikrina, kad id egzistuoja (FR-04);
  jei geriausias < 3 – pažymėti „netinka“ (`MIN_FIT_SCORE`); testai su netikru DI ir su
  Gemini (tik su raktu)
- [x] `server/agent/pipeline.ts` (`continueRun`, kviečia `agent.start`): žingsnis fone, būsena
  `picking_template` → `writing_hooks` (ten laukia D5); kiekvienas DI kvietimas įrašomas į
  `steps[]` su tokenais ir laiku, ir nepavykęs (FR-21); klaida → `error` su priežastimi.
  `writeOne` rašo per laikiną failą (skydelis nebeperskaito pusiau įrašyto);
  `llm.ts` raktą skaito tik kvietimo metu (serveris `.env.local` įkelia vėliau);
  `KNOWLEDGE_DIR` (`TIKMAKER_KNOWLEDGE` testams). Patikrinta: 1,5 s, 1614 / 57 tokenų

U – sąsaja:
- [ ] skydelio „Run“ skirtuke: parinktas šablonas (pavadinimas, `oneLine`, įvertinimas,
  priežastis) ir „Pakeisti“ (sąrašas iš `agent.templates`)

**Patikra:** 3 skirtingoms idėjoms parenkami prasmingi šablonai; paleidimo faile
matosi tokenai ir laikas.

## D5. Kabliukai („2 Angle“, antra pusė)

S – serveris:
- [ ] `server/agent/steps/hooks.ts`: 3 variantai; į promptą tik šablonui tinkančios
  kabliukų formulės (`hookTypes`); kodas patikrina „bent 2 iš bazės formulių“ (FR-06)
- [ ] būsena `awaiting_hook`; `agent.chooseHook({ runId, hookIndex | text })` (FR-07)

U – sąsaja:
- [ ] skydelyje 3 kabliukų kortelės (tekstas, formulė, įvertinimas) + „Savas tekstas“;
  pasirinktas įrašomas į 1 sceną, agentas tęsia

**Patikra:** be pasirinkimo scenarijus nerašomas; pasirinkus – būsena juda toliau.

## D6. Scenarijus („3 Script“)

S – serveris:
- [ ] `server/agent/steps/script.ts`: scenos pagal šablono scenas; `optional` scenas
  (įskaitant `hook`, `cta`) agentas įtraukia ar praleidžia pagal idėją ir užrašo
  priežastį (FR-08); prie scenų, kurioms geriausiai tiktų tikras įrašas, pažymi
  `media: "suggest-recording"` (išskyrus kai `motionOnly`)
- [ ] `agent.setSceneMedia({ runId, sceneIndex, choice: "record" | "motion" })`
  („generate“ – vėliau)
- [ ] scenarijus taikomas **atidarytam projektui** (Storyboard): `storyPlan`, scenos su
  `plan`, `vo`, tekstu ekrane – per projekto store, ne tiesiai į failą
- [ ] `src/agent/checkScript.ts` + testai: visos privalomos rolės, trukmė ne daugiau
  kaip +15 % nuo tikslinės, žodžiai ekrane pagal `design-rules.json` (FR-09)
- [ ] `agent.approveScript`, `agent.reviseScript({ comment })` (FR-10)

U – sąsaja:
- [ ] scenarijus matomas **Storyboard'e** (esamas `ProjectStoryboardView`); prie scenų su
  pasiūlytu įrašu – „Įrašysiu pati“ / „Padaryk be įrašo“; patikros pastabos prie scenų;
  skydelyje „Approve“ ir komentaras → perrašyti; rankinis taisymas – Storyboard'e

**Patikra:** visas kelias iki patvirtinto scenarijaus veikia naršyklėje.

## D7. Išdėstymas ir kompiliatorius („4 Building“) – svarbiausias

**Tikslas:** iš patvirtinto scenarijaus – projektas, kuris atsidaro redaktoriuje.

S – serveris:
- [ ] `server/agent/steps/layout.ts`: kiekvienai scenai į promptą 3–5 tos rolės
  `layout-examples` (be paveikslėlių); agentas pasirenka pavyzdį ir TikMaker vaizdinius
  tik iš leidžiamų (`capabilities.ts`, FR-11); taisyklė „tas pats išdėstymas ne dviejose
  scenose iš eilės“
- [ ] `src/agent/compileProject.ts` + **daug testų**: pavyzdžio dėžutės → sluoksnių
  `x`/`y`, auto-fit (`fitPositionedVisual`), teksto `size`/`pill`/`effects` →
  `richHeadline`, `captionsY` → `captions.y`, judesio taisyklės iš `CLAUDE.md`;
  deterministinis (NFR-04), rezultatas praeina `parseProject()` (NFR-05);
  `layoutExampleId` įrašomas scenai
- [ ] išteklių vietos REC / IMG / VID su aprašu ir generavimo promptu (FR-13, FR-22)

U – sąsaja:
- [ ] skydelyje eiga (kuri scena dėliojama); išdėstymas taikomas atidarytam projektui ir
  matomas **Scenes** režime
- [ ] „Asset to make“ – vienas komponentas scenos Content skiltyje ir skydelio „Assets to
  make“ skirtuke (tik Upload); laiko juostoje eilutė „Media (missing)“

**Patikra:** sugeneruotas projektas atsidaro redaktoriuje ir groja.

## D8. Taisyklės ir taisymo ciklas

`src/agent/rules/` (6 taisyklės, `runRules`) jau yra.

S – serveris:
- [ ] `scripts/checkProject.ts` papildyti `runRules` rezultatais
- [ ] `src/agent/tools.ts`: DI įrankių Zod aprašai (1 pakopa – žr. „Ką agentas gali
  keisti“); kodas kiekvieną patikrina ir paverčia projekto pakeitimu
- [ ] `server/agent/steps/revise.ts`: tais įrankiais taiso pažeidimus; ciklas iki 3 ratų
  arba kol pažeidimų nebemažėja (FR-16)
- [ ] taškinis taisymas pagal prašymą tekstu (pvz. „pridėk CTA“): keičiama tik tai,
  ko prašoma; nauja scena imama iš šablono (`videoTemplateId`)

U – sąsaja:
- [ ] skydelyje įspėjimai su „Go to scene“; pokalbio laukas su kontekstu (pažymėta scena,
  ženkliukas „AI context“); DI pakeitimo atšaukimas su patvirtinimu

**Patikra:** sąmoningai per ilga antraštė → ciklas ją sutrumpina; „pridėk CTA“ →
gale viena `cta` scena, kitos nepakitusios.

## D9. Kadrų vertinimas (nebūtinas, jei trūksta laiko)

- [ ] S: `server/agent/stills.ts` (`@remotion/renderer` `renderStill`), `steps/critique.ts`
- [ ] U: kadrų miniatiūros ataskaitoje su DI pastabomis

## D10. Įgarsinimas, ataskaita, rezultatas („5 Result“)

- [ ] S: ElevenLabs logiką iškelti į `server/voice/generate.ts`; ją kviečia **kodas**
  (ne DI) su scenų `vo` tekstais, tik kai įjungta „Generuoti įgarsinimą“, būsena
  `generating_voice`, po sudėto projekto (FR-19 – brangu, todėl pabaigoje)
- [ ] S: ataskaita: ištaisyti ir likę pažeidimai, laikas, kaina (FR-18, FR-21)
- [ ] U: skydelio „Run“ skirtuke – ataskaita (įspėjimai, laikas, kaina); „Assets to make“

## D11. Testavimas (BD 4 skyrius)

`docs/mano-planas.md` 10 žingsnis: užfiksuoti DI atsakymai be tinklo (NFR-09),
8–10 testinių idėjų su taisymo ciklu ir be jo, lentelė (pažeidimai prieš/po, laikas,
kaina), FR patikros lentelė.

## D12. Vėliau, jei spėsim (FR-05, FR-02)

Daroma tik kai D3–D11 veikia nuo idėjos iki video.
- [ ] S: `server/agent/steps/proposeTemplate.ts` – kai geriausias < 3, DI sukuria naują
  šabloną (`videoTemplateSchema`), skydelyje pažymėtą „agento pasiūlytas“ (FR-05)
- [ ] S + U: `agent.saveProposal` – pasiūlytą šabloną ar formulę įrašyti į žinių bazę (FR-02)

## Atmintis: projektas, ne pokalbis

Agentas **nesiunčia ankstesnių užduočių ar pokalbio**. Jo atmintis – dabartinis
projektas (`storyPlan`, `videoTemplateId`, scenų `plan.role`, tekstai), todėl jis visada
mato ir rankinius pakeitimus. Kiekviena užklausa = instrukcijos (nuolatinės, podėlyje) +
video santrauka (idėja, šablonas, scenos po eilutę) + pažymėta scena pilnai + prašymas.
Atsakymas – tik veiksmas (`tools.ts`), ne visas projektas. Todėl kaina priklauso nuo
projekto dydžio, ne nuo istorijos ilgio. `db/agent-runs/` – istorija naudotojui
(kas daryta, kaina, atšaukimas), ne DI.

## Kaina ir laikas (visam keliui)

Pigus modelis pagal nutylėjimą, mąstymas išjungtas; į promptą tik tai, ko reikia
žingsniui; nuolatinė prompto dalis pradžioje (podėlis); ką gali kodas – daro kodas;
taškinis taisymas vietoj perkūrimo; ElevenLabs ir kadrų vertinimas – tik pabaigoje;
kiekvieno paleidimo tokenai ir laikas – `steps[]` (FR-21). Tikslai: NFR-01 ≤ 5 min,
NFR-02 ≤ 1 USD.
