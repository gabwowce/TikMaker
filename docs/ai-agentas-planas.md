# AI agentas trumpiems video: darbų planas

Baigiamojo darbo objektas yra **AI agentas**, kuris iš idėjos sukuria beveik
galutinį trumpo vertikalaus video (TikTok / Reels / Shorts) projektą.
TikMaker sistema (scenos, vizualai, redaktorius, renderis, balsas) yra
**resursai**, kuriais agentas naudojasi. Darbe jie minimi, bet į juos
nesigilinama.

Temos (dev, istorijos ir kt.) kuriamos atskirai ir į baigiamąjį darbą
neįeina. Agentui iš temos reikia tik **sąsajos** (žr. E0.3): ką jis gauna
iš temos ir kaip ją pasirenka.

---

## Ką agentas daro (galutinis rezultatas)

```
Idėja + tema + trukmė
   │
   ▼
[1] Scenarijus ──────────► (nebūtina) žmogus peržiūri / pataiso
   │
   ▼
[2] Kadrų dėliojimas: AI renkasi iš temos preset'ų; kodas sukompiliuoja į projektą
   │
   ▼
[3] Balsas + subtitrai (ElevenLabs, jau yra)
   │
   ▼
[4] Taisyklių patikra (kodas, tiksliai)      ┐
[5] Vizualinė patikra (kadrų nuotraukos + AI) ├─► [6] Taisymas ─┐
   ▲                                          ┘                  │
   └──────────────── kartojama, maks. 3 kartus ─────────────────┘
   │
   ▼
Projektas db/projects/*.json → atsidaro redaktoriuje → žmogus taiso smulkmenas
   │
   ▼
[8] Pataisų matavimas (kiek žmogui teko keisti) → metrikos + naujos taisyklės
```

**Pagrindinis architektūros sprendimas:** tai **hibridinis agentas**, ne vienas
„laisvas“ pokalbis su modeliu.

- 1–3 žingsniai yra **fiksuota seka** (pipeline). Kiekvienas žingsnis yra
  atskiras modelio kvietimas su struktūrizuota išvestimi, validuojama Zod
  schema. Taip pigiau, nuspėjamiau ir lengviau derinti.
- 4–6 žingsniai yra **agentinis ciklas**: modelis gauna pažeidimų sąrašą ir
  kadrų nuotraukas, pats renkasi taisymo įrankius ir kartoja, kol pažeidimų
  nebelieka arba pasiekiamas limitas.
- **AI niekada nerašo koordinačių ir pikselių.** Jis renkasi iš preset'ų
  (scenos tipas, layout, vizualo šablonas, dydžio žetonas), o
  **deterministinis kompiliatorius** paverčia jo pasirinkimą pilnu projektu
  ir pritaiko mechanines taisykles (perėjimai, `entrance: "none"`, stagger,
  sfx saikas, carry `groupId`). Tai baigiamajame svarbiausias argumentas:
  skonis užkoduotas sistemoje, o AI daro tik tuos sprendimus, kuriems
  reikia supratimo.

---

## Etapai

Kiekvienam etapui nurodyta: ką padaryti, kokius failus kurti ar keisti ir
kada etapas laikomas baigtu.

### E0. Pagrindas

**E0.1 Claude API serveryje**
- Pridėti `@anthropic-ai/sdk` priklausomybę.
- `ANTHROPIC_API_KEY` laikyti `.env.local` (kaip ElevenLabs raktą).
- `server/agent/llm.ts`: vienas klientas, modelio pavadinimas konfigūruojamas
  (`db/agent-settings.json`), struktūrizuotos išvesties pagalbinė funkcija
  „kviesk → validuok Zod → jei klaida, grąžink klaidą modeliui ir bandyk dar
  kartą (maks. 2 kartus)“.
- Kiekvieno kvietimo žurnalas: žingsnis, tokenai, kaina, trukmė.

**E0.2 Agento paleidimo įrašas (run)**
- `src/schema/agentRun.ts`: `{ id, projectId, input, steps[], status, startedAt, finishedAt, usage }`.
- Saugojimas: `db/agent-runs/<id>.json` (per esamą `collectionRouter`).
- Kiekvienas žingsnis įrašo savo įvestį, išvestį, pažeidimus ir laiką. Tai
  vėliau tampa baigiamojo darbo duomenimis.

**E0.3 Temos sąsaja (tik interfeisas, ne pačios temos)**
- `src/themes/types.ts`:
  ```ts
  interface ThemeDefinition {
    id: string;                     // "dev", "stories"
    name: string;
    narrative: NarrativeTemplate;   // scenų rolės ir jų eiga, trukmės intervalas
    designBrief: string;            // 1 psl. markdown: nuotaika, tempas, kas ekrane
    allowedScenes: SceneType[];
    allowedVisualTemplates: string[];   // visualTemplateRegistry id
    backgrounds: string[];
    ruleOverrides?: Partial<RuleThresholds>; // pvz. maks. žodžių kadre
    references: { image: string; good: boolean; note: string }[];
  }
  ```
- `src/themes/dev/`: pirmoji tema, surinkta iš to, kas jau yra
  (`.claude/skills/tiktok-video/SKILL.md` → `designBrief` ir `narrative`).
- Projekto schemoje: `theme?: string`, `storyPlan.targetDuration?: number`
  (CLAUDE.md jį mini, bet schemoje jo dar nėra).

✅ **Baigta, kai** serveris gali iškviesti modelį, gauti Zod validuotą atsakymą
ir įrašyti run'ą, o `dev` tema įsikelia per `getTheme("dev")`.

---

### E1. Scenarijaus generavimas

**Įvestis:** idėja (laisvas tekstas), tema, tikslinė trukmė, auditorija,
(nebūtina) papildomos pastabos („turiu įrašą, kaip …“).

**Išvestis:** `agentScriptSchema`
```ts
{
  title, premise, audience, targetDuration,
  scenes: [{
    role,            // iš temos narrative (hook, problem, fix, payoff, cta…)
    vo,              // balso tekstas
    onScreenText,    // trumpas tekstas ekrane (gali būti tuščias)
    visualBrief,     // ką rodyti: aprašymas žodžiais
    needsRecording?, // jei geriausiai parodytų tikras įrašas → placeholder
  }]
}
```

**Darbai**
- `server/agent/steps/script.ts`: prompt'as = temos `narrative` + `designBrief`
  + bendros scenarijaus taisyklės (viena mintis scenai, kabliukas per 3 s,
  VO ilgis pagal tempą).
- Iš karto po generavimo deterministinės patikros: bendra VO trukmė
  (`VO_WORDS_PER_SECOND` iš `pacing.ts`) vs `targetDuration`, žodžių kiekis
  `onScreenText`, ar visos `role` iš temos šablono. Jei netinka, vienas
  automatinis pataisymo kvietimas.
- Rezultatas įrašomas į `storyPlan` ir `scene.plan` + `scene.vo`, kad iškart
  matytųsi esamame **Storyboard** režime.

✅ **Baigta, kai** iš 10 testinių idėjų visi scenarijai praeina schemą, o
trukmė telpa ±15 % nuo tikslo.

---

### E2. Kadrų dėliojimas (scenarijus → projektas)

Svarbiausias etapas. Jį sudaro dvi dalys: AI pasirinkimai ir kompiliatorius.

**E2.1 Katalogas agentui**
- `server/agent/catalog.ts`: iš registrų (`sceneRegistry`,
  `visualTemplateRegistry`, `layoutPresets`, `assets.generated`) sugeneruoja
  **kompaktišką** tekstinį katalogą, filtruotą pagal temą. Kiekvienam įrašui
  nurodomas id, vienas sakinys „kam tinka“ ir laukai, kuriuos galima pildyti.
- Turinio negalima dubliuoti ranka: katalogas generuojamas iš registrų, kad
  neišsiskirtų.

**E2.2 Scenos specifikacija (mažas DSL)**
- `src/agent/sceneSpec.ts`: ką AI grąžina kiekvienai scenai:
  ```ts
  {
    sceneType: "hook-centered" | "visual-explainer" | …,
    layout: "visual-hero" | "visual-top" | "text-only" | …,
    eyebrow?, headline?, highlight?,          // tekstas
    headlineSize?: "hero" | "headline" | "title",   // tik žetonai
    visuals: [{ template: string, fields: {...}, role: "primary" | "icon" }],
    carryIconFromPrevious?: boolean,
    isKeyBeat?: boolean,                      // ar čia leidžiamas sfx
  }
  ```
- Jokių `x`, `y`, `px`, spalvų ir animacijų: tai sprendžia kompiliatorius.

**E2.3 Kompiliatorius**
- `src/agent/compileProject.ts`: `(script, specs[], theme) → VideoProject`.
  Grynos funkcijos be AI, pilnai testuojamos:
  - id generavimas, layout → layerių pozicijos per esamą auto-fit
    (`fitPositionedVisual`);
  - judesio taisyklės iš CLAUDE.md: `transition` ciklas, `entrance: "none"`
    prie slide, `stagger` 4/6, `cut` prie carry porų;
  - carry: tas pats asset'as + `link.groupId` gretimoms scenoms;
  - sfx saikas: garsas tik `isKeyBeat` scenose (3–5 per video), kitur `"none"`;
  - `needsRecording` → standartinis REC placeholder'is (kaip `tiktok-video` skill'e);
  - rezultatas visada pereina per `parseProject()`.

**E2.4 Modelio žingsnis**
- `server/agent/steps/layout.ts`: vienas kvietimas visam scenarijui (kad
  modelis matytų įvairovę tarp scenų), išvestis yra `sceneSpec[]`, validuota
  Zod. Neegzistuojantis šablono ar asset'o id = validacijos klaida →
  pataisymo kvietimas.

✅ **Baigta, kai** sugeneruotas projektas atsidaro redaktoriuje be klaidų,
kiekviena scena turi bent vieną vizualą arba sąmoningai yra `text-only`, o
kompiliatoriaus testai praeina.

---

### E3. Balsas ir subtitrai

- Panaudoti esamą `voice.generate` kiekvienai scenai (arba visam tekstui) ir
  esamą `src/utils/voiceClips.ts` klipams išdėstyti `audioClips[]`.
- Subtitrai atsiranda automatiškai iš `words` (`CaptionLayer`), nieko naujo
  daryti nereikia.
- Kadangi tikras balsas trunka kitaip nei įvertinimas, po balso scenų
  trukmės perskaičiuojamos pagal tikrą klipo ilgį.
- Balsas generuojamas **tik po** taisymo ciklo (E6), kad nemokėtum už
  tekstą, kuris dar keisis. Arba jis visai praleidžiamas, jei vartotojas
  taip pasirenka.

✅ **Baigta, kai** projektas turi balsą ir subtitrus, o scenų trukmės
sutampa su balsu.

---

### E4. Taisyklių patikra (deterministinė)

**Darbai**
- `src/agent/rules/`: viena taisyklė = viena funkcija
  `(project, theme) → Violation[]`, kur
  `Violation = { ruleId, sceneId, elementId?, severity: "error" | "warn", message, fixHint }`.
- Pirmas taisyklių rinkinys (dalis jų jau egzistuoja ir tik perpanaudojama):

| Taisyklė | Šaltinis |
|---|---|
| Vizualas išlenda už saugios zonos | esamas `visualOverflowWarning` / `layerOverflowWarning` |
| Scena per trumpa savo turiniui | esamas `pacingWarning` |
| Dev tekstas per ilgas (`MAX_LINE_CHARS`) | esamas `overflowWarning` |
| Per daug žodžių ekrane vienu metu | nauja |
| Šriftas mažesnis už minimumą (pvz. `sizePx`) | nauja |
| Bendra trukmė ne ±15 % nuo tikslo | nauja |
| Dvi gretimos scenos su tuo pačiu layout ir tipu | nauja |
| Daugiau nei 5 sfx per video | nauja |
| Tekstas persidengia su vizualu (laisvi blokai) | nauja |
| Kabliukas ilgesnis nei 3 s | nauja |
| Nepakeisti REC placeholder'iai | esamas `checkProject` (tik informacija) |

- Ribos (`RuleThresholds`) yra konfigūruojamos, o tema gali jas perrašyti
  (`ruleOverrides`).
- `scripts/checkProject.ts` perrašyti, kad naudotų tas pačias taisykles.
  Taip lieka viena patikros vieta, ne dvi.

✅ **Baigta, kai** kiekviena taisyklė turi testą su teisingu ir neteisingu
projektu.

---

### E5. Vizualinė patikra (kadrų nuotraukos + AI)

**Darbai**
- `@remotion/renderer` priklausomybė (`4.0.290`, ta pati versija).
- `server/agent/stills.ts`: kiekvienai scenai atvaizduoja 1–2 kadrus
  (`renderStill`): kai baigiasi įėjimo animacija ir scenos viduryje. Gali būti
  ir kontaktinis lapas: visos scenos viename paveiksliuke, kad matytųsi
  ritmas tarp scenų.
- `server/agent/steps/critique.ts`: modeliui siunčiami kadrai + temos
  `designBrief` + `references` (geri/blogi pavyzdžiai) + **rubrika**:
  - ar per sekundę aišku, kas svarbiausia kadre?
  - ar kadras neperkrautas (vienas pagrindinis vizualas)?
  - ar vizualas iš tikrųjų rodo tai, ką sako VO?
  - ar tinka temos nuotaikai?
  - ar gretimi kadrai nėra vienodi?
- Išvestis: `Critique[] = { sceneId, issue, severity, suggestion }`.
  **Svarbu:** modelio neprašoma vertinti pikselių ir dydžių. Tai daro E4.
- Kadrai išsaugomi `out/agent-runs/<runId>/`, kad juos matytų ir žmogus.

✅ **Baigta, kai** į projektą sąmoningai įdėtos dizaino klaidos (perkrautas
kadras, vizualas nesusijęs su tekstu, dvi vienodos scenos) pagaunamos bent
daugumoje bandymų.

---

### E6. Taisymo ciklas (agentinė dalis)

**Darbai**
- `server/agent/steps/revise.ts`: modelis gauna dabartinius `sceneSpec[]`,
  E4 pažeidimus ir E5 kritiką bei įrankius (tool use):
  - `updateSceneText(sceneId, …)`: sutrumpinti ar perrašyti tekstą;
  - `changeLayout(sceneId, layout)`;
  - `replaceVisual(sceneId, index, template, fields)`;
  - `removeVisual(sceneId, index)`;
  - `splitScene(sceneId, voParts[])`: per ilga scena → dvi;
  - `mergeScenes(a, b)`;
  - `markDone(reason)`.
- Įrankiai keičia **specifikaciją**, ne projektą. Po kiekvieno rato →
  kompiliatorius → E4 → (nebūtina) E5.
- Sustojimo sąlygos: nėra `error` pažeidimų ir nėra `high` kritikos; arba 3
  ratai; arba ratas nieko nepagerino (pažeidimų skaičius nesumažėjo).
- Kiekvienas ratas įrašomas į run'ą (kas buvo, ką pakeitė, kas liko).

✅ **Baigta, kai** testinių idėjų rinkinyje po ciklo `error` pažeidimų lieka
mažiau nei prieš jį, ir tai matyti run'o žurnale.

---

### E7. Integracija į redaktorių

**Serveris**
- `server/trpc/agent.ts`: `agent.start(input)` → `runId`, `agent.get(runId)`
  (būsena + žingsniai), `agent.list()`. Darbas vyksta fone, kaip
  `renderJobs.ts`.
- Pridėti į `appRouter`.

**Redaktorius**
- Mygtukas „Sukurti su AI“ prie „New project“ → forma: idėja, tema, trukmė,
  auditorija, „generuoti balsą?“, „sustoti po scenarijaus peržiūrai?“.
- Progreso skydelis: žingsniai, kiekvieno rezultatas, pažeidimų skaičius,
  kadrų nuotraukos, kaina.
- Pabaigoje atidaromas sugeneruotas projektas. Pažeidimai, kurių nepavyko
  ištaisyti, rodomi sąraše ir paspaudus pažymi sceną.
- (Nebūtina) „Pataisyk šią sceną su AI“ mygtukas Inspector'iuje, kuris tą
  patį E6 ciklą paleidžia vienai scenai.

✅ **Baigta, kai** visas kelias nuo idėjos iki atidaryto projekto veikia iš
UI be terminalo.

---

### E8. Matavimas ir mokymasis iš pataisų

**Darbai**
- Agento galutinis projektas išsaugomas kaip momentinė kopija
  (`db/agent-runs/<id>.output.json`).
- `src/agent/editDiff.ts`: palygina momentinę kopiją su dabartiniu projektu
  po žmogaus pataisų ir suskaičiuoja pakeitimus pagal kategoriją: tekstas,
  pozicija/dydis, vizualo keitimas, scenos pridėtos/pašalintos, trukmė,
  animacija.
- Ataskaita (`npm run agent:report`): kiekvienam run'ui pateikia trukmę,
  kainą, ratų skaičių, pažeidimus prieš ir po, žmogaus pataisų kiekį.
- Ciklas „pataisa → taisyklė“: jei ta pati pataisų kategorija kartojasi,
  tai kandidatas į naują E4 taisyklę arba kompiliatoriaus pakeitimą.
  Baigiamajame tai aprašoma kaip sistemos tobulėjimo mechanizmas.

**Eksperimentas baigiamajam darbui**
- 10–15 idėjų testinis rinkinys (fiksuotas, kad galima būtų kartoti).
- Palyginimas:
  - (A) tik scenarijus (E1);
  - (B) + dėliojimas be patikros (E1–E2);
  - (C) pilnas agentas (E1–E6).
- Metrikos: taisyklių pažeidimai, žmogaus pataisų skaičius, laikas iki
  paskelbiamo video, kaina, subjektyvus įvertinimas 1–5.
- (Papildomai) tikrų paskelbtų video statistika iš `content/log.md`.

✅ **Baigta, kai** yra lentelė su A/B/C rezultatais ir bent keli
paskelbti video, sukurti su agentu.

---

## Eiliškumas ir apimtis

| # | Etapas | Apimtis | MVP? |
|---|---|---|---|
| E0 | Pagrindas + temos sąsaja | ~1 sav. | ✅ |
| E1 | Scenarijus | ~1 sav. | ✅ |
| E2 | Dėliojimas + kompiliatorius | ~2–3 sav. | ✅ |
| E4 | Taisyklių patikra | ~1–1,5 sav. | ✅ |
| E7 | UI integracija (bazinė) | ~1 sav. | ✅ |
| E6 | Taisymo ciklas | ~1,5 sav. | |
| E3 | Balsas | ~0,5 sav. | |
| E5 | Vizualinė patikra | ~1,5–2 sav. | |
| E8 | Matavimas + eksperimentas | ~1,5 sav. | |
| — | Baigiamojo darbo rašymas | ~3–4 sav. | |

**MVP** (E0, E1, E2, E4, E7) yra ~6–7 sav.: idėja → redaguojamas projektas
su patikra. Jau nuo jo agentas tau pačiai realiai sutaupo laiko.
Visas planas užtrunka ~12–14 sav. su rašymu.

Jei laiko trūksta, atsisakyti šia tvarka: E5 (palikti tik E4), tada E3
(balsą generuoti ranka redaktoriuje). **E6 ir E8 neatsisakyti**: be
taisymo ciklo tai ne agentas, o generatorius, o be matavimo baigiamajame
nebus ką įrodyti.

---

## Rizikos

| Rizika | Ką daryti |
|---|---|
| Modelis renkasi neegzistuojančius šablonus ar laukus | Zod + katalogas iš registrų + pataisymo kvietimas (E2.4) |
| Vizualinė kritika nestabili (kaskart kita) | Rubrika su aiškiais klausimais, struktūrizuota išvestis, pikseliai paliekami E4 |
| Kaina | Balsas tik pabaigoje; E5 nebūtinas kiekviename rate; žurnale matoma kiekvieno run'o kaina |
| Katalogas per didelis prompt'ui | Filtruoti pagal temą; trumpi aprašymai |
| `renderStill` lėtas | Vienas bundle visam run'ui, tik 1–2 kadrai scenai |
| Sistemos pakeitimai sulaužo agentą | Kompiliatoriaus testai + testinis idėjų rinkinys kaip regresija |

---

## Kaip tai atsispindi baigiamajame darbe

1. **Problema:** trumpų video kūrimas užima daug laiko, o esami AI įrankiai
   (CapCut, InVideo, Pictory, Opus Clip) generuoja šabloniškai ir be dizaino
   kontrolės.
2. **Analizė:** esami sprendimai; LLM agentų architektūros (pipeline vs
   agentinis ciklas, tool use, LLM kaip vertintojas); kodėl LLM'ams sunkiai
   sekasi vizualinis dizainas.
3. **Projektavimas:** hibridinė architektūra; apribota dizaino sistema kaip
   resursas („AI renkasi, sistema išdėsto“); dviejų lygių patikra (kodas +
   vizualinė).
4. **Realizacija:** E0–E7 (TikMaker minimas kaip platforma, nesigilinant).
5. **Testavimas ir vertinimas:** E8 eksperimentas A/B/C.
6. **Išvados ir tobulinimas:** mokymasis iš pataisų, naujos temos.

---

## Atviri klausimai (nuspręsti prieš E0)

- Baigiamojo darbo terminas? Nuo jo priklauso, ar E5 telpa.
- API biudžetas: kiek gali kainuoti vienas video? (orientyras eksperimentui)
- Ar scenarijaus peržiūra prieš dėliojimą turi būti privaloma, ar pasirenkama?
- Kiek testinių idėjų ir iš kurių temų? (rekomendacija: daugiausia dev, nes ji
  pirmoji paruošta, + keletas kitos temos, kai ji atsiras)
