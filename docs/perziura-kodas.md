# Skonis: peržiūra akimis, pagrindinis + šalutinis, scenos riba

Po 10 testo 2 scenos (dvi vienodo dydžio schemos, smulkūs užrašai) radome
priežastį. Principai į promptą patekdavo, bet:

1. modelis nematė, ką padarė – rašė tik JSON;
2. `split` piešė abu vaizdus vienodai (po 68 %), todėl hierarchija buvo neįmanoma;
3. scena buvo per ilga (37 žodžiai, ~12 s): dvi mintys viename kadre.

Pataisyta trimis dalimis.

## 1. Scenarijus: viena scena – viena mintis

**`src/agent/rules/checkScript.ts`** – nauja patikra. Riba imama iš žinių
(`knowledge/shared/design-rules.json`: scena 9 s, hook 5 s).

```ts
const maxScene = rules.find((rule) => rule.check === "sceneSeconds")?.max;
const maxHook = rules.find((rule) => rule.check === "hookSeconds")?.max;
script.scenes.forEach((scene, sceneIndex) => {
  const max = sceneIndex === 0 ? maxHook : maxScene;
  const seconds = voDurationSeconds(scene.voiceover);
  if (seconds > max)
    problems.push({ sceneIndex, message: `… split it into two scenes, one thought each …` });
});
```

**Kaip veikia.** Kodas suskaičiuoja, kiek laiko užtruks pasakyti scenos
voiceover. Jei ilgiau nei riba, tai tampa problema. Kaip ir kitos scenarijaus
problemos, ji grąžinama modeliui vieną kartą: „padalink į dvi scenas“.
Anksčiau ši riba buvo žiniose, bet scenarijaus patikra jos netikrino.

**`server/agent/prompts/writeScript.ts`** – į SYSTEM pridėta taisyklė „One scene =
one thought, shown by one picture“ su pavyzdžiu (chatbot, tada agentas – dvi
scenos).

## 2. `split` = pagrindinis + šalutinis

**`src/video/stage/stageTypes.ts`** – nauji dydžiai:

```ts
split: {
  visuals: [
    { y: 600, scale: 0.8 },   // pagrindinis
    { y: 1135, scale: 0.4 },  // mažas po juo
  ],
  caption: { top: 1340, scale: 0.85 },
},
```

**`src/agent/rules/checkBlocks.ts`** – blokai `split` vietas užima paeiliui
(1-as, 3-ias… – pagrindinėje, 2-as, 4-as… – mažojoje). Į mažąją leidžiamas
tik vienas paprastas vaizdas:

```ts
export const ASIDE_BLOCKS = ["logos", "object", "number", "progress", "badge", "keys"];
…
else if (i % 2 === 1 && !ASIDE_BLOCKS.includes(block.kind))
  problem(`block ${i + 1} goes into the split's small place, where a ${block.kind} is too small to read …`);
```

**Kaip veikia.** Jei modelis antroje vietoje įdėtų antrą schemą, patikra tai
pagautų, ir modelis pasirinktų iš naujo. Tada jis turi rinktis: arba vienas
pagrindinis vaizdas (`top`/`bottom`), arba pagrindinis ir prie jo mažas
logotipas, skaičius ar daiktas. Tas pats aprašyta ir modeliui
(`server/agent/prompts/pickBlocks.ts`, `STAGES.split`).

**`src/video/stage/StageShapes.tsx`** (`NodeMap`) – schemos užrašams daugiau
vietos: 400 px vietoj 340, o ikona atima 70 px vietoj 100. Pavyzdžiui,
„Decide next“ šalia ikonos buvo ~38 px, dabar ~52 px.

## 3. Peržiūra akimis

Agentas išrenderina savo video kadrus, Claude į juos pažiūri ir pasiūlo,
ką taisyti. Pats nieko nekeičia: pasiūlymas ateina į pokalbį su mygtukais
„Do it“ / „No“.

### Kelias

```
Mygtukas „Review frames“ (arba žinutė „pažiūrėk, kaip atrodo“)
  → routeMessage (Sonnet): target { kind: "review" }
  → agent.ts doTargets → step7Review
       1. skaito db/projects/<projectId>.json (kaip išsaugojo redaktorius)
       2. framesToReview: kurie kadrai
       3. renderStills: Remotion PNG (540x960)
       4. reviewFrames: Claude (Read įrankis) žiūri ir atsako JSON
       5. reviewResult: tekstas + pasiūlymai
  → „✓“ atsakymas + agento pasiūlymas su targets (pictures / words / motion)
  → „Do it“ → įprastas kelias (step7Change) → redaktorius perstato scenas
```

### Failai

**`server/agent/tools/frames.ts`** – kurie kadrai:

```ts
const leaves = Math.min(last, (entry.exitAt ?? durationInFrames) - END_MARGIN);
return Math.min(last, Math.max(from + SETTLED_FRAMES, leaves));
```

Kiekvienas blokas fotografuojamas prieš pat jam išeinant, kai jau visos dalys
viduje. Bandžiau ir iš karto po įėjimo, bet tada kilpoje matėsi tik „Goal“.
Iš scenos imami daugiausia 2 kadrai: pirmo ir paskutinio bloko.

**`server/agent/tools/stills.ts`** – Remotion: `bundle()` vieną kartą per peržiūrą,
tada `renderStill()` kiekvienam kadrui, `scale: 0.5`. Kompozicija ta pati kaip
MP4, todėl modelis vertina būtent tai, kas bus įkelta. 10 testo 8 kadrai
truko ~17 s.

**`server/agent/prompts/reviewFrames.ts`** – promptas. Modelis kiekvienai
scenai atsako taip:

```ts
{ sceneIndex, sees, verdict: "good" | "fix", problems: string[] (≤3),
  change?: { kind: "pictures" | "words" | "motion", instruction } }
```

Jis tikrina, ar suprantama be garso, ar yra vienas dominuojantis elementas,
ar įskaitomas tekstas, ar vaizdai dera tarpusavyje ir ar niekas neuždengia
subtitrų. Ar galima aiškiai pasakyta: „good“, jei scena veikia, ir neieškoti
skonio smulkmenų. Gauna tuos pačius `picture-principles.json`.

**`server/agent/ai/llm.ts`** – `callWithImages`. Su Claude Code kvietimui
leidžiamas `Read` įrankis, o kadrai dedami į jo darbo aplanką
(`agentFolder()`, `claudeCode.ts`), nes tik ten jis skaito laisvai. Su Gemini
PNG pridedami prie žinutės.

**`server/agent/steps/6-self-review.ts`** – `step7Review` ir `reviewResult`:
peržiūra paverčiama tekstu („Scene 2: …“, „Good as they are: …“) ir
pasiūlymais.

**`server/agent/agent.ts`** – `doTargets` atpažįsta `review`. Kai yra ką
taisyti, po „✓“ atsakymo įrašomas `agentProposes(...)` pasiūlymas. Kai nėra,
tekstas tiesiog pridedamas prie atsakymo.

**`src/agent/run/7-chat.ts`** – `chatTargetKind` papildytas `"review"`,
pridėtas `reviewFromAi`. **`src/editor/agent/ChatInput.tsx`** – mygtukas
„Review frames“ (rodomas, kai video pastatytas). Jis siunčia paprastą žinutę,
tą pačią, kurią galėtum parašyti pats.

### Tikras bandymas (10 testas, Opus)

34 s, 26k įvesties, 10 raundų (po vieną kiekvienam kadrui atidaryti). Rado:

- **2 scena:** subtitrai uždengia „Check result“; „Text reply“ beveik liečia
  „Goal“, todėl dvi schemos susilieja; kilpos užrašai per smulkūs.
- **4 scena:** grandinės „Scenes“ mazgas po subtitrais.
- **1 scena:** prašo to paties įrašo kaip 7 scena.
- 3, 5, 6, 7, 8 – gerai.

## 4. Automatinė peržiūra statymo gale (FR-15, FR-16)

Peržiūra vyksta pati, be mygtuko, kad naudotojui liktų tik 3 sprendimai
(NFR-11). **`server/agent/agent.ts`**:

```ts
await step4Building(job);
if (job.run.input.generateVoice) { …step5Voice… }
if (selfReview()) {                       // AGENT_SELF_REVIEW=off išjungia
  await job.save({ status: "reviewing" });
  await step6SelfReview(job);
}
await job.save({ status: "done" });
```

**`server/agent/steps/6-self-review.ts`**:

```ts
export async function builtProject(job) {
  const base = (await savedProject(job)) ?? createEmptyProject(…);
  return projectFromBlocks(projectFromScript(base, job.run), job.run);
}

export async function step6SelfReview(job, render = renderStills) {
  let before = Infinity;
  for (let round = 1; ; round++) {
    found = await reviewProject(job, await builtProject(job), render);
    if (!found.targets.length) return agentSays(job, "… round N: every scene reads well");
    if (found.targets.length >= before) return agentSays(job, "… did not make it better, so I stopped");
    if (round > MAX_FIX_ROUNDS) return agentSays(job, "… That was the last round");
    await agentSays(job, "… Fixing scene(s) 2, 4…");
    for (const target of found.targets) await step7Change(job, target);
    before = found.targets.length;
  }
}
```

**Kaip veikia:**

1. Serveris **pats pasistato projektą** tomis pačiomis funkcijomis kaip
   redaktorius (`projectFromScript` → `projectFromBlocks`). Iki šiol tai darė
   tik redaktorius, todėl serveris neturėjo ką fotografuoti.
2. Kadrai → Claude peržiūra (žr. 3 dalį).
3. Kur „fix“, agentas pataiso pats tais pačiais žingsniais kaip pokalbyje
   (`step7Change`: vaizdai, žodžiai su nauju balsu arba judesys). Pasiūlymo ir
   mygtuko nėra.
4. Tada vėl pasistato ir vėl žiūri.
5. Sustoja, kai viskas „good“, kai taisytinų scenų nebemažėja arba po 3
   taisymo ratų (iš viso daugiausia 4 peržiūros).
6. Kiekvienas ratas įrašomas į pokalbį („Self-review, round 1: … Fixing
   scene(s) 2, 4…“), todėl matai, ką ir kodėl jis keitė.
7. Jei peržiūra nepavyksta (pvz., nėra Claude Code), video vis tiek baigiamas.
   Pokalbyje parašoma priežastis.

Būsena `reviewing` (`src/agent/run/status.ts`) skydelyje priklauso žingsniui
„Result“. Kol ji tęsiasi, redaktorius projekto nestato (`AgentPanel.tsx`),
todėl pastato jau pataisytą versiją.

Testas: `server/__tests__/agent.test.ts` – „reviews its own frames at the end
of the build…“. Pirmas ratas randa 2 sceną ir ją taiso, antras randa vėl,
todėl agentas sustoja.

## 5. Rubrika ir pavyzdiniai kadrai (žinių bazėje)

Peržiūra dabar gauna ne tik principus.

- **`knowledge/shared/review-rubric.json`** – ką tikrinti. Kiekvienas punktas
  turi lygį:
  - `fix` – scena neveikia, agentas ją taiso (suprantama be garso, vienas
    pagrindinis elementas, įskaitoma, niekas neuždengta, vaizdai dera);
  - `note` – skonio dalykas (tuščia ar perkrauta, panaši į kaimynę, žemiau
    pavyzdžių lygio). Jis parašomas, bet **netaisomas**. Taip agentas
    nepradeda be galo perdarinėti jau veikiančio video.
- **`knowledge/shared/reference-frames.json`** ir
  **`reference-frames/insiderforce.png`** – 10 InsiderForce kadrų viename
  lape (vienas paveikslėlis, ne dešimt) su aprašu, ką rodo kiekvienas kadras
  ir kodėl veikia. Modelis pirmiausia perskaito lapą, tada mūsų kadrus.

Abu failai tikrinami schema (`reviewCheckSchema`, `referenceSheetSchema` –
`src/agent/knowledge.ts`), kaip ir kitos žinios. Naują pavyzdžių lapą
pridedi įdėdamas paveikslėlį ir įrašą į JSON, kodo keisti nereikia.

`reviewResult` geroms scenoms pastabas išvardija kaip „Note, scene N (left as
it is): …“.

Tikras bandymas (10 testas, jau su tavo pakeista 2 scena): taisyti siūlė tik
6 sceną (keturios vienodos kortelės, balso nesimato). Kitų scenų pastabos
(pvz., „3, 4 ir 5 scenos to paties išdėstymo“) liko neištaisytos. 53 s.

## 6. Subtitrai ir vaizdas nesusikerta – tikrina kodas

Ar vaizdas užlipa ant subtitrų, galima išmatuoti, todėl tai tikrina kodas, ne DI.

**`src/video/stage/stageTypes.ts`** (leaf modulis, be React):

```ts
export function zoneBand(y, scale)       // kokią juostą (px) uždengia blokas
export function captionBand(layout)      // subtitrų juosta: 2 eilutės × 96 px × 1.04 × scale
export const CAPTIONS_OVER_PICTURE = ["full"];  // čia subtitrai ant įrašo tyčia
export function coversCaption(type, y, scale)   // ar blokas užlips ant subtitrų
```

Ji naudojama dviejose vietose.

1. **Testas** `src/video/stage/__tests__/captionBand.test.ts` patikrina
   kiekvieno stage tipo vietas. Jei kas nors pakeistų išdėstymą taip, kad
   vaizdas užliptų ant subtitrų, testas nepraeitų.
2. **`checkMotion`**: judesys (keyframe), kuris nustumtų bloką ant subtitrų,
   tampa problema, ir modelis judesį planuoja iš naujo („runs into the spoken
   words – keep it above them, or make it smaller“). Tą patį sakinį gauna ir
   judesio promptas (`pickMotion.ts`).

Iki šiol tai tikrino tik DI peržiūra, ir tik kartais.

## 7. Daugiau pavyzdžių

Prie InsiderForce lapo pridėti du lapai iš `docs/bd/kadrai/geri/` (įvairūs
kūrėjai), kiekviename 10 kadrų:

- `reference-frames/explain.png` – kaip aiškinti: viena schema vienu kryptimi,
  schema keičiama (ne pridedama antra), vienas daiktas vietoj sąvokos,
  „prožektorius“;
- `reference-frames/open-close.png` – hook, atskleidimas, įrodymas, CTA.

Aprašai yra `knowledge/shared/reference-frames.json`. Kiekvienas lapas yra
vienas paveikslėlis (~1 300 tokenų), todėl 3 lapai kainuoja kaip 2–3 mūsų
kadrai.

## 8. Tikri vaizdai: blokas `picture`

Mūsų blokai buvo vien diagramos. InsiderForce kadrus gyvus daro **tikras
vaizdas**: metafora (robotinė ranka su Žeme), tikras daiktas, tikras žmogus,
pavyzdžių nuotraukos. Tokius vaizdus kol kas įkeli tu, kaip įrašus.

**`src/video/stage/blocks.ts`** – nauja bloko rūšis ir du laukai:

```ts
"picture", // a real picture the creator adds: text, find, look
find: z.string().trim().max(200).optional(),   // ką tiksliai įdėti
look: z.enum(["cutout", "card"]).optional(),    // iškarpa ar kortelė
```

**`server/agent/prompts/pickBlocks.ts`** (`CATALOG.picture`) – modeliui
paaiškinta, kada vaizdas tinka („kai jis pasako daugiau nei bet kokia schema“)
ir kad video gyvumą duoda vienas ar du. Tai patarimas, ne patikra.
**`checkBlocks.ts`** tikrina tik tai, kad būtų užpildyti laukai (`text`,
`find`, `look`).

**`src/video/stage/StageBlocks.tsx`** (`PictureBlock`):
- vaizdo dar nėra → punktyrinė vieta „▣ PICTURE“ su užrašu, kaip REC;
- `cutout` → vaizdas be fono per visą zoną, su minkštu šešėliu, lengvai plaukioja;
- `card` → nuotrauka baltame rėmelyje, pasvirusi −3°, su šešėliu;
- `full` stage → per visą kadrą, apačioje patamsinta subtitrams.

**Kaip įkelti:** agento skydelio kortelėje „Pictures picked“ yra sąrašas
„Pictures to add“ (scena, iškarpa ar kortelė, ką rasti). Laiko juostoje
dešiniu pelės mygtuku spaudi ant PICTURE bloko → Replace asset… Kodas
(`objectClipboard.ts`, `fillScreen`) įdeda failą į **patį bloką**, todėl
vieta, dydis ir judesys lieka.

**Failas nedingsta perstatant** (`projectFromBlocks.ts`, `keptMedia`). Kai
agentas perstato sceną (savo peržiūroje ar po tavo žinutės), blokas, kuris
prašo to paties (ta pati rūšis ir tas pats `find` ar `record`), pasilieka tavo
failą. Jei agentas paprašo kito vaizdo, vieta vėl tuščia. Tai galioja ir
įrašams: anksčiau perstatant jie dingdavo.

**Peržiūra** žino, kad „● REC“ ir „▣ PICTURE“ yra vietos, kurias užpildysi
vėliau, todėl jų tuštumos nepeikia. Pavyzdžių lapas
`reference-frames/pictures.png` (tavo 4 kadrai, `docs/bd/kadrai/geri/picture-01…04`)
rodo, kaip tokie kadrai atrodo.

## 9. Po 11 testo: video matosi peržiūros metu, pauzė ties limitu, peržiūra sąrašu

**Video redaktoriuje jau peržiūros metu** (`src/editor/agent/AgentPanel.tsx`).
Anksčiau redaktorius projektą statydavo tik po peržiūros, todėl peržiūros metu
matėsi tik scenarijaus tekstai. Dabar būsena `reviewing` laikoma „pastatyta“:
video atsiranda iš karto. Kai peržiūra baigiasi (`reviewing` → `done` arba
`paused`), redaktorius perstato video iš paleidimo, kad įsigaliotų pataisos.
Tavo įkelti failai lieka (`keptMedia`). Skydelyje, kol vyksta peržiūra, rodoma
eilutė su ženklu, kad dirbama (`ReviewingLine`, `RunProgress.tsx`).

**Pauzė ties limitu** (`server/agent/limits.ts`, `agent.ts`):

```ts
if (isLimitError(error))            // "hit your 5-hour limit", 429, quota…
  await saveRun({ ...latest, status: "paused", pausedFrom: latest.status, error: message });
```

- Paleidimas nesugenda, o sustoja būsenoje `paused`. Įsimenama, kur jis buvo
  (`pausedFrom`), o priežastyje parašyta, kada limitas atsinaujins.
- Skydelyje rodoma kortelė „Paused – the AI usage limit is reached“ su mygtuku
  **Continue** (`PausedCard`). Jis iškviečia `agent.resume` → `resumeRun`.
- `resumeStatus` grąžina paleidimą į artimiausią vietą, nuo kurios agentas gali
  tęsti, o statymas praleidžia tai, kas jau padaryta (blokus, judesį, balsą).
  Pavyzdžiui, jei pauzė įvyko peržiūroje, tęsiama nuo peržiūros, ir blokai iš
  naujo nerenkami.
- Peržiūra limito klaidos nebeslepia (`step6SelfReview` ją perduoda toliau),
  todėl paleidimas sustoja, o ne tyliai baigiasi.
- Kol paleidimas sustojęs, skydelis jo nebeklausinėja kas sekundę.

Testai: `server/__tests__/agent.test.ts` („pauses at the usage limit…“ –
sustoja ties blokais; po Continue baigia, scenarijaus iš naujo nerašo),
`server/agent/__tests__/limits.test.ts`.

**Peržiūra sąrašu** (`src/editor/agent/ReviewView.tsx`). Agento žinutė dabar
kartu su tekstu turi ir duomenis `review: { round, scenes, next }`
(`reviewInMessage`, `7-chat.ts`). Skydelis juos rodo taip:
- taisytinos scenos – kiekviena atskirame langelyje: ✗, numeris, kas negerai
  (taškais) ir ką agentas keičia („→ new pictures“);
- geros scenos – viena eilute: „✓ Good: 1 · 2 · 3…“;
- pastabos – suskleistos („5 note(s) – left as they are“);
- apačioje – kas toliau („Fixing these now…“, „The last round did not make it
  better…“).

„Pictures picked“ kortelėje pastabos ir trūkstami dalykai taip pat suskleisti
(`FindingsList.tsx`, `BlocksCard.tsx`).

## Ko dar nėra

- Peržiūra vertina tik nejudančius kadrus: perėjimų, laiko ir judesio ji
  nemato.
- Pavyzdinių kadrų (kaip atrodo gerai) peržiūra negauna, tik principus.
- Vaizdų agentas pats neieško ir negeneruoja, įkeli tu.
- Senų projektų išdėstymas įrašytas į layerius, todėl naujas `split` galioja
  tik naujai sugeneruotoms (ar perstatytoms) scenoms.
