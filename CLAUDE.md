# TikMaker

Ribota video dizaino sistema 9:16 formato TikTok / Reels / Shorts video gaminti su
React + Remotion.

Video **nepiešiamas komponentais** — jis **aprašomas duomenimis**. Projektas yra vienas
JSON failas, validuojamas Zod schema ir atvaizduojamas baigtiniu komponentų rinkiniu.
Kuriant naują video, pirmiausia ieškoma, ką galima aprašyti esamomis priemonėmis, ir tik
paskui svarstoma rašyti kodą.

---

## Turinys

1. [Kur kas gyvena](#kur-kas-gyvena)
2. [Duomenų modelis](#duomenų-modelis)
3. [Nuo scenarijaus iki MP4](#nuo-scenarijaus-iki-mp4)
4. [Atvaizdavimo grandinė](#atvaizdavimo-grandinė)
5. [Trukmė, išdėstymas, judesys](#trukmė-išdėstymas-judesys)
6. [Garsas](#garsas)
7. [Redaktorius](#redaktorius)
8. [Kada rašyti naują komponentą](#kada-rašyti-naują-komponentą)
9. [Dizaino taisyklės](#dizaino-taisyklės)
10. [Komandos](#komandos)
11. [Žinoma skola ir spąstai](#žinoma-skola-ir-spąstai)

---

## Kur kas gyvena

| Kelias                            | Kas viduje                                                                                |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/schema/`                     | Zod schemos — **duomenų modelio tiesos šaltinis** (`project`, `scene`, `visual`)          |
| `src/registries/`                 | Sąrašai, ką galima pasirinkti: scenos, vizualų presetai, fonai, garsai, propai, logotipai |
| `src/utils/`                      | Grynos funkcijos: trukmė, tempas, normalizavimas, sluoksnių grandinės, garso klipai       |
| `src/video/`                      | Atvaizdavimas: scenos, tipografija, judesys, vizualai, fonai, išdėstymas                  |
| `src/editor/`                     | Redaktoriaus sąsaja — **turi savo `README.md`, skaityti jį**                              |
| `src/templates/`                  | `template-showcase.json` — atsarginis pavyzdinis projektas, kai biblioteka tuščia         |
| `src/config/`                     | `customSfx.json`, `sfxOverrides.json`                                                     |
| `projects/`                       | Tikri projektai (6) — biblioteka juos skaito iš disko                                     |
| `library/`                        | Išsaugotos scenos, šablonai, fonai, balso variantai                                       |
| `props/`, `ai/`, `sfx/`, `fonts/` | Turtų **šaltiniai**; niekas jų neskaito tiesiogiai                                        |
| `public/assets/`                  | Sinchronizuota turtų kopija, kurią mato naršyklė ir renderis                              |
| `scripts/`                        | Dev serverio API, turtų sinchronizavimas, renderis, balso generavimas                     |

**Turtai sinchronizuojasi patys.** `scripts/syncAssets.ts` kopijuoja `props/`, `ai/`, `sfx/`
ir `fonts/` į `public/` ir pergeneruoja `src/registries/assets.generated.ts` — būtent šį failą
importuoja `propRegistry` / `toolRegistry` / `sfxRegistry`. `asset-sync` pluginas
(`vite.config.ts`) paleidžia tai startuojant ir stebi pakeitimus, todėl į `props/` įmestas
failas atsiranda veikiančiame redaktoriuje be perkrovimo.

Sinchronizavimas **kopijuoja, bet netrina**: pašalinus failą iš `props/`, jis dingsta iš
manifesto (taigi ir iš redaktoriaus), bet kopija `public/assets/props/` lieka — todėl senas
projektas, kuris tą failą dar naudoja, nesugriūva.

---

## Duomenų modelis

Visą modelį apibrėžia `src/schema/`. Projektas yra:

```
VideoProject
├─ id, title, collection?, fps(30), width(1080), height(1920)
├─ storyPlan?     { targetDuration, premise, audience }
├─ audioClips[]?  garso ir balso takelis
└─ scenes[]
   ├─ id, type (7 tipų), background
   ├─ plan?       { role, purpose, visualBrief }   ← scenarijaus sluoksnis
   ├─ vo?         balso tekstas — iš jo skaičiuojama trukmė
   ├─ notes?      autoriaus pastabos, niekada neatvaizduojamos
   ├─ durationSeconds?   palikti NENUSTATYTĄ (žr. trukmės skyrių)
   ├─ layout?     kompozicijos presetas
   ├─ motion?     scenos įėjimas / išėjimas / perėjimas / stagger / garsai
   └─ content
      ├─ richHeadline[]  teksto eilutės, kiekviena su savo stiliumi ir animacija
      ├─ blocks[]        laisvai pozicionuojami tekstai / ženkleliai
      ├─ visuals[]       **vizualų sluoksnių krūva** — masyvo indeksas nereiškia z-eilės
      ├─ items[]         tik `steps` scenoms
      └─ left / right    tik `comparison` scenoms
```

### Scenarijus gyvena scenoje

Nėra atskiro scenarijaus failo. `scene.plan` (`{role, purpose, visualBrief}`) ir
`project.storyPlan` (`{targetDuration, premise, audience}`) laiko visą scenarijaus
informaciją **tame pačiame objekte**, kurį redaguoji vizualiai.

Todėl Storyboard režimas redaktoriuje nėra atskiras dokumentas — tai **kitoks tų pačių scenų
vaizdas**, rodantis tik scenarijaus laukus. Scenarijų galima taisyti bet kada, ir dizaino
darbas nedingsta. `scenePlanRoleSchema` rolės: `hook`, `problem`, `reveal`, `benefit`,
`mechanism`, `setup`, `demo`, `proof`, `payoff`, `cta`.

`projectPlanJson()` (`src/utils/projectStoryPlan.ts`) išveda visą scenarijų kaip JSON su
įrašyta instrukcija kalbos modeliui — tai integracijos taškas be API: nukopijuoji, įklijuoji
į pokalbį, gauni papildytą scenarijų.

### `content.visuals[]` — vienintelis vizualų modelis

Kiekvienas grafinis elementas scenoje yra šio masyvo įrašas. Atskiro „pagrindinio vizualo"
lauko nebėra.

Įrašas: `{id, visual, x, y, scale?, entrance?, exit?, entranceDuration?, exitDuration?,
entranceDistance?, exitDistance?, delay?, exitAt?, kenBurns?, kenBurnsSpeed?, sfx?, exitSfx?,
link?, lane?, keyframes?}`

- `x` / `y` — procentai nuo viso 1080×1920 kadro, adresuoja vizualo **centrą**
- **`lane` valdo z-eilę**: `timelineLayerZIndex(lane) = 1000 - lane`
  (`src/video/layout/layerOrder.ts`). Mažesnė juosta = aukščiau. Tai galioja ir
  `content.visuals[]`, ir `richHeadline` eilutėms — laiko juostos eilutė ir piešimo eilė
  yra tas pats dalykas, kaip CapCut ar Premiere.
- `keyframes[]` — sluoksnio poza laike (`{id, frame, x?, y?, scale?}`), kadrai skaičiuojami
  nuo scenos pradžios. Tai pozos **praplėtimas**, ne pakaitalas: praleistas laukas krenta
  atgal į įrašo `x`/`y`/`scale`, todėl vienas keyframe nieko nekeičia, kol neatsiranda
  antras. `entrance`, `exit` ir `kenBurns` veikia **virš** keyframe kelio, nes jie yra
  santykinės transformacijos.

**Full-bleed išimtis:** `node-group` su `layout: "orbit"` ir `corner-props` gauna visą kadrą
ir ignoruoja `x`/`y`/`scale` (`src/video/visuals/isFullBleed.ts`), nes patys piešia savo
geometriją. Animacija, garsas ir grandinės jiems veikia įprastai.

### `link` — vizualo perkėlimas per pjūvį

`link: {groupId, glideLead?, glideDuration?}` sujungia sluoksnį su **gretimų** scenų
sluoksniais, turinčiais tą patį `groupId` ir tą patį `visual`. Grandinė gali būti bet kokio
ilgio, bet `groupId`, pasirodantis tik vienoje scenoje, nieko nereiškia ir ignoruojamas.

`resolveHoistedLinkGroups` (`src/utils/visualLinks.ts`) surenka tokią grandinę į **vieną
sumontuotą `<Sequence>`**, apimančią visas jos scenas, o `SceneRenderer` išfiltruoja tą
sluoksnį iš kiekvienos scenos, kad nebūtų nupieštas du kartus. Dėl to perkeltas `recording`
**toliau groja** per pjūvį, o ne prasideda iš naujo.

Grandinės **pirmas** narys duoda `entrance`, atstumą, `kenBurns` ir įėjimo garsą;
**paskutinis** — `exit`. Slydimo laikas skaitomas iš scenos, į kurią **atvykstama**.

### Normalizavimas įkeliant

`parseProject()` (`src/utils/normalizeProject.ts`) — **vienintelis teisingas būdas įkelti
projektą**. Kvietimas `videoProjectSchema.parse()` tiesiogiai praleidžia normalizavimą.

Ką jis daro:

1. `clampPositions` — `x`/`y` įspraudžiami į 0–100 **prieš** validaciją. Viena reikšmė už ribų
   anksčiau numesdavo **visą projektą** kaip sugadintą; dabar tai kainuoja to elemento poziciją.
2. `videoProjectSchema.parse` — validacija.
3. `legacyTextAsLines` — senas `content.eyebrow` + `content.headline` **verčiamas į
   `content.richHeadline` eilutes**. Vyksta ties RAW JSON, **prieš** validaciją, nes
   schemoje tų laukų nebėra ir Zod juos nutylėdamas nuvalytų — senas projektas liktų
   be teksto. Eyebrow tampa `{size: "label", color: accent, letterSpacing: 4}`,
   headline — dydžiu pagal scenos tipą.
4. `primaryVisualAsLayer` — senas `scene.visual` su `visual*` palydovais suplokštinamas į
   `content.visuals[0]`.
5. `splitCornerProps` — `corner-props` išskaidomas į du savarankiškus sluoksnius su
   `kenBurns: "float"`.

**Praktinė išvada:** po įkėlimo visas tekstas yra `richHeadline`.

---

## Nuo scenarijaus iki MP4

1. **Scenarijus.** Redaktoriaus Storyboard režimas: kiekvienai scenai rolė, tikslas, `vo`,
   ekrano tekstas, `visualBrief`. Bendra trukmė antraštėje lyginama su `storyPlan.targetDuration`,
   todėl perviršis matomas rašant, o ne po renderio.
2. **Dizainas.** Scenes režimas: fonas, sluoksniai, judesys, garsas.
3. **Peržiūra.** `npm run dev` — Remotion Player redaktoriuje. `npm run studio` —
   render-tikslus patikrinimas.
4. **Renderis.** Mygtukas **Render MP4** redaktoriuje arba
   `npm run render:project -- projects/<failas>.json out/<vardas>.mp4`. Rezultatas — `out/`.

Išsaugojimas rašo projektą į `projects/<id>.json` per dev serverio API. **Diskas yra
vienintelis tiesos šaltinis** — startuojant biblioteka skaitoma per `import.meta.glob`, ne iš
naršyklės atminties. `import.meta.glob`, o ne užklausa, nes jis suveikia ir produkcijos
builde.

---

## Atvaizdavimo grandinė

```
projects/*.json
   └─ parseProject()                  normalizavimas + validacija
        └─ SceneRenderer               trys lygiagretūs Sequence srautai
             ├─ scenos                 TransitionedScene → scenos komponentas
             ├─ overflow               elementai, pergyvenantys savo sceną
             └─ link grandinės         LinkedVisual
                  └─ SceneFrame        fonas, safe-area, sluoksniai, garsas
                       ├─ RichHeadline
                       ├─ BlockLayer
                       ├─ VisualsLayer → AnimatedVisual → VisualRenderer
                       └─ SceneSfx
```

### `SceneRenderer` (`src/video/SceneRenderer.tsx`)

Kompozicijos šaknis. `computeSceneTimings` paskaičiuoja kiekvienos scenos `from` ir
`durationInFrames` — tai **vienintelis** scenų laiko šaltinis; niekur kitur jis
neperskaičiuojamas.

**`overflow` — elementas gali pergyventi savo sceną.** Jeigu elemento `exitAt` viršija scenos
trukmę, jis **iškeliamas** iš scenos į atskirą, ilgesnę `<Sequence>` ir tuo pačiu
išfiltruojamas iš scenos turinio, kad nebūtų nupieštas du kartus. Taikoma `richHeadline`
eilutėms, `blocks`, `visuals` ir `items`. Tai ta pati iškėlimo idėja kaip `link` grandinėse.

Fonas piešiamas **išorėje** perėjimo transformacijos, todėl neslysta kartu su turiniu.

### Scenos (`src/video/scenes/`)

Septyni tipai: `hook-centered`, `hook-visual`, `visual-explainer`, `screen-demo`, `takeaway`,
`comparison`, `steps`. Visi — ploni apvalkalai virš `SceneFrame`; scenos komponentas ilgesnis
nei ~60 eilučių daro tai, ką turėtų daryti karkasas.

`SceneFrame` valdo viską bendra: safe-area koloną, `BlockLayer`, `VisualsLayer`, `SceneSfx`.
Scena tedeklaruoja savo teksto elementus, teksto zoną ir tarpą.

### Vizualai (`src/video/visuals/`, 22 tipai)

| Grupė              | Tipai                                                                               |
| ------------------ | ----------------------------------------------------------------------------------- |
| Turtai             | `tool-logo`, `tool-flow`, `prop`                                                    |
| Media / įrenginiai | `image`, `recording`, `browser`, `screen`, `phone`                                  |
| Duomenys           | `stat-counter`, `checklist`, `checkpoint`, `pricing-card`, `app-mockup`, `progress` |
| Dev                | `keycap`, `terminal`, `code-diff`, `claude-cli`                                     |
| Diagramos          | `flow`, `node-group`, `stack`, `transform`                                          |
| Sudėtinis          | `corner-props` (įkeliant išskaidomas į sluoksnius)                                  |

Turtai piešiami kaip gryna grafika be plokštelės — logotipų failai jau yra plytelės, ir antras
rėmelis atrodė kaip klaida.

**Rėmeliai ir ką jie teigia.** `BrowserMockup` skirtukų juosta ir adreso laukas teigia „tai
atkeliavo iš svetainės" — tiesa web aplikacijai, melas terminalui ar nuotraukai.
`frame: "plain"` (ir jo atitikmuo `screen`) — ta pati kortelė be naršyklės apdailos: tas pats
plotis, šešėlis ir rėmelis, todėl perjungimas keičia tai, ką media **teigia**, nepajudindamas
jos išdėstyme. `frame: "none"` — plikas stačiakampis be kortelės.

`ScreenFrame` ima `aspect` (16:9 / 16:10 / 4:3 / 1:1 / 9:16), nes telefono ekranvaizdis kitaip
gautų juodas juostas savo paties kortelėje. Portretiniai santykiai matuojami pagal aukštį, kad
neišlįstų iš 1920 px kadro. Dydžiai — `src/video/visuals/devices/screenFrameSize.ts`.

### Fonai

Septyni įmontuoti: `solid-dark`, `soft-grid`, `orange-glow`, `spotlight`,
`perspective-data-grid`, `floating-glass-layers`, `dot-grid`.

Be to, scena gali turėti **custom foną**: `{type: "custom", fill, grid?}`, kur `fill` yra
`solid{color}`, `gradient{colors[2-3], angle?, shape?}` arba `image{src}`, o `grid` —
`none` / `lines` / `dots`. Kuriamas redaktoriaus `CustomBackgroundBuilder` ir įrašomas
tiesiai į sceną — registro įrašo neturi.

---

## Trukmė, išdėstymas, judesys

Trys sistemos, atsiradusios konkrečioms problemoms spręsti. Jomis naudotis, o ne aplink jas
derinti ranka.

### 1. Trukmė ateina iš turinio

Rašyk `vo` kiekvienai scenai ir **palik `durationSeconds` nenustatytą**.
`resolveSceneDuration` (`src/utils/pacing.ts`) duoda didžiausią iš keturių:

| Šaltinis   | Tempas                              | Kam                                           |
| ---------- | ----------------------------------- | --------------------------------------------- |
| grindys    | 2.0 s (1.8 s `hook-centered` be VO) | niekas nebūna pasąmoninis                     |
| kalbėjimas | 3.2 ž/s + 0.5 s uodega              | `vo`                                          |
| skaitymas  | 2.0 ž/s                             | visas ekrano tekstas                          |
| skenavimas | 4.0 ž/s                             | `terminal`, `code-diff`, `claude-cli` turinys |

Skenavimas atskirtas nuo skaitymo sąmoningai: kodas peržvelgiamas, o ne skaitomas žodis po
žodžio.

`durationSeconds` nustatyti tik sąmoningam blykstelėjimui. `vo` yra ir sąžiningas ilgio
signalas kita kryptimi: jei scena nori 7 sekundžių, VO per ilgas vienam kadrui — **skaidyk
sceną, netrumpink trukmės**.

**Paskutinė scena tęsiama**, jeigu garso klipas baigiasi vėliau nei ji
(`computeSceneTimings`), kad balsas nebūtų nukirstas.

### 2. Kompozicija ateina iš `layout`

`layoutPresets.ts`: `visual-hero`, `visual-top`, `visual-bottom`, `icon-corner-*`, `text-only`.
Kiekvienas turi dėžę, į kurią vizualas automatiškai talpinamas (`naturalVisualSize`
iš `visualMetrics.ts`), ir deklaruoja, kurią juostą užima tekstas — todėl tekstas ir vizualas
negali susidurti.

Presetas yra atspirties taškas, ne narvas: sluoksnis gali turėti savo `x`/`y`/`scale`, o
`scale` nustatymas išjungia jam automatinį talpinimą.

**Šoninės paraštės neliečiamos.** TikTok piešia savo sąsają palei abu kraštus, todėl vizualai
gauna tas pačias 130 px paraštes kaip tekstas — `SAFE_CONTENT_WIDTH` (820 px) riboja kiekvieno
preseto dėžę. Iš to seka dvi taisyklės kuriantiems vizualus:

- **Apvalkaliniai vizualai privalo išmatuoti savo vaikus.** `transform` ir `stack` funkcijoje
  `visualMetrics.ts` rekursyviai kviečia `naturalVisualSize`. Fiksuotas spėjimas ten yra tylus
  perviršis.
- **Viskas, ką komponentas padidina virš ramybės dydžio, turi būti jo deklaruotame dydyje.**
  `Transform` padidina „po" būseną `TRANSFORM_ZOOM` kartų, todėl metrikos tuo dauginamos.

Pakeitus komponento įkoduotą dydį, reikia atnaujinti jo įrašą `visualMetrics.ts`, kitaip
automatinis talpinimas pradeda meluoti.

**Leaf moduliai lieka leaf.** `visualMetrics.ts`, `isFullBleed.ts`, `tokens.ts`, `easing.ts`,
`screenFrameSize.ts`, `visualKeyframes.ts`, `layerOrder.ts` skaitomi normalizuojant projektą,
**prieš** sumontuojant komponentus. Jie **negali** importuoti React komponentų. Kartą
`visualMetrics` importavo konstantą iš `Transform.tsx`, kuris per `VisualRenderer` ciklu grįžta
atgal — nekenksminga, kol tai buvo skaitoma tik piešiant, bet normalizavimas įstūmė susiejimą
į temporal dead zone. Jeigu komponentui ir leaf moduliui reikia tos pačios konstantos, ji
priklauso leaf moduliui.

### 3. Judesys

**Scenos perėjimas** — `motion.transition`: `cut` arba `slideLeft` / `slideRight` /
`slideUp` / `slideDown` (`push` — senas alias). Slenka **tik įeinanti scena**: per pirmus
`PUSH_FRAMES` (12) kadrų ji atkeliauja iš 100 % poslinkio į vietą, grynu `translate`, be
skaidrumo. Išeinanti scena nukertama; scenos laike **nepersidengia**.

**Elemento įėjimas ir išėjimas** — `entrance` (19 presetų) ir `exit` (14 presetų) scenos,
sluoksnio, teksto eilutės ir bloko lygiuose.

- **`"none"` yra tikras presetas**, ne tas pats, kas lauko nebuvimas. Jis reiškia „jokios
  savarankiškos animacijos, tik tai, kuo neša tėvas". **Nenustatytas** `entrance` krenta į
  tikrą presetą (`scaleIn` sluoksniui, `pop` tekstui, `fade` scenos turiniui), todėl
  išvalius lauką objektas toliau animuojasi — tai atsarginis variantas, ne klaida.
  Nenustatytas `exit` tikrai reiškia jokio išėjimo.
- **Slydimas prasideda arba baigiasi UŽ kadro.** Be nurodyto atstumo kiekvienas `slide*`
  keliauja `offFrameTravel(axis)` — tikras kadro matmuo plius paraštė. Tai daugiau nei
  `FULL_TRAVEL_DISTANCE`, todėl šie slydimai **neturi skaidrumo perėjimo**: judesys ir yra
  animacija.
- **Atstumas skaičiuojamas kiekvienam sluoksniui atskirai.** `VisualsLayer` išmatuoja realų
  atstumą nuo sluoksnio centro plius pusė jo dydžio iki krašto, į kurį jis keliauja.
  Todėl trukmė reiškia tai, ką turi reikšti: per visą langą elementas nukeliauja iki krašto,
  o ne dingsta per tris kadrus ir laukia likusį laiką.
- **Išėjimai greitėja, įėjimai lėtėja.** `standardEasing` yra agresyvus ease-out — teisinga
  atvykimui, klaidinga išvykimui. `exitEasing` (`src/video/motion/easing.ts`) yra veidrodinė
  kreivė, ir `exits.ts` naudoja ją.
- **Sluoksnio mastelis neturi didinti jo animacijos.** `VisualsLayer` perduoda talpinimo
  mastelį į `AnimatedVisual` kaip `ownScale`, o ne deda `scale(...)` ant pozicionuojančio
  apvalkalo. Transformacija tėve padidintų vaiko koordinačių sistemą, ir sluoksnis prie
  `scale: 2.8` 1280 px slydimą paverstų 3584 px. `AnimatedVisual` sudeda
  `<enter> <kenBurns> <exit> scale(ownScale)`, o `translate`, parašytas **kairiau** už
  `scale`, juo nedauginamas.

**`kenBurns`** — nepertraukiamas judesys visą sluoksnio buvimo laiką, **virš** įėjimo ir
išėjimo: `zoomIn` / `zoomOut` / `panLeft` / `panRight` / `panUp` / `panDown`, plius trys
cikliniai — `float` (dreifas apie vietą, fazė sėjama pagal sluoksnio id, kad du nejudėtų
sinchroniškai) ir `rotateCW` / `rotateCCW`. `kenBurnsSpeed` yra greičio daugiklis **tik**
cikliniams. Tai standartinis būdas atgaivinti ekranvaizdį, laikantį kadrą ilgiau nei ~2 s.

**Judesio drausmė.** Judesys turi kažką reikšti. Viena nuosekli slydimo kryptis visam video
atrodo profesionaliai; kita kryptis kiekviename pjūvyje atrodo kaip triukšmas.

**Teksto skaidymas.** `splitBy` (`word` / `letter` / `line`) nurodo vienetą, `splitDuration` —
kiek laiko trunka **visa** animacija nuo nieko iki pilno teksto. `splitTiming`
(`splitAnimate.tsx`) tuo mastelį keičia **abiem** dalims — tarpui tarp vienetų ir kiekvieno
vieneto įėjimui, kuris gauna `UNIT_ENTRANCE_SHARE` viso laiko. Keisti tik tarpus reikštų, kad
žodžiai persidengia, o nustatymas „nieko nedaro"; duoti įėjimui fiksuotą kadrų skaičių dar
blogiau, nes trumpam laikui nelieka kuo staguoti ir visi žodžiai atsiranda kartu.
`splitTiming` / `splitSpan` yra eksportuojami, nes keturi dalykai turi sutarti dėl tų pačių
skaičių: atvaizdavimas, garso cue, kitos eilutės delsa ir abiejų laiko juostų pozicijos.

---

## Garsas

Garso cue išvedami automatiškai iš `motion.entrance` / `motion.exit`
(`src/video/motion/sfxDefaults.ts`), bet kategorijų prasmė yra reali trumpo formato montažo
konvencija:

| Grupė                                     | Kam                                                            |
| ----------------------------------------- | -------------------------------------------------------------- |
| `transition` (whoosh, swipe, paper-slide) | judesys ir inercija: slydimas, pjūvis                          |
| `ui` / `impact` (pop, click, snap)        | vieno elemento pasirodymas: antraštės žodis, skaičius          |
| `reveal` (riser)                          | **laukimas prieš** atomazgą, ne pati atomazga                  |
| `success` (ding, d-done, d-fix)           | pasiekimas, varnelė, CTA nusileidimas                          |
| `text`                                    | teksto vienetų cue                                             |
| `voice`                                   | balso klipai — pagal šią grupę atpažįstamas VO (`isVoiceClip`) |

**Saikas svarbesnis už pasirinkimą.** Cue ant kiekvienos scenos skamba mėgėjiškai; tikri
montuotojai palieka girdimą efektą **3–5 svarbiausiems video momentams** (kabliukas, vienas
ar du atskleidimai, CTA). Praktiškai: aktyviai nustatyk `"none"` toms scenoms, kurios nėra
tikras momentas, ir leisk automatiniam presetui suveikti tik ten, kur pelnyta. Cue ant
kiekvieno Bloko žodžio yra sąmoninga išimtis — tai vientisas spausdinimo mašinėlės efektas,
ne pakartotinė punktuacija.

**Laikas.** Cue skamba nerūpestingai, jei nenusileidžia tą patį kadrą kaip įvykis, kurį
pabrėžia.

### Balsas

`project.audioClips[]` laiko visą garso takelį: `{id, sfxId, from, startFrom?,
durationInFrames?, lane?, volume?, voiceText?, playbackRate?}`. Balso klipai atpažįstami pagal
`voice` grupę. Redaktoriuje: `VoiceLibrary`, `VoiceoverGenerator`, o `voiceVariantsStore`
laiko to paties teksto variantus. Generavimą aptarnauja `scripts/voiceApi.ts` per
dev serverio pluginą.

---

## Redaktorius

**Redaktorius turi savo dokumentaciją: [`src/editor/README.md`](src/editor/README.md).**
Joje aprašytos ekrano dalys, duomenų kelias, inspektorius, laiko juostos, naudojamos
bibliotekos ir **rašymo taisyklės**. Čia — tik tai, ką reikia žinoti iš išorės.

- Būsena — Zustand (`src/editor/state/projectStore.ts`). Visi pakeitimai eina per tris
  bazines funkcijas: `updateScene`, `updateSceneContent`, `updateSceneMotion`. Vienas
  kvietimas = vienas atšaukimo žingsnis.
- Pasirinkimas (`selectedSceneId`, `selectedObjectId`) gyvena store, ne `window` įvykiuose —
  todėl laiko juosta gali pasirinkimą ir **nupiešti**.
- Biblioteka skaitoma iš disko per `import.meta.glob`, įrašoma per dev serverio API.
  localStorage naudojamas tik neįrašytų pakeitimų žurnalui, paskutiniam atidarytam projektui
  ir vienkartinei senų duomenų migracijai (`migrateLegacyStorage.ts`).
- Laiko juosta yra **vaizdas virš schemos**, ne komponentų biblioteka: kiekvienas klipas
  redaguoja vieną įvardytą lauką (`delay`, `exitAt`, keyframe `frame`). Trečios šalies
  biblioteka reikštų modelio vertimą pirmyn ir atgal per kiekvieną redagavimą;
  `@xzdarcy/react-timeline-editor` buvo išbandyta ir atmesta (žr. `src/editor/README.md`).
- Kopijavimas ir įklijavimas gyvena vienoje vietoje
  (`src/editor/timeline/objectClipboard.ts`) — modulio lygio kintamajame, **ne** store, nes
  tai sesijos būsena ir store ją įstumtų į atšaukimo istoriją. Įklijavimas perkuria visus id
  ir nuima `link`, nes perkėlimas turi prasmę tik kaip gretimų scenų seka.
- Ištrynimas taip pat vienoje vietoje (`deleteTimelineObject.ts`) — tą pačią funkciją kviečia
  ir mygtukas, ir `Delete` klavišas. Klavišas yra tik `Delete` (niekada `Backspace`) ir
  neveikia, kai žymeklis yra įvesties lauke.

---

## Kada rašyti naują komponentą

Taisyklė nėra abstraktus „venk dubliavimo". Ji yra: **kiekvienai sąvokai yra viena vieta, ir
antra jos kopija nukryps.**

Prieš rašant komponentą, eiti šiomis pakopomis iš eilės ir leistis žemyn tik tada, kai
aukštesnė tikrai neišreiškia to, ko reikia:

1. **Projekto duomenys** (`projects/*.json`). Dauguma „naujų" dalykų yra naujas **turinys**,
   ne nauja forma. Kita antraštė, turtas, išdėstymas, spalva ar laikas visada yra duomenys.
2. **Esamas presetas** — `visualTemplateRegistry.ts` (41 presetas, 5 kategorijos),
   `sceneRegistry.ts`, `backgroundRegistry.ts`, `layoutPresets.ts`, `sfxRegistry.ts`.
   Presetas yra įvardyta esamų dalių kompozicija; pridėti jį pigu ir dažniausiai tai yra
   teisingas atsakymas į „ar galima X, bet Y".
3. **Esamų vizualų kompozicija** — `flow`, `stack`, `transform`, `node-group` apgaubia kitus
   `VisualConfig`. „Logotipas virš antraštės" yra `stack`, ne naujas komponentas.
4. **Naujas leaf komponentas** — tik kai forma tikrai neišreiškiama esamomis.

**Niekada nerašyti antrą kartą:**

| Sąvoka                                        | Vienintelė realizacija                        |
| --------------------------------------------- | --------------------------------------------- |
| Scenos karkasas                               | `SceneFrame`                                  |
| Scenos antraštė                               | `SceneHeadline` (`SceneFrame.tsx`)            |
| Stagger laikas                                | `useSceneCues(motion)` → `cue(i)`             |
| Vizualo įėjimas / išėjimas / dreifas / garsas | `AnimatedVisual`                              |
| Vizualo įdėjimas į sceną                      | `content.visuals[]` įrašas per `VisualsLayer` |
| Įėjimo / išėjimo kreivės                      | `motion/entrances.ts`, `motion/exits.ts`      |
| Nepertraukiamas dreifas                       | `motion/kenBurns.ts`                          |
| Teksto stiliai                                | `typography/Text.tsx` + `tokens.ts`           |
| Žodžio paryškinimas                           | `pillClassName` (`Text.tsx`)                  |
| Failas iš `public/`                           | `assetUrl()`                                  |
| Vizualo dydis talpinimui                      | `naturalVisualSize` (`visualMetrics.ts`)      |
| Projekto įkėlimas                             | `parseProject()`                              |
| Kada sluoksnis tikrai baigiasi                | `layerExitFrame` (`utils/duration.ts`)        |
| Rolė pagal scenos tipą                        | `planRoleFor` (`utils/normalizeProject.ts`)   |
| Sluoksnio z-eilė                              | `timelineLayerZIndex(lane)`                   |
| Turto pasirinkimas redaktoriuje               | `AssetSelect`                                 |
| Vizualo judesio laukai                        | `VisualMotionEditor`                          |
| Laiko juostos objekto trynimas                | `confirmDeleteTimelineObject`                 |

**Nauja scena** pateisinama, kai **teksto** išdėstymas tikrai kitoks (palyginimo du stulpeliai,
žingsnių sąrašas) — ne dėl kito vizualo, nes vizualas yra sluoksnis.

**Naujas vizualas** privalo: naudoti `tokens.ts`; **neimti** pozicijos ar animacijos props
(juos valdo sluoksnis); deklaruoti savo dydį `visualMetrics.ts`; ir padauginti tą dydį iš
visko, ką jis pats padidina virš ramybės būsenos.

**Trynimas yra darbo dalis.** Pakeitus mechanizmą, senasis trinamas tame pačiame pakeitime.
Mirusi šaka, kuri „vis dar veikia", kitam skaitytojui neatskiriama nuo gyvos, ir abi bus
prižiūrimos.

---

## Dizaino taisyklės

Niekada neįkoduoti scenos komponente:

- **šrifto dydžių** — `fontSizes` iš `src/video/typography/tokens.ts`
  (hero 136, headline 104, title 80, bodyLarge 62, body 52, label 42)
- **spalvų** — `colors` iš to paties failo (akcentas `#FF7024`, fonas `#171717`)
- **easing** — `src/video/motion/easing.ts`
- **safe-area tarpų** — `safeAreaPadding` (kairė/dešinė 130, viršus 220, apačia 500)

Šriftai: `tanker`, `clash`, `clashMedium`, `clashSemibold`, `clashBold`, `panchangMedium`,
`panchangSemibold`.

**VIENA SCENA = VIENA PAGRINDINĖ MINTIS.** Geriau vienas didelis vizualas nei keli maži
dekoratyviniai; geriau trumpesnis tekstas nei mažesnis šriftas.

**Žodžio paryškinimas visada yra dėžutė (šviesus fonas, tamsus tekstas), niekada ne spalvos
keitimas.** Dėžutės apipavidalinimas aprašytas vienoje vietoje — `pillClassName`
(`Text.tsx`); ją naudoja `splitAnimate` atskiriems žodžiams ir `RichHeadline`
visai eilutei per `line.pill`. Eilutės `color`
laukas yra sąmoningam stiliui, o ne būdas apeiti šią taisyklę; nenustatytas jis pats
pasirenka įskaitomą spalvą (tamsią `pill` viduje, `colors.textPrimary` išorėje).

**Dev turiniui reikia dev vizualų.** `terminal`, `code-diff` ir `keycap` yra stipresni nei
propai ar varnelių sąrašai: „spausk ESC" kaip klavišas yra instrukcija, tie patys žodžiai
sąraše — tik daugiau teksto. Šie komponentai **kerpa**, o ne laužo eilutes, todėl laikyk
eilutes trumpesnes nei `MAX_LINE_CHARS` (`src/video/visuals/dev/devText.ts`, dabar 35).

**Rodyk rezultatą, ne etiketę.** „Kaip naudoti X" video vizualas turi būti veiksmo
**pasekmė**: `claude-cli` atkartoja tikrą TUI, ir du jo būsenų variantai, suvynioti į
`transform`, duoda tiesioginį „prieš → po". Klavišo pavadinimas ant `keycap` silpniau nei
meniu, kurį jis atidaro; naudok `keycap` kaip **etiketę ant** rezultato vizualo, ne vietoj jo.

**Kiekvienas failas iš `public/` privalo eiti per `assetUrl()`.** Plikas `/assets/...` veikia
redaktoriuje, nes Vite tarnauja `public/` iš šaknies, bet renderyje Remotion tarnauja bundle
šaknį, kurioje `public/` yra vienu lygiu giliau — įkoduotas absoliutus kelias grąžina 404 ir
renderis miršta ties pirmu trūkstamu šriftu ar garsu. Tai buvo reali, visiška renderinimo
klaida šiame repo.

---

## Komandos

| Komanda                                                   | Ką daro                                       |
| --------------------------------------------------------- | --------------------------------------------- |
| `npm run dev`                                             | Redaktorius (Vite, portas 5173)               |
| `npm run studio`                                          | Remotion Studio — render-tikslus patikrinimas |
| `npm run render`                                          | Renderina kompoziciją                         |
| `npm run render:project -- projects/<f>.json out/<v>.mp4` | Renderina konkretų projektą                   |
| `npm run assets:sync`                                     | Vienkartinis turtų sinchronizavimas           |
| `npm run recordings:optimize`                             | Optimizuoja ekrano įrašus                     |
| `npm run typecheck`                                       | `tsc --noEmit`                                |
| `npm test` / `npm run test:watch`                         | Vitest                                        |
| `npm run build`                                           | Produkcijos build                             |

Windows PowerShell aplinkoje prireikus `npm.cmd`.

---

## Žinoma skola ir spąstai

Sąrašas sąmoningai laikomas dokumentacijoje, o ne nutylimas: skaitytojas turi žinoti, kuo
kodu **negalima** pasitikėti.

### Atjungti saugikliai

`pacingWarning` (`utils/pacing.ts`), `visualOverflowWarning` ir `layerOverflowWarning`
(`video/layout/layoutPresets.ts`) yra parašyti ir **niekur nekviečiami**. Anksčiau jie rodė
įspėjimus redaktoriuje; laidai nutrūko per refaktoringą. **Nepasitikėk jais kaip apsauga** —
kol neprijungti, perviršis ir per trumpa scena nepastebimi automatiškai.

Tai vienintelė likusi šio sąrašo skola, kurios dar niekas nesutvarkė.

### Dvi laiko juostos

`buildSceneTimelineRows.ts` ir `buildFullTimelineRows.ts` (po ~565 eilutes) daro tą patį
dviem mastelio lygiais; jų eilučių tipai `TimelineRow` ir `Row` sutampa maždaug 80 %.
Dalis logikos jau bendrinama (`audioCueShape`, `useAudioWaveforms`, `visualTimelinePreview`,
`groupDrag`, `sceneTimelineEnd`), bet pats eilučių konstravimas — ne.

Sujungti verta, bet tai gyvas, sudėtingas kodas su pelės tempimu, todėl imtis tik
turint tai dengiančius testus.

### Kas jau sutvarkyta

Šie dalykai anksčiau buvo šiame sąraše ir yra pašalinti — vardai paliekami, kad
skaitant senesnius commit'us būtų aišku, ko ieškoti:

- **Storyboard failų šaka** (`schema/storyboard.ts`, `storyboardToProject.ts`,
  `storyboards/`) — scenarijaus vaidmenį perėmė `scene.plan` + `project.storyPlan`.
- **Legacy pagrindinio vizualo laukai** (`scene.visual` ir 12 `visual*` palydovų) su
  `primaryVisualAsLayer`, `linkVisualToNextScene` ir septyniais store veiksmais.
- **Nenaudojami eksportai**: `SCENE_OVERLAP_FRAMES`, `isOverlappingTransition`,
  `resolveScenePlacement`, `voiceCutoffFrame`, balso „ducking" karkasas.
- **Vieno projekto turinys `normalizeProject` viduje** — vienkartinis taisymas, seniai
  pritaikytas ir įrašytas į diską.
- **Dvi teksto reprezentacijos** — `content.eyebrow`/`headline`/`highlights` pašalinti iš
  schemos; konversija iš seno JSON vyksta prieš validaciją, redaktorius rašo tik
  `richHeadline`, o septynios scenos dalijasi vienu `SceneHeadline`.
- **Dvi paryškinimo realizacijos** — liko viena `pillClassName`.
- **Tokenų reikšmės Tailwind klasėse** — dabar temos vardai (`text-brand-accent`,
  `text-headline`), o `tokens.test.ts` neleidžia abiem vietoms nukrypti.
- **12 nepasiekiamų šablonų** ir visas `template` bibliotekos vamzdynas.

### Neatlikta (nedaryti, kol neprašyta)

Chat lango maketas, gradient-mesh fonas, QA contact-sheet, scenų pertempimas pele,
sudėtinių vizualų (flow, node-group, stack, transform) redagavimas Inspektoriuje — šiuo metu
jie konfigūruojami pasirenkant presetą arba redaguojant JSON.
