# DI agentas ir motion video – kaip veikia kodas (2026-11-06)

Apima viską nuo Etapo C (commit `8caa965`: stage tipai, blokai, judesio žingsnis, balsas) ir
tai, kas pridėta po jo (dar necommitinta): kabliuko pirmas kadras, „vienas vaizdas mintims“,
dalys ant žodžių, naujos formos ir blokai, erdviniai perėjimai, scenos taisymas su DI,
suskleidžiamos kortelės. Scenos taisymas smulkiau – `docs/scenos-taisymas-kodas.md`.

Kiekvienoje dalyje: **failas → kodo gabalas → kaip veikia**.

---

## 0. Kur kas yra

| Sritis | Failai |
|---|---|
| Duomenų formos (ką DI atsako, kas saugoma) | `src/agent/run/2-angle.ts`, `3-script.ts`, `4-blocks.ts`, `4-motion.ts`, `5-voice.ts`, `6-edit.ts`, `run.ts`, `status.ts` |
| Agento eiga (kuris žingsnis kada) | `server/agent/agent.ts` |
| Žingsniai | `server/agent/steps/2-angle.ts`, `3-script.ts`, `4-building.ts`, `5-voice.ts`, `6-edit.ts` |
| Promptai | `server/agent/prompts/writeHooks.ts`, `writeScript.ts`, `pickBlocks.ts`, `pickMotion.ts` |
| Patikros (kodas, ne DI) | `src/agent/rules/checkBlocks.ts`, `checkMotion.ts` |
| Žinios | `knowledge/shared/motion-principles.json` |
| Iš agento duomenų – projektas | `src/agent/projectFromBlocks.ts`, `blockTimeline.ts`, `agentVoice.ts` |
| Piešimas | `src/video/stage/stageTypes.ts`, `StageBlock.tsx`, `StageBlocks.tsx`, `StageVisuals.tsx`, `StageShapes.tsx` (naujas), `pack.tsx`, `fitText.ts`, `StageCatalog.tsx` |
| Perėjimai | `src/video/motion/transitions.ts`, `src/schema/capabilities.ts` |
| Subtitrai | `src/video/typography/CaptionLayer.tsx`, `src/video/stage/KineticCaption.tsx` |
| Kreipiniai | `server/trpc/agent.ts`, `src/api/agent.ts` |
| Skydelis | `src/editor/agent/RunProgress.tsx`, `HookCard.tsx`, `BlocksCard.tsx`, `MotionCard.tsx`, `FoldCard.tsx` (naujas), `SceneEditCard.tsx` (naujas), `AgentPanel.tsx` |
| Redaktorius | `src/editor/state/projectStore.ts`, `src/editor/timeline/buildSceneTimelineRows.ts`, `objectClipboard.ts` |

---

## 1. Visas kelias

```
1 Idėja      forma → Start
2 Kampas     šablonas → 3 kabliukai (eilutė + PIRMAS KADRAS) → LAUKIA: pasirenki
3 Scenarijus scenarijus → patikra → LAUKIA: patvirtini arba komentuoji
4 Kūrimas    blokai (pickBlocks → checkBlocks → 1 pataisa)
             judesys (pickMotion → checkMotion → 1 pataisa)
5 Rezultatas balsas (ElevenLabs, žodžių laikai)            → done
6 Taisymas   pasirenki sceną + komentaras → editScene → done
```

`server/agent/agent.ts` – vienintelė vieta, kur keičiasi būsena:

```ts
case "awaiting_approval":
  if (job.run.script?.approved) {
    await job.save({ status: "laying_out" });
    await step4Building(job);                 // blokai + judesys
    if (job.run.input.generateVoice) {
      await job.save({ status: "generating_voice" });
      await step5Voice(job);
    }
    await job.save({ status: "done" });
    return;
  }
  ...
case "done": // naudotoja paprašė pakeisti sceną
  if (!waitingEdit(job.run)) return;
  await job.save({ status: "editing_scene" });
  await step6EditScene(job);
  await job.save({ status: "done" });
  return;
```

**Kaip veikia:** kiekvienas tavo atsakymas (kabliukas, patvirtinimas, taisymas) pirma
įrašomas į run failą (`db/agent-runs/<id>.json`), tada `continueRun` iškviečia `runAgent`, o
šis pagal būseną nusprendžia, ką daryti toliau. Skydelis kas sekundę klausia run ir rodo,
kas pasikeitė.

Bendras principas visuose DI žingsniuose: **DI pasiūlo → kodas patikrina → jei klaidų, DI
gauna savo atsakymą ir klaidų sąrašą ir taiso vieną kartą → kas lieka, rodoma tau**.

---

## 2. Kabliukas su pirmu kadru

**`src/agent/run/2-angle.ts`**

```ts
export const hookFromAi = z.object({
  text: z.string().trim().min(1).max(150),
  // ką žiūrovas MATO pirmas 2 s – vaizdas, ne vien žodžiai
  firstFrame: z.string().trim().min(10).max(200).optional(),
  formulaId: z.string().min(1).nullable(),
  score: z.number().int().min(1).max(5),
});
```

**`server/agent/prompts/writeHooks.ts`** – prompte paaiškinta, kad žodžiai tuščiame fone –
silpniausia pradžia, ir kas veikia (iš 88 analizių `hook.firstFrame`): rezultatas/įrodymas
iš karto, produktas veikia, prieš–po, ryškus vaizdas. Schemoje `firstFrame` privalomas:

```ts
hookFromAi.extend({
  formulaId: z.enum(ids).nullable(),
  firstFrame: z.string().trim().min(10).max(200),   // naujas kabliukas visada sako, ką rodo
}),
```

**Kaip keliauja toliau:** `steps/2-angle.ts` pasirinktą kabliuką išsaugo su `firstFrame` →
`steps/3-script.ts` perduoda visą kabliuką (ne tik tekstą) → `writeScript.ts` įrašo į
promptą:

```ts
Hook: ${hook.text}${hook.firstFrame ? `\nFirst frame (what the hook shows): ${hook.firstFrame}` : ""}
```

ir scenarijus pirmos scenos `visual` aprašo tą kadrą. Blokų žingsnis jį mato kaip 1 scenos
„Shows“. Skydelyje (`HookCard.tsx`) prie kabliuko – „Shows: …“.

---

## 3. Scenarijus

**`server/agent/prompts/writeScript.ts`** – trys nauji nurodymai:
- jei scena vardija dalykus, balsas įvardija **kiekvieną** (kad sąrašo punktai galėtų atsirasti ant savo žodžių);
- `visual` – veiksmas su veiksmažodžiu, suprantamas be garso („kaina krenta nuo $49 iki $0.016“), ne daiktų sąrašas;
- kai `needsRecording`, balsas sako, ką įrašas rodo tuo metu.

---

## 4. Blokai

### 4.1 Forma – `src/agent/run/4-blocks.ts`

```ts
export const blockKind = z.enum([
  "logos", "code", "terminal", "screen", "list", "number", "compare",
  "badge", "object", "schema",
  "phone", "browser", "progress", "keys", "transform", "chat",   // nauji
]);
export const listShapes = ["rows", "grid", "orbit", "stack"] as const;
export const schemaShapes = ["chain", "zigzag", "hub", "loop"] as const;
export const chatShapes = ["messages", "comments"] as const;
```

Vienas blokas – vienas objektas su visais galimais laukais (DI lengviau su vienu objektu),
kurių reikia konkrečiam tipui – tikrina kodas. Svarbiausi nauji laukai:

```ts
partWords: z.array(z.string()).max(4).optional(), // kiekvienai daliai – žodis, ant kurio ji atsiranda
itemIcons: z.array(z.string()).max(4).optional(), // ikona kiekvienam sąrašo punktui
shape: blockShape.optional(),                     // kaip piešti sąrašą / schemą / pokalbį
record: z.string().max(200).optional(),           // ekranui: ką tiksliai įrašyti
seconds: z.number().min(1).max(60).optional(),    // ekranui: apytikrė trukmė
```

Scenai – naujas laukas `happens` („kas vyksta, suprantama be garso“), rašomas pirmiausia.

```ts
// kiek dalių turi blokas – kiekviena atsiranda ant savo žodžio
export function blockParts(block) {
  switch (block.kind) {
    case "list": case "phone": case "browser": case "keys": case "chat":
      return block.items?.length ?? 0;
    case "logos":  return block.ids?.length ?? 0;
    case "schema": case "transform": return block.nodes?.length ?? 0;
    default: return 0;
  }
}
```

**Kaip veikia:** `blockParts` – viena vieta, kuri pasako, kurie blokai „pildosi“. Ją naudoja
patikra (ar duota tiek `partWords`, kiek dalių) ir projekto statymas (dalių laikai).

### 4.2 Promptas – `server/agent/prompts/pickBlocks.ts`

`basePrompt` (bendras pilnam rinkimui ir scenos taisymui): kanalas, idėja, stage tipai,
katalogas (kiekvienam blokui – kas į jį rašoma ir kada tinka), bibliotekos id, visos scenos
(balsas, trukmė, „Shows“).

`SYSTEM` – pagrindinės mintys:
- vienas vaizdas laiko visą mintį (~5 s) ir keičiasi **viduje**; vaizdas kas antrą žodį – atsitiktinis klipartas;
- pirma `happens`, tada `stage`, tada blokai: dažniausiai vienas pagrindinis sakiniui;
- rodyti patį daiktą (įrankį, ekraną, skaičių); props, reiškiantys tik žodį – paskutinis variantas;
- vaizdas suprantamas iš karto: forma pati yra mintis (pokalbis → burbuliukai, ciklas → loop, „tai tampa tuo“ → transform);
- įvairovė: ta pati išvaizda (blokas + forma) ne daugiau 2 kartų; stage ritmas;
- vienas įrašas scenoje; kabliuko vaizdas nuo 1–2 žodžio, įrašas kabliuke – `full`.

### 4.3 Patikra – `src/agent/rules/checkBlocks.ts`

Konstantos viršuje (jas keičiant keičiasi taisyklės):

```ts
export const MAX_HOLD_SECONDS = 3;          // ilgiausiai be jokio įvykio
export const MIN_PICTURE_SECONDS = 2;       // trumpiausias vaizdas (kitaip „mirga“)
export const FIRST_PART_SECONDS = 0.6;      // blokas negali stovėti tuščias iki pirmos dalies
export const FIRST_BLOCK_SECONDS = 1;
export const HOOK_PICTURE_SECONDS = 0.4;    // kabliuko vaizdas – ant 1–2 žodžio
export const MAX_SAME_STAGE_IN_A_ROW = 2;
export const MAX_SAME_LOOK = 2;
```

Ką tikrina (kiekvienai scenai):
1. stage tinka: `statement` be blokų, `split` ≥2 blokai; kabliukas – ne `statement`; įrašas kabliuke – `full`; ne daugiau 1 įrašo scenoje;
2. yra `happens`;
3. kiekvienas blokas ant žodžio, kuris tikrai pasakomas, ir eilės tvarka;
4. kiekviena dalis ant savo žodžio, nuo bloko žodžio, eilės tvarka (dvi dalys gali dalintis žodžiu);
5. kiekvienam tipui – ar užpildyti reikiami laukai, ar id yra bibliotekoje, ar forma tinka tipui;
6. tempas.

Tempo esmė:

```ts
// blokas išeina, kai jo vietą užima KITAS blokas toje pačioje vietoje (split – du blokai paeiliui)
const places = Math.max(1, STAGE_LAYOUTS[stage].visuals.length);
const ends = starts.map((_, i) => starts[i + places] ?? end);

starts.forEach((start, i) => {
  const shown = ends[i] - start;
  if (i < starts.length - 1 && shown < MIN_PICTURE_SECONDS) problem("... flickers past ...");
  if (parts[i][0] - start > FIRST_PART_SECONDS) problem("... stands empty ...");
  // ilgiausias tarpas be įvykio: bloko pradžia, jo dalys, jo pabaiga
  const marks = [start, ...parts[i].filter(t => t > start && t < ends[i]), ends[i]];
  const hold = Math.max(...marks.slice(1).map((end, m) => end - marks[m]));
  if (hold > MAX_HOLD_SECONDS) problem("nothing happens for ...");
});
```

**Kaip veikia:** laikas skaičiuojamas iš žodžių eilės numerio ir kalbėjimo greičio
(`VO_WORDS_PER_SECOND = 3.2`). „Įvykis“ = naujas blokas arba nauja jo dalis. Todėl vienas
sąrašas visai scenai praeina patikrą, jei punktai atsiranda kas ≤3 s.

Visam video:

```ts
// ta pati išvaizda ne daugiau 2 kartų (įrašai neskaičiuojami – tai tavo medžiaga)
export function blockLook(block) {
  if (block.kind === "list") return `list ${block.shape ?? "rows"}`;
  if (block.kind === "schema") return `schema ${block.shape ?? "chain"}`;
  return block.kind;
}
```

Klaidos žinutėje DI gauna savo vaizdų seką („1: logos + terminal; 2: …“) ir stage seką –
taip mato, kas kartojasi.

### 4.4 Žingsnis – `server/agent/steps/4-building.ts`

```ts
let blocks = await pick();
let problems = checkBlocks(blocks, script, blockLibrary);
if (problems.length) {
  blocks = await pick({ blocks, problems });     // DI mato savo atsakymą + klaidas
  problems = checkBlocks(blocks, script, blockLibrary);
}
await job.save({ blocks: { ...blocks, problems } });
await step4Motion(job, blocks);
```

---

## 5. Judesys

**`src/agent/run/4-motion.ts`** – kiekvienam blokui: įėjimas + trukmė, išėjimas + trukmė,
lėtas dreifas, judėjimai ant žodžių (raktiniai kadrai), perkėlimas į kitą sceną; kiekvienai
scenai – perėjimas. Perėjimai papildyti erdviniais: `zoomThrough`, `fromDepth`, `flip`.

**`server/agent/prompts/pickMotion.ts`** – DI gauna visą laiko juostą (kiekviena scena,
kiekvienas blokas, kada ir kurioje vietoje), kiekvieno judesio aprašymą žodžiais ir judesio
principus iš `knowledge/shared/motion-principles.json` (žinios, ne taisyklės; pridėtas
principas „gylis žymi naują dalį“). Dabar mato ir scenos `happens`.

**`src/agent/rules/checkMotion.ts`** – tik tai, kas išplaukia iš kadro: kad niekas
nesikrautų vienoje vietoje, neišeitų iš kadro, kad blokas nebūtų matomas prieš savo žodį,
kad perkėlimas būtų tik paskutinio bloko ir į sceną su `cut`.

**`src/video/motion/transitions.ts`** – kaip piešiamas perėjimas į sceną (pirmus 12
kadrų):

```ts
const inProgress = interpolate(frameInScene, [0, PUSH_FRAMES], [1, 0], {...}); // 1 → 0
switch (preset) {
  case "zoomThrough":   // „kamera įskrenda“: iš 2,4× ir suliejimo į 1×
    return { transform: `scale(${1 + 1.4 * inProgress})`, filter: `blur(${inProgress * 14}px)` };
  case "fromDepth":     // iškyla iš gylio: mažesnė ir atlošta → stačia
    return { transform: `perspective(1600px) rotateX(${28 * inProgress}deg) scale(${1 - 0.45 * inProgress})` };
  case "flip":          // apsiverčia kaip kortelė
    return { transform: `perspective(1600px) rotateY(${-90 * inProgress}deg)` };
  default:              // slide* – kaip anksčiau, per visą kadro plotį
}
```

---

## 6. Iš agento duomenų – projektas (`src/agent/projectFromBlocks.ts`)

DI niekada pats nerašo projekto: redaktorius jį stato iš run duomenų. Kiekvienas blokas
tampa įprastu vizualiniu sluoksniu (`stage-block`), todėl jį galima tempti, retime'inti ir
keisti laiko juostoje.

Kiekvienai scenai pirmiausia sudaromas planas:

```ts
const end = voice ? voicedSceneSeconds(voice) * fps : resolveSceneDuration(...) * fps;
const frameOf = (word) => real[word] !== undefined ? real[word] * fps : wordFrame(word, fps);
const slots = blockTimeline(vo, blocks.map(b => b.onWord), places, end, frameOf);
```

- `end` – scenos ilgis: jei yra balsas – iki paskutinio žodžio + 0,35 s; jei ne – pagal tempą.
- `frameOf` – žodžio numeris → kadras: **tikri** ElevenLabs laikai, jei yra balsas.
- `blockTimeline` (`src/agent/blockTimeline.ts`) – kada kiekvienas blokas atsiranda ir kada išeina (kai jo vietą užima kitas). Tą pačią funkciją naudoja ir judesio patikra, todėl jos visada sutaria.

Tada kiekvienas blokas → sluoksnis:

```ts
visual: {
  type: "stage-block",
  block,
  ...(plan.stage === "full" ? { full: true } : {}),   // per visą kadrą
  ...(partAts ? { partAts } : {}),                     // dalių laikai
},
delay: start,                  // atsiranda ant savo žodžio
exitAt: carried ? plan.end : leaves,
entrance, exit, kenBurns ...   // iš judesio žingsnio
```

Dalių laikai:

```ts
// kiekviena dalis ant savo žodžio: kadrai NUO bloko pradžios
return words.map((partWord, part) => {
  const word = wordIndex(plan.vo, partWord, from);
  from = word;                       // dvi dalys gali dalintis žodžiu
  if (part > 0) last = Math.max(last, plan.frameOf(word) - start);
  return last;                       // pirma dalis visada kartu su bloku – blokas niekada ne tuščias
});
```

`only` parametras (scenos taisymui): perstatoma tik viena scena, kitos lieka nepaliestos.

---

## 7. Kaip piešiama

### 7.1 Stage tipai – `src/video/stage/stageTypes.ts`

```ts
top:       vaizdas 655 px aukštyje, subtitrai nuo 1130 px
bottom:    vaizdas 1080, subtitrai 300
statement: be vaizdo, subtitrai 640, 1.4× didesni
full:      vaizdas centre (960) per visą kadrą, subtitrai 1400
split:     du vaizdai (520 ir 1110), 0.68×, subtitrai 1450
```

Kiekvienas blokas nupieštas viršutinei zonai (230–1080 px); stage tipas tik pastumia ir
padidina/sumažina tą zoną – blokui nereikia žinoti, kokiame stage jis yra.

### 7.2 Vienas blokas – `src/video/stage/StageBlock.tsx`

`StageBlockVisual` – sluoksnio dėžutė: zonos dydžio, o `full` – viso kadro (1080×1920).
`StageBlock` – vienas `switch`, kuris pagal `block.kind` ir `block.shape` pasirenka
komponentą:

```ts
// kada atsiranda kiekviena dalis: ant žodžio (partAts) arba kas 8 kadrus,
// bet ne arčiau nei 8 kadrai nuo ankstesnės
const times = (n) => { ... out.push(i ? Math.max(own, out[i - 1] + STEP) : own) ... };

case "list":
  switch (block.shape) {
    case "grid":  return <ListGrid items={items()} />;
    case "orbit": return <ListOrbit items={items()} center={block.text} centerIcon={block.id} at={at} />;
    case "stack": return <ListStack items={items()} />;
    default:      return <BigList ... />;
  }
case "schema":   // chain | zigzag | hub | loop
case "chat":     return <ChatBlock items={items()} variant={block.shape === "comments" ? "comments" : "messages"} />;
case "screen":   return full ? <FullScreen .../> : <DeckCard><ScreenBody .../></DeckCard>;
...
```

### 7.3 Formos – `src/video/stage/StageShapes.tsx` (naujas)

Visi komponentai ima spalvas ir šriftą iš stiliaus paketo (`usePack()`), o judesį iš tų
pačių `pop` / `settle` / `ramp` (`pop.ts`). Kiekviena dalis gauna `at` – kadrą, kada atsiranda.

| Komponentas | Kaip atrodo |
|---|---|
| `ListGrid` | kortelės po 2 eilėje, ikona + užrašas; nelyginė paskutinė – centre |
| `ListOrbit` | centras (ikona/žodis), aplink elipse punktai, į kiekvieną nusibrėžia stipinas, ratas lėtai sukasi |
| `ListStack` | kortelės krenta ant krūvos, šiek tiek pasvirusios |
| `SchemaZigzag` | mazgai kairėn–dešinėn žemyn, rodyklės stačiais kampais |
| `SchemaHub` | pirmas mazgas centre, kiti aplink, rodyklės iš centro |
| `SchemaLoop` | mazgai ratu, rodyklė iš paskutinio į pirmą – oranžinė („atgal“) |
| `PhoneBlock` | telefonas, viduje įslysta eilutės (pranešimai) |
| `BrowserBlock` | naršyklės langas, adresas įsirašo, eilutės atsiranda |
| `ProgressBlock` | juosta prisipildo, procentai skaičiuoja |
| `KeysBlock` | klavišai, kiekvienas „paspaudžiamas“ ant savo žodžio |
| `TransformBlock` | A kortelė viršuje → rodyklė → B (oranžinė) apačioje |
| `ChatBlock` | burbuliukai: siunčiama dešinėje, atsakymas kairėje, prieš atsakymą „rašo…“ taškai |
| `CommentSheet` | komentarų skydelis: „N comments“, avataras, @vardas, tekstas, „Reply“, širdelė |

Rodyklės (`Arrow`) – laužta linija iš taškų, kuri „nusibrėžia“ per `strokeDashoffset`;
`NodeMap` – bendra mazgų + rodyklių dalis visoms schemoms (`route: "straight" | "elbow"`).

Pokalbiams – paprastas programų šriftas (`pack.tsx`):

```ts
const UI_FONT = '"Inter", "Segoe UI", -apple-system, "Helvetica Neue", Arial, sans-serif';
```

Tekstas, kuris turi tilpti vienoje eilutėje, mažinamas per `fitFontSize` (`fitText.ts`):
pagal ilgiausią eilutę ir plotį apskaičiuojamas didžiausias tinkantis dydis.

### 7.4 Ekranas ir tavo įrašas

- `FullScreen` (`StageBlocks.tsx`) – `full` stage: įrašas per visą kadrą, apačioje patamsėja po subtitrais; be įrašo – REC vieta su „~N s“.
- Įrašą įkeli: dešinys pelės mygtukas ant REC bloko laiko juostoje → Replace asset… `objectClipboard.ts`:

```ts
// REC blokas lieka bloku: įkeltas įrašas ar paveikslėlis užpildo jį (kortelę ar visą kadrą)
function fillScreen(current, next) {
  if (current.type !== "stage-block" || current.block.kind !== "screen") return next;
  if (next.type !== "recording" && next.type !== "image") return next;
  return { ...current, src: next.src };
}
```

- Įrašas groja nuo bloko atsiradimo kadro (`<Sequence from={at}>`).

### 7.5 Katalogas – `StageCatalog.tsx`

Remotion Studio kompozicija „StageCatalog“: visi blokai ir formos po 3 s. Piešiama per tą
patį `StageBlock` kaip agento video, todėl ką matai kataloge – tą gaus video.

---

## 8. Balsas ir subtitrai

**`server/agent/steps/5-voice.ts`** – kiekvienos scenos balsas per ElevenLabs; grįžta ir
kiekvieno žodžio laikas. Išsaugoma po kiekvienos scenos.

**`src/agent/agentVoice.ts`** – scena tampa tokio ilgio, kiek trunka jos balsas (+0,35 s),
klipai padedami po scenomis su žodžių laikais. Galima kviesti kelis kartus – agento klipai
pakeičiami, ne pridedami.

**`src/video/typography/CaptionLayer.tsx`** – subtitrai piešiami iš žodžių laikų; kiekviena
frazė dedama ten, kur jos scenos stage tipas liepia (`STAGE_LAYOUTS[stage].caption`), raktiniai
žodžiai – paryškinti.

---

## 9. Scenos taisymas su DI

Trumpai: skydelyje komentaras → `agent.editScene` → serveris įrašo prašymą → agentas
(`editing_scene`) perrenka tik tos scenos blokus (matydamas visą video), patikra + 1
pataisa, perplanuoja judesį ir paima tik tą sceną → skydelis pritaiko `projectFromBlocks(…, only)`.
Visas kodas su paaiškinimais – `docs/scenos-taisymas-kodas.md`.

---

## 10. Skydelis ir redaktorius

- **`RunProgress.tsx`** – visas pokalbis su agentu: žingsnių juosta, idėja, šablonas, kabliukas, scenarijus, kūrimas, balsas, taisymai. Būsena `editing_scene` juostoje rodoma kaip „viskas padaryta“.
- **`FoldCard.tsx`** (naujas) – bendra suskleidžiama kortelė: antraštė yra mygtukas, kortelė prisimena tik „atidaryta / ne“; iš pradžių uždaryta; po antrašte – trumpa santrauka.
- **`BlocksCard.tsx`** – „Pictures picked“: suskleista rodo „N to record · N missing · N problems“; atidarius – kiekviena scena (stage, blokai ant žodžių, `happens`), „To record“ (scena, ~sekundės, ką įrašyti, kaip įkelti), trūkstami vaizdai, problemos.
- **`MotionCard.tsx`** – „Motion planned“: suskleista; atidarius – idėja, kiekvienos scenos perėjimas ir blokų judesys.
- **`HookCard.tsx`** – prie kabliuko „Shows: …“.
- **`SceneEditCard.tsx`** (naujas) – scenos taisymas.
- **Laiko juosta** (`buildSceneTimelineRows.ts`) – tuščia „Scene text“ juosta rodoma tik jei scena turi savo tekstą; agento scenose jos nebėra, todėl ji nebeuždengia blokų.

---

## 11. Testai

| Failas | Ką tikrina |
|---|---|
| `src/agent/rules/__tests__/checkBlocks.test.ts` (19) | dalys ant žodžių, tuščias blokas, mirgėjimas, split laikas, įrašai, kabliuko vaizdas, formos, įvairovė, stage ritmas |
| `src/agent/__tests__/projectFromBlocks.test.ts` | sluoksniai ant žodžių, stage vietos, vienos scenos perstatymas |
| `server/__tests__/agent.test.ts` | visas agento kelias su netikru DI, įskaitant scenos taisymą |
| `server/agent/__tests__/writeHooks.test.ts`, `writeScript.test.ts` | kabliukai su pirmu kadru, kabliukas scenarijaus prompte |

Paleisti visus: `npx vitest run` (dabar 38 failai praeina).

---

## Scenarijaus logikos patikra (2026-11-13)

**Kodėl:** tikrame paleidime (`run-mwd8sqqv`) scenarijus praėjo visas taisykles,
bet buvo nerišlus: kabliukas žadėjo vieną darbą, video vardijo tris, scena
„People person?“ atsirado iš niekur, pabaigoje – nauji skaičiai. `checkScript`
skaičiuoja sekundes ir žodžius, savipatikra žiūri kadrus – prasmės netikrino niekas.

**Kaip veikia:** parašius scenarijų, `checkStory` (`server/agent/prompts/checkStory.ts`)
jį perskaito kaip žiūrovas, girdintis pirmą kartą, ir grąžina (`storyFromAi`,
`src/agent/run/3-script.ts`): apie ką video vienu sakiniu (`summary`), ką žada
pirma scena ir ar video tai duoda (`promise`, `kept`), kur nutrūksta siūlas
(`breaks`: scena + kas negerai). `storyProblems` tai paverčia tokiomis pat
problemomis kaip `checkScript`, todėl `steps/3-script.ts` jas kartu siunčia į tą
vienintelį automatinį perrašymą; kas lieka – matosi scenarijaus kortelėje, o
kortelės viršuje – „A viewer would say: …“. Nepavykęs patikros kvietimas (ne limitas)
scenarijaus nesustabdo – lieka žurnale.

Testai: `server/agent/__tests__/checkStory.test.ts`, `server/__tests__/agent.test.ts`
(„sends the story check's breaks to the one rewrite…“).
