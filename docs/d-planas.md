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
  bazės įkėlimas iš failų), `runs.ts` (paleidimų saugojimas), vėliau `steps/` (agento
  žingsniai).
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

## Naudotojo kelias (UX)

Redaktoriaus įrankių juostoje – mygtukas **„New video with AI“**. Jis atidaro langą su
5 žingsniais (`docs/bd/sprendimai.md`, „Naudotojo sąsaja“). Naudotojas priima tik
**3 privalomus sprendimus** (NFR-11): paleisti, pasirinkti kabliuką, patvirtinti scenarijų.

```
1 Idea      idėja (20–500 simb.), kanalas, trukmė (15–90 s, numatyta 40),
            „Tik judanti grafika“ (nebūtinas), „Generuoti įgarsinimą“  → [Start]   ← sprendimas 1
2 Angle     parinktas šablonas su įvertinimu 1–5 ir paaiškinimu; jei < 3 – agento pasiūlytas
            naujas šablonas, aiškiai pažymėtas (FR-05); šabloną galima pakeisti → kabliukai
            perrašomi; 3 kabliukai su formule ir įvertinimu arba savas tekstas
                                                                       → [Use this hook] ← sprendimas 2
3 Script    scenarijus scenomis: rolė, įgarsinimas, tekstas ekrane, vaizdo aprašas;
            prie scenų, kurioms geriausiai tiktų tikras įrašas – pasirinkimas:
            „Įrašysiu pati“ (REC vieta su aprašu) / „Padaryk be įrašo“ (maketai, ikonos,
            tekstas, judesys) / „Sugeneruok“ (IMG/VID vieta su promptu, FR-22)
            [Approve] / redaguoti / komentaras → perrašyti               ← sprendimas 3
4 Building  eiga: išdėstymas → projektas → taisyklės → taisymas (ratai) → įgarsinimas,
            be naudotojo
5 Result    projektas atsidaro redaktoriuje; ataskaita: likę įspėjimai (paspaudus –
            pažymima scena), [Taisyti su DI], išteklių sąrašas, laikas, kaina
```

Ar reikia savų įrašų, sprendžiama **scenarijaus žingsnyje** prie konkrečios scenos, ne
pradžioje: prieš scenarijų to dar nežinoma. „Tik judanti grafika“ – greitas kelias:
agentas iš karto planuoja visas scenas be įrašų ir nieko neklausia.

**Įgarsinimas – ne DI.** Agentas tik parašo kiekvienos scenos tekstą (`vo`). Garsą
sukuria ElevenLabs per esamą `voice.generate` – tai daro **kodas**, kai įjungta
„Generuoti įgarsinimą“; kitaip įgarsinimą galima sugeneruoti redaktoriuje vėliau.

Langą galima uždaryti bet kada: paleidimas tęsiasi serveryje ir saugomas faile, o
atidarius vėl rodoma ta pati vieta (paleidimas fone, D3).

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
- **Netinka nė vienas šablonas** (geriausias < 3): tas pats `picking_template`, tik
  rezultatas pažymėtas kaip agento pasiūlytas šablonas (FR-05); vėliau jį galima
  įrašyti į žinių bazę (FR-02).

---

## D3. Paleidimas fone + sąsajos karkasas

**Tikslas:** paspaudus „Start“, serveris sukuria paleidimą, išsaugo jį faile, o langas
rodo jo būseną ir atnaujina ją pats. DI dar nekviečiamas.

**Pirma perskaityti:** `server/renderJobs.ts`, `server/trpc/renders.ts`,
`src/editor/RenderButton.tsx` – lygiai tas pats principas (pradėti darbą → klausti būsenos).

S – serveris:
- [ ] `src/agent/agentRun.ts`: `agentRunInputSchema` (idėja, `workspaceId`, trukmė,
  `motionOnly`, `generateVoice`), `agentRunStatusSchema` (būsenos aukščiau),
  `agentRunSchema` (`id`, `input`, `status`, `steps[]`, `createdAt`, `error?`)
- [ ] `server/agent/runs.ts`: `startRun(input)`, `getRun(id)`, `saveRun(run)` →
  `db/agent-runs/<id>.json` (per `server/db.ts` `readAll`/`writeOne`)
- [ ] `server/trpc/agent.ts`: `start` (mutation), `get` (query), `list` (query);
  pridėti į `appRouter` (`server/trpc/router.ts`)
- [ ] testas `server/__tests__/` (kaip `api.test.ts`): `start` sukuria failą, `get` jį grąžina

U – sąsaja:
- [ ] `src/editor/agent/NewVideoButton.tsx` – mygtukas įrankių juostoje
  (`EditorToolbar.tsx`, šalia `RenderButton`)
- [ ] `src/editor/agent/AgentRunDialog.tsx` – langas su 5 žingsnių juosta; kol kas
  veikia tik „1 Idea“ (forma) ir būsenos rodymas
- [ ] `src/api/agent.ts` – `useStartRun()`, `useAgentRun(id)` su `refetchInterval`
  (kaip `RenderButton`), kol būsena ne `done`/`error`/`awaiting_*`

**Patikra:** įrašai idėją → „Start“ → `db/agent-runs/` atsiranda failas, langas rodo
`created`; uždarius ir vėl atidarius langą rodomas tas pats paleidimas.

## D4. Šablono parinkimas („2 Angle“, pirma pusė)

**Tikslas:** agentas parenka šabloną ir paaiškina kodėl; naudotojas gali pakeisti.

S – serveris:
- [ ] pirmas kanalas `knowledge/workspaces/dev/workspace.json` + `style.json`
- [ ] `server/agent/steps/pickTemplate.ts`: į promptą tik šablonų `id`, `name`,
  `oneLine`, `whenToUse` (ne visas šablonas – pigiau); atsakymas
  `{ videoTemplateId, score 1–5, reason }`; kodas patikrina, kad id egzistuoja (FR-04);
  jei geriausias < 3 – pažymėti „netinka“ (FR-05 – naujo šablono pasiūlymas vėliau)
- [ ] `runs.ts`: po `start` paleisti žingsnį fone, būsena `picking_template` → kitas
  žingsnis; kiekvienas DI kvietimas įrašomas į `steps[]` su tokenais ir laiku (FR-21)

U – sąsaja:
- [ ] „2 Angle“: parinktas šablonas (pavadinimas, `oneLine`, įvertinimas, priežastis)
  ir „Pakeisti“ (sąrašas iš `knowledge.list` arba `agent.templates`)

**Patikra:** 3 skirtingoms idėjoms parenkami prasmingi šablonai; paleidimo faile
matosi tokenai ir laikas.

## D5. Kabliukai („2 Angle“, antra pusė)

S – serveris:
- [ ] `server/agent/steps/hooks.ts`: 3 variantai; į promptą tik šablonui tinkančios
  kabliukų formulės (`hookTypes`); kodas patikrina „bent 2 iš bazės formulių“ (FR-06)
- [ ] būsena `awaiting_hook`; `agent.chooseHook({ runId, hookIndex | text })` (FR-07)

U – sąsaja:
- [ ] 3 kabliukų kortelės (tekstas, formulė, įvertinimas) + „Savas tekstas“;
  pasirinkus – agentas tęsia

**Patikra:** be pasirinkimo scenarijus nerašomas; pasirinkus – būsena juda toliau.

## D6. Scenarijus („3 Script“)

S – serveris:
- [ ] `server/agent/steps/script.ts`: scenos pagal šablono scenas; `optional` scenas
  (įskaitant `hook`, `cta`) agentas įtraukia ar praleidžia pagal idėją ir užrašo
  priežastį (FR-08); prie scenų, kurioms geriausiai tiktų tikras įrašas, pažymi
  `media: "suggest-recording"` (išskyrus kai `motionOnly`)
- [ ] `agent.setSceneMedia({ runId, sceneIndex, choice: "record" | "motion" | "generate" })`
- [ ] `src/agent/checkScript.ts` + testai: visos privalomos rolės, trukmė ne daugiau
  kaip +15 % nuo tikslinės, žodžiai ekrane pagal `design-rules.json` (FR-09)
- [ ] `agent.approveScript`, `agent.reviseScript({ comment })` (FR-10)

U – sąsaja:
- [ ] scenų sąrašas (rolė, įgarsinimas, tekstas ekrane, vaizdo aprašas); prie scenų
  su pasiūlytu įrašu – trys mygtukai „Įrašysiu pati“ / „Padaryk be įrašo“ /
  „Sugeneruok“; patikros pastabos prie scenų; „Approve“, rankinis redagavimas,
  komentaras → perrašyti

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
- [ ] „4 Building“: eigos juosta (kuri scena dėliojama); baigus – mygtukas
  „Atidaryti redaktoriuje“ (projektas įrašomas į `db/projects/` ir atidaromas)

**Patikra:** sugeneruotas projektas atsidaro redaktoriuje ir groja.

## D8. Taisyklės ir taisymo ciklas

`src/agent/rules/` (6 taisyklės, `runRules`) jau yra.

S – serveris:
- [ ] `scripts/checkProject.ts` papildyti `runRules` rezultatais
- [ ] `server/agent/steps/revise.ts`: įrankiai (keisti tekstą, išdėstymą, komponentą,
  šalinti, skaidyti sceną); ciklas iki 3 ratų arba kol pažeidimų nebemažėja (FR-16)
- [ ] taškinis taisymas pagal prašymą tekstu (pvz. „pridėk CTA“): keičiama tik tai,
  ko prašoma; nauja scena imama iš šablono (`videoTemplateId`)

U – sąsaja:
- [ ] įspėjimų sąrašas redaktoriuje (paspaudus – pažymima scena); „Taisyti su DI“;
  laukelis prašymui tekstu

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
- [ ] U: „5 Result“ – ataskaita, išteklių sąrašas, „Atidaryti redaktoriuje“
- [ ] S + U: `agent.saveProposal` – pasiūlytą šabloną ar formulę įrašyti į žinių bazę (FR-02)

## D11. Testavimas (BD 4 skyrius)

`docs/mano-planas.md` 10 žingsnis: užfiksuoti DI atsakymai be tinklo (NFR-09),
8–10 testinių idėjų su taisymo ciklu ir be jo, lentelė (pažeidimai prieš/po, laikas,
kaina), FR patikros lentelė.

## Kaina ir laikas (visam keliui)

Pigus modelis pagal nutylėjimą, mąstymas išjungtas; į promptą tik tai, ko reikia
žingsniui; nuolatinė prompto dalis pradžioje (podėlis); ką gali kodas – daro kodas;
taškinis taisymas vietoj perkūrimo; ElevenLabs ir kadrų vertinimas – tik pabaigoje;
kiekvieno paleidimo tokenai ir laikas – `steps[]` (FR-21). Tikslai: NFR-01 ≤ 5 min,
NFR-02 ≤ 1 USD.
