# Motion video – ką darome ir ką gausime (2026-11-03)

## Rezultatas

Naudotoja įrašo idėją (bet kokia tema) → agentas sukuria ~30–60 s vertikalų video:
- **apačioje** – didelis kinetinis tekstas: tai, kas sakoma, žodis po žodžio;
- **viršuje** – vaizdas, kuris keičiasi kas 2–3 s ir rodo tai, apie ką kalbama;
- viskas **kanalo stiliumi** (stiliaus paketas: spalvos, šriftas, ženklas);
- rezultatas atsidaro redaktoriuje ir jį galima taisyti rankomis.

## Būklė 2026-11-05 vakare (sesijos pabaiga) – nuo čia tęsti

**Padaryta (commit 2026-11-05):**
- Visas agentas eina per Claude Code (prenumerata, `AGENT_PROVIDER=claude-code`,
  `AGENT_CLAUDE_MODEL=opus`), faktų paieška – irgi.
- **Vienas kelias kiekvienam video:** idėja → kabliukas → scenarijus → blokai ant stage
  tipų (`pickBlocks` + `checkBlocks`) → judesys (`pickMotion` + `checkMotion`, žinios
  `motion-principles.json`) → balsas (ElevenLabs, žodžių laikai → subtitrai, blokai ant
  tikrų žodžių). 61 maketas ir jų kelias pašalinti. „Motion graphics only“ – tik ar
  galima ekrano blokas (vieta naudotojos įrašui).
- Skydelyje kortelės: „Pictures picked“, „Motion planned“, „Voiceover“.
- Fonas „stage“: šviesus centras + tinklelis iš stiliaus paketo (`grid`: linijos / taškai /
  nieko); žvaigždutės išimtos.
- Tekstas nebeišlenda: sąrašo eilutės ir didelis skaičius mažėja, kad tilptų
  (`src/video/stage/fitText.ts`).
- Kinetiniai subtitrai visada viršuje (`CAPTIONS_Z_INDEX`).

**7 testas (3 temos) – vyksta.** 1 tema („ChatGPT Plus vs Claude Pro“) parodė krūvas,
vienodus fade, kartojimąsi, išlendantį tekstą → sutvarkyta (žr. „Judesio žingsnis“).
2 tema paleista be „Motion only“ – dar senu maketų keliu (todėl jis ir pašalintas).
3 tema – naudotojai „po truputį pradeda patikti“; ką taisyti, aptarsim kitoje sesijoje.

**Po 3 temos pastabų (2026-11-05, padaryta):**
- Laiko juosta: tuščia „Scene text“ juosta nebeužlenda ant agento blokų.
- „full“ – tikrai visas kadras: ekrano blokas (REC) užpildo 1080x1920, apačioje patamsėja
  po subtitrais; įkeltas įrašas („Replace asset…“) užpildo patį bloką (kortelę ar visą kadrą).
- Užrašas (badge) be linijos į niekur; aprašytas kaip numeris / žingsnis, ne pavadinimas.
- Sąrašas: kiekvienas punktas ant savo žodžio (`partWords`), patikra reikalauja, kad balsas
  įvardintų kiekvieną punktą; scenarijaus promptas liepia juos įvardinti.
- Kartojimasis: daugiau nei 2 tie patys stage tipai iš eilės – patikra parodo modeliui jo seką;
  prompte paaiškintas ritmas.
- Ekrano blokas: `record` (ką tiksliai įrašyti) ir `seconds` (apytikrė trukmė); skydelyje
  sąrašas „To record“.
- Erdviniai perėjimai: `zoomThrough`, `fromDepth`, `flip` + principas žiniose.
- Statiniai vaizdai: 4 SVG juodraščiai (varnelė, telefonas 9:16, kūrėjas be veido,
  chronometras) – laukia patvirtinimo prieš dedant į `props/`.

**Vienas vaizdas mintims, ne žodžiams (2026-11-05):** pagal 4 InsiderForce aprašus
(`docs/bd/analizes/`) ir 88 video statistiką – vienas vaizdas laikosi ~5 s, viduje kas ~1–3 s
kažkas įvyksta. Mūsų 7 testas: ~1,6 s vienam vaizdui (atsitiktiniai paveikslėliai žodžiams).
Pakeista: agentas pirma rašo `happens` (kas vyksta, suprantama be garso), tada renkasi
dažniausiai vieną vaizdą sakiniui; dalys (sąrašo punktai, logotipai, schemos mazgai) atsiranda
ant savo žodžių (`partWords`). Patikra: kas ≤3 s turi kažkas įvykti (naujas vaizdas ar dalis),
vaizdas ne trumpiau 2 s. Taisyklė „naujas paveikslėlis kas 3 s“ pašalinta.

**Įvairovė (2026-11-05, po 8 testo):** 8 teste – 5 sąrašai, 3 schemos, kitų blokų nė vieno
(agentas matė tik 10 blokų, o taisyklė „kas 3 s kažkas įvyksta“ tiko tik sąrašui ir schemai).
Pridėta: sąrašo formos `rows` / `grid` / `orbit` / `stack`, schemos `chain` / `zigzag` / `hub`,
punktų ikonos (`itemIcons`), 5 nauji blokai stage stiliumi – `phone`, `browser`, `progress`,
`keys`, `transform` (`src/video/stage/StageShapes.tsx`). Patikra: ta pati išvaizda (blokas +
forma) ne daugiau 2 kartų per video, modelis mato savo vaizdų seką. Taip pat sutvarkyta:
tuščias blokas iki pirmo punkto ir klaidingas „flickers“ split scenose. Katalogas
(`StageCatalog`) dabar piešia per tą patį `StageBlock` kaip agentas – visos formos matomos ten.

**Kabliuko pirmas kadras (2026-11-05):** kabliukas buvo tik sakinys. Dabar kiekvienas kabliukas
turi `firstFrame` – ką žiūrovas mato pirmas 2 s (rezultatas / įrodymas, produktas veikia,
prieš–po, ryškus vaizdas; pagal 88 analizių `hook.firstFrame` – beveik niekada ne tik tekstas).
Pasirinkto kabliuko kadras eina į scenarijų (1 scenos `visual`) ir blokus; patikra: kabliuko
scena ne `statement`, vaizdas ant 1–2 žodžio. Skydelyje rodoma „Shows: …“.

**Po 9 testo („What can an AI agent actually do?“, 2026-11-05):** naujas blokas `chat`
(`messages` – burbuliukai su „rašo…“ taškais; `comments` – komentarai su širdele); schemos
forma `loop` (ratas su oranžine rodykle atgal); rodyklės tiesios / laužtos (UML), ne kreivos;
`transform` perpieštas: A viršuje → rodyklė → B apačioje; orbita didesnė. Patikra: vienoje
scenoje ne daugiau 1 įrašo; kabliuko įrašas – tik `full`. Prompte: palyginimas tik kai „po“
pakeičia blogesnį „prieš“ (ne įėjimas → rezultatas); vaizdas turi būti suprantamas iš karto.
**Scenos taisymas su DI (6 žingsnis, 2026-11-05):** baigtame video pasirenki sceną, skydelyje
parašai, ką pakeisti → agentas (`editScene`) perrenka tik tos scenos blokus, matydamas visą
video, patikra + 1 pataisymas, tada judesį (iš naujo suplanuoto paimama tik ta scena).
Projekte perstatoma tik ta scena (`projectFromBlocks(..., only)`), kitos su rankiniais
pakeitimais lieka. Tekstas ir balsas nesikeičia (vėliau – galimybė keisti ir žodžius).
Failai: `src/agent/run/6-edit.ts`, `server/agent/steps/6-edit.ts`, `editSceneBlocks`
(`pickBlocks.ts`), `agent.editScene`, `SceneEditCard.tsx`; būsena `editing_scene`.

**Toliau (dar nepadaryta):**

### Planas po 9 testo (2026-11-06) – eilės tvarka

Kryptis: **agentas pats daro gerus video iš žinių, o ne kodas jį taiso taisyklėmis.** Kodas
tikrina tik tai, kas techniškai būtina; skonis (tempas, įvairovė, judesys) – žiniose.
Ir: **su agentu kalbiesi bet kuriuo etapu**, kaip su Claude Code.

Žetonai 9 teste (vienas video): ~100 tūkst. įvesties. Didžiausi: `pickBlocks` 24 tūkst.,
`pickMotion` 26 tūkst., `research` 19 tūkst. Balso kortelėje žetonų nėra, nes balsas –
ElevenLabs, ne kalbos modelis (jis skaičiuoja simbolius) → rodyti simbolius ir sekundes.

#### 1. Žinios vietoj patikrų (principai)

`knowledge/shared/motion-principles.json` papildyti ir patikslinti (~20 principų, ne 35):
- **pataisyti:** `one-focus` → „vienas PAGRINDINIS dėmesio taškas; antrinis judesys
  leidžiamas, jei palaiko pagrindinį ir nekonkuruoja“; `stagger-groups` ir `one-focus`
  atskirti (seka ≠ konkurencija); `size-and-distance-set-duration` ir
  `exit-shorter-than-entrance` – kaip pradinės vertės, ne formulė; prie kiekvieno principo
  atskirti **universalų principą** nuo **TikMaker numatytosios vertės** (pvz. 6–8 kadrų išėjimas);
- **pridėti:** `visual-hierarchy`, `typography-follows-speech`, `rhythm-and-audio-sync`,
  `negative-space`, `follow-through`, `secondary-action`, `appeal`; pasirinktinai `arcs`,
  `squash-and-stretch` (tik jei kodas tai gali nupiešti – kitaip žinios be veiksmo);
- prie kiekvieno: prioritetas (būtinas / rekomenduojamas / pasirenkamas), šaltinis
  (Material Choreography, Duration & Easing, IxDF 12 principų, IBM Classic principles);
- **toks pat žinių failas vaizdams** (`picture-principles.json`): „vienas vaizdas mintims“,
  „forma yra mintis“, „rodyk patį daiktą“, įvairovė, ritmas – dabar tai įrašyta prompto
  tekste, perkelti į žinias, kad būtų vienoje vietoje ir matoma BD.

**Patikros (`checkBlocks`, `checkMotion`) suskirstyti į dvi rūšis:**

| Rūšis | Pavyzdžiai | Kas vyksta |
|---|---|---|
| Būtina (techniška) | žodis ne balse, id ne bibliotekoje, trūksta lauko, išeina iš kadro, tuščias blokas, 1 įrašas scenoje | grąžinama DI taisyti (kaip dabar) |
| Patarimas (skonis) | „kas 3 s įvykis“, „≥2 s vaizdas“, „ta pati išvaizda ≤2“, „stage ≤2 iš eilės“, kabliuko vaizdas ant 1–2 žodžio | NEgrąžinama taisyti; rodoma tau kaip pastaba; DI tai žino iš žinių |

Taip mažiau perrašymų (pigiau) ir DI pats sprendžia, kada išimtis tinka.

#### 2. Pokalbio skydelis visais etapais (kaip Claude Code)

Dabar: kalbėti galima tik su scenarijumi (komentaras) ir su viena scena (taisymas);
„Approve“ ir komentaras šalia – lengva supainioti.

Kaip turėtų būti:
- skydelio apačioje **visada** žinutės laukelis (bet kuriuo etapu, ir po „done“);
- veiksmų mygtukai (Approve script, Use this hook…) – **atskirai**, prie kortelės, kurios
  sprendimas laukia; žinutės siuntimas niekada nepatvirtina;
- žinutė turi **taikinį**: virš laukelio „žymė“, ką keiti – `Hook`, `Script`, `Scene 3`,
  `Pictures · scene 3`, `Motion` … Žymė užsipildo pati (pasirinkta scena / dabartinis
  etapas), gali pakeisti. Be žymės → mažas pigus DI kvietimas nuspręsti, kam žinutė skirta;
- pakeitus ankstesnį etapą (pvz. kabliuką, kai jau yra scenarijus) agentas paklausia:
  „perrašyti ir scenarijų / vaizdus?“ – nieko neperrašo tyliai;
- visos žinutės ir agento atsakymai – run faile (`messages`), istorija matosi.

Kaip veiks kodas (trumpai): `agent.message({ runId, target, text })` → serveris įrašo
žinutę → `agent.ts` pagal `target` paleidžia to etapo žingsnį su komentaru (kabliukai,
scenarijus, vienos scenos blokai, judesys) → skydelis pritaiko rezultatą. Dabartinis
„scenos taisymas“ (6 žingsnis) tampa vienu šio mechanizmo atveju (`target: scene N`), o
`reviseScript` – kitu. Prieš rašant kodą – atskiras aprašas su schema ir srautu.

**Agentas klausia, kai ko nors nežino (2026-11-06, idėja – dar nedaryta).**
Kaip Claude: jei idėjoje trūksta fakto, paieška nieko neranda arba agentas nežino, kaip
atrodo produktas, jis ne spėja, o paklausia. Kur ir kaip:
- **Kada:** tik kai atsakymas pakeis video (trūksta skaičiaus, nežinoma, ką rodo ekranas,
  neaišku, kam skirtas video); ne daugiau 3 klausimų vienu metu; kitaip – tęsia ir parašo,
  ką prielaidai pasirinko.
- **Kur:** be papildomų kvietimų – klausimus grąžina jau vykstantys žingsniai:
  šablono žingsnis (idėja neaiški, trūksta faktų), paieška (nerado), scenarijus (vietoj
  išgalvoto fakto), blokai (ką tiksliai rodo ekranas įrašui).
- **Kaip atrodo:** paleidimas sustoja būsenoje „laukia atsakymų“; pokalbyje agento
  žinutė su klausimais (prie kiekvieno – kodėl klausia, gal siūlomi variantai); atsakai
  žinute arba spaudi „spręsk pats“.
- **Atsakymai** saugomi paleidime ir eina į visus vėlesnius promptus kaip „faktai iš
  kūrėjos“; pažymėjus „prisimink“ – įrašomi į kanalo žinias (pvz. apie TikMaker), kad kitą
  kartą nebereikėtų klausti.

#### 3. Promptų pataisos

**Kabliukai (`writeHooks.ts`):**
- SYSTEM perrašyti pagal pateiktą variantą: 5 principai (curiosity gap, specificity,
  unexpectedness, relevance, payoff promise), ko vengti, trys TIKRAI skirtingi kampai,
  firstFrame – konkretus veiksmas/objektas (blogų ir gerų pavyzdžių sąrašas), griežtas
  vertinimas (5 – retai), galutinė savikontrolė;
- naujas laukas `angle` (curiosity / outcome / surprise / problem / demonstration);
  kodas tikrina, kad trijų `angle` skirtingi (techniška patikra);
- į userPrompt paduoti, ką video realiai turi: bibliotekos logotipus ir objektus, ar
  galimi įrašai (`motionOnly`), motion blokų sąrašą.

**Scenarijus (`writeScript.ts`):**
- ilgis – tikslas, ne prievolė: „never add empty explanations… write the strongest shorter
  version“ (vietoj „fill the wanted length“);
- CTA patikra: ne tik URL – ar idėjoje minimas pasiūlymas („PDF“, „bio“, „comment X“,
  „atsiųsiu“); geriau leisti DI pažymėti, iš kur CTA (idėjos sakinys), ir tikrinti, kad
  toks sakinys yra;
- vaidmenys aiškūs: scenarijus rašo, KĄ žiūrovas mato (`visual`), nežinodamas bibliotekos;
  KAIP (įrašas / blokas / tekstas) sprendžia blokų žingsnis, kuris žino tikras galimybes.
  Taip jau yra – įrašyti į promptą aiškiai.

**Blokai (`pickBlocks.ts`):**
- paduoti `needsRecording` (dabar neperduodamas – tikra spraga);
- įrašui: „atkartojamas žmogaus pagal instrukciją; jokių neminėtų mygtukų / funkcijų;
  vienas ištisinis įrašas, veiksmai eilės tvarka“.

**Judesys (`pickMotion.ts`):**
- paduoti ir scenos `visual`, ne tik `happens`;
- tęstinumo taisyklė žiniose: kryptis / pozicija tarp scenų – sąmoningas pasirinkimas;
- leisti `none` įėjimą, kai elementas turi būti matomas nuo pirmo kadro (kabliuko
  vaizdas); dabar uždrausta, o kodas `none` keičia į `fade`;
- `moves` su `x` (redaktoriaus raktiniai kadrai x palaiko): kompozicijos pakeitimui
  (schema pasislenka kairėn – dešinėje atsiranda naujas), ne smulkiems judesiams.

#### 4. Vizualų skiltis redaktoriuje

- aiškesnis dizainas: paieška pagal pavadinimą, grupės, didesnės peržiūros;
- rodyti tik tai, ką naudoja agentas (stage blokai ir formos); kitus (senus vizualus,
  kurių agentas negauna) paslėpti po „Daugiau“ arba pašalinti, jei nereikalingi;
- iš skilties galima: pasirinkti bloką scenai pačiai, arba parašyti pavadinimą
  („pokalbis burbuliukais“) ir DI priskiria – tai tas pats pokalbio mechanizmas (2).

#### 5. Žetonų taupymas

- scenos taisymui – ne visas video kontekstas: tik ta scena, kaimynės ir trumpa „kokios
  išvaizdos jau naudojamos“ santrauka; judesys – tik tai scenai (ne viso video 26 tūkst.);
- patarimai nebegrąžinami perrašyti (1 dalis) → mažiau antrų kvietimų;
- pastovią prompto dalį (sistemos tekstas, katalogas, žinios) laikyti pradžioje, kad
  veiktų talpykla (`cached` jau matosi žurnale);
- `research` (19 tūkst.) – tik kai idėjai reikia faktų.

#### Kas jau aišku apie scenos taisymą (6 žingsnis)

Dabar jis keičia tik vienos scenos vaizdus ir judesį; žodžių, kabliuko ar scenarijaus
juo nepakeisi, ir jis brangus (~50 tūkst. žetonų). Todėl jis netaps atskira funkcija –
jis įeis į pokalbio skydelį (2) kaip vienas taikinys, o žetonai sumažinti pagal 5.

#### Padaryta (2026-11-06): 1 ir 3 dalys

- **Principai:** `motion-principles.json` perrašytas (20 principų, kiekvienas su `priority`;
  `one-focus`, `stagger-groups`, trukmės – pataisyti; nauji `rhythm-and-audio-sync`, `appeal`,
  `follow-through`, `secondary-action`, `composition-moves`); naujas `picture-principles.json`
  (11 principų blokų žingsniui: vienas vaizdas mintims, be garso, rodyk daiktą, forma yra
  mintis, hierarchija, laisva erdvė, tekstas seka kalbą, įvairovė, stage ritmas, kabliukas,
  įrašas – vienas ištisinis). `arcs`, `squash-and-stretch` nepridėti – agentas negali jų nupiešti.
- **Patikros:** `checkBlocks` problemos turi `advice` žymę; skonio (tempas, mirgėjimas,
  įvairovė, stage ritmas, kabliuko laikas) – tik pastabos, DI jų neperrašo; kortelėse
  „Notes“ atskirai nuo problemų (`FindingsList.tsx`).
- **Kabliukai:** naujas SYSTEM pagal pateiktą variantą; `angle` laukas; kodas reikalauja
  trijų skirtingų kampų (kitaip klausiama iš naujo); prompte „This video can show“ (įrašai,
  blokai, logotipai, objektai).
- **Scenarijus:** ilgis – tikslas, ne prievolė; scenarijus rašo KĄ, ne KAIP;
  CTA pažadas atpažįstamas ir iš žodžių (`ideaGivesOffer`).
- **Blokai:** principai iš žinių failo (SYSTEM sutrumpintas); `Recording: yes/no` iš
  `needsRecording`; įrašas – vienas ištisinis, atkartojamas.
- **Judesys:** `none` leidžiamas blokui pirmame scenos žodyje; `moves` su `x` (patikra – kad
  neišeitų iš kadro šonu); prompte scenos `Shows` ir tęstinumo sakinys; principai su prioritetu.
- **Balso kortelė:** simboliai ir sekundės.

#### Po 10 testo (2026-11-06) – sutvarkyta

10 testas (`run-mw4nasvv`, projektas „10 testas“): blokai iš 1 kvietimo, daug įvairesni;
~97 tūkst. žetonų. Pataisyta:
1. **Tikri TikMaker ekranai** kanalo žiniose (`workspace.json` → `screens`), perduodami
   scenarijui ir blokams (`productScreens.ts`) – įrašai aprašo tik tai, kas yra. Įrašų –
   iki ~4 per video (principas, scenarijaus promptas, pastaba `MAX_RECORDINGS`).
2. **„Split“ be tekstinių blokų** (`TEXT_BLOCKS`: list, chat, code, terminal, browser, phone) –
   būtina patikra; stage aprašyme tai pasakyta.
3. **Įrašas nebelaikomas „stovinčiu“** – „nothing happens“ pastaba ekrano blokams netaikoma.
4. **Perkėlimas:** judesio prompte prie kiekvienos scenos – ar į ją gali nusileisti perkeltas
   blokas (tas pats `MIN_CARRY_FRAMES`), kad nebūtų antro kvietimo.
5. **Judesio kaina:** žurnale `turns` (Claude Code vidiniai ratai); promptas ~9,4 tūkst.
   žetonų, 2 ratai + talpyklos kūrimas → ~30 tūkst.; principuose prompte nebėra „why“.
6. **Faktų paieška** tik kai šablono žingsnis pasako `needsFacts: true`.
7. **Subtitrai:** sena frazė išnyksta iki naujos pirmo žodžio (nebepersidengia).

#### Sprendimai (2026-11-06)

1. **Patikros:** skonio patikros (kas 3 s įvykis, ≥2 s vaizdas, ta pati išvaizda ≤2, stage ≤2
   iš eilės, kabliuko vaizdas ant 1–2 žodžio) tampa **tik pastabomis** – DI jų neperrašinėja,
   tai žino iš principų; tu matai pastabą kortelėje. Būtinos (techninės) lieka kaip dabar.
2. **Pokalbio taikinys:** ką pažymėjai redaktoriuje (sceną, vizualą, tekstą, bet kurį
   objektą) – tas matosi pokalbyje kaip pridėtas dalykas („žymė“), ir aprašai, ką pakeisti.
   Jei nieko nepažymėta – DI iš teksto supranta, ką nori keisti (pigus atskiras kvietimas).
3. **Seni vizualai:** paslėpti po „Daugiau“, nešalinti (seni projektai ir rankinis darbas).
4. **Eilė:** 1 (principai) ir 3 (promptai) → 2 (pokalbis) → 5 (žetonai) → 4 (vizualų skiltis).

Senesni punktai:
- Naudotojos pastabos po 3 temos (kita sesija).
- **Kartojimasis** (sutarta, nepadaryta): `pickBlocks` prompte paaiškinti, kodėl
  kartojimas nuobodus, ir parodyti modeliui jo paties vaizdų seką – žinios, ne taisyklė;
  norų sąraše leisti prašyti ir naujų **blokų tipų**. Blokų tipų per mažai (10) – plėsti.
- Trūkstami vaizdai: norų sąrašas → importas; logotipai / ikonos iš Iconify (Simple
  Icons, Lucide) arba Claude nupieštas SVG.
- Ekrano blokas + naudotojos įrašas: įrašas įkeliamas „Replace asset…“, bet sluoksnio
  dydis skirtas blokui – nepatikrinta, gal reikia pritaikyti.
- Su balsu scenų ilgis nustatytas pagal tikrą balsą → redaktoriaus `pacingWarning` gali
  klaidingai sakyti „per trumpa“.
- Blokų taisymas agentu (B: „gali siūlyti keisti netinkamą bloką“) – dar nedaryta.
- BD tekstus (FR ir kt.) suderinti su programa – kai agentas baigtas.

## Kaip tai tinka bet kokiai temai: blokai, ne šablonai

Video nėra vienas šablonas. Yra ~10 **blokų** (lyg LEGO detalės). Kiekvienas blokas
bendras, o turinį į jį įrašo agentas pagal temą. InsiderForce daro tą patį: jų video
skirtingomis temomis naudoja tuos pačius blokus (monetas, korteles, sąrašus, juostą
„01“), keičiasi tik turinys (docs/bd/kadrai/insiderforce/).

| # | Blokas | Kas į jį įrašoma | Kada tinka |
|---|---|---|---|
| 1 | Logotipų grandinė | 2–4 logotipai iš bibliotekos (26 vnt.) arba ikonos | kai minimi įrankiai |
| 2 | Kodo kortelė | 2–6 kodo eilutės | kai kalbama apie kodą, nustatymus |
| 3 | Terminalo kortelė | komanda ir atsakymas | kai kalbama apie komandą |
| 4 | Ekrano kortelė | tavo įrašas ar ekrano nuotrauka (arba vieta jai) | kai reikia parodyti tikrą programą |
| 5 | Didelis sąrašas | 2–4 punktai su ✦ / ✓ / ✕ | privalumai, žingsniai, klaidos |
| 6 | Skaičius | skaičius ir ką jis reiškia | kaina, laikas, procentai |
| 7 | Palyginimas | A prieš B (pvz. „$49 → $0.016“) | prieš / po, brangu / pigu |
| 8 | Juosta „01“ | numeris ar trumpas užrašas | naujas punktas sąraše |
| 9 | Vienas didelis objektas | daiktas iš bibliotekos (~40: spyna, raktas, laikrodis, robotas…) | metafora, emocija |
| 10 | Schema | A → B → C | kaip kas veikia |

Jei logotipo bibliotekoje nėra – moneta su pavadinimo raidėmis arba ikona; vėliau
logotipą įkeliate patys.

### Pavyzdžiai, kaip skirtingos temos virsta blokais

**„How to undo your last git commit“:** terminalas (`git reset --soft HEAD~1`) →
palyginimas (soft prieš hard) → didelis sąrašas (kada kurį naudoti) → juosta „01“ /
„02“ → objektas (laikrodis – „grįžti laiku atgal“).

**„Notion vs Obsidian“:** logotipų grandinė (Notion, Obsidian) → palyginimas (kaina) →
sąrašas (privalumai) → skaičius („100 % offline“) → schema (failai → sinchronizacija).

**„3 Claude Code skills“:** logotipų grandinė → juosta „01“ → kodo kortelė → sąrašas
(tai, kas jau padaryta pavyzdinėje scenoje).

## Sprendimai 2026-11-05

- **Kanalo stilius – ne tik spalvos.** Kitas kanalas turi skirtis bent blokais, geriausia
  ir stage tipais; vien spalvų ir šrifto keitimas – ne kitas kanalas. **Kol kas to
  nedarom:** dar neaišku, kaip atrodys mūsų video, tad darom paprasčiau ir greičiau,
  kryptį koreguosim pagal rezultatą.
- **Rec video – irgi iš stage tipų**, ne iš 61 maketo: „visas kadras“ (įrašas per visą
  ekraną) ir ekrano kortelė (blokas 4) jau tinka įrašams. Viena sistema motion ir rec video.
- **61 maketas nereikalingas** – BD aprašo programą, ne analizę. Šalinsim (pavyzdžiai
  žinių bazėje, `pickLayouts`, D7 maketų logika), kai agentas jau rinksis blokus ir stage
  tipus (etapas C) – ne anksčiau, kad iki tol veiktų dabartinis kelias.
  **✓ Pašalinta 2026-11-05:** 61 pavyzdys (`knowledge/shared/layout-examples`), `pickLayouts`,
  `compileProject`, `run.layout`, `agent.layoutKnowledge`, `scene.layoutExampleId`. Dabar
  **kiekvienas** video eina vienu keliu: blokai ant stage tipų → judesys → balsas.
  „Motion graphics only“ tik nusprendžia, ar agentas gali rinktis ekrano bloką (`screen` –
  vieta tavo įrašui); įrašą į tą sluoksnį įkeli pakeisdama jo turinį (dešinys pelės
  mygtukas laiko juostoje → asset).

## Stage tipai ir perėjimai (vietoj 61 maketo)

5–6 išdėstymo tipai iš tų pačių dalių, todėl perėjimai tarp jų sklandūs:

| Tipas | Kaip atrodo | Kada |
|---|---|---|
| Vaizdas viršuje, tekstas apačioje | kaip StageDemo | dauguma scenų |
| Tekstas viršuje, vaizdas apačioje | apversta | įvairovei |
| Tik tekstas | didelė frazė per visą kadrą | kabliukas, svarbus teiginys |
| Visas kadras | įrašas / vaizdas per visą ekraną, tekstas ant viršaus | tavo įrašai, demonstracija |
| Du vaizdai | palyginimas, „prieš / po“ | palyginimai |

Perėjimai: tekstas nuslysta į kitą vietą; vaizdas priartėja ir „praleidžia“ į kitą
sceną; kortelė virsta kita kortele. 61 maketas bus pašalintas (žr. „Sprendimai
2026-11-05“).

## Ką agentas gauna ir iš ko renkasi

Visą katalogą: blokai (kam tinka), stage tipai, perėjimai, bibliotekos failai pagal id.
Rinktis tik iš jo – kodas tikrina. Ko trūksta, agentas pažymi „norų sąraše“ – iš jo
matome, kokius vizualus pridėti į biblioteką.

## Kaip užtikrinamas greitas tempas

1. **Tekstas** – frazė keičiasi kas ~1,5 s, žodžiai iššoka kas ~0,3 s. Tai daro kodas
   automatiškai iš įgarsinimo, agentui nieko nereikia.
2. **Viršutinis vaizdas** – naujas blokas ne rečiau kaip kas 3 s. Tikrina kodas; jei
   agentas parašo per retai – grąžina taisyti (kaip dabar planBeats).
3. **Bloko viduje** – dalys atsiranda po vieną, ant savo žodžių (monetos, punktai,
   kodo eilutės).

## Kas ką daro

| Kas | Ką daro |
|---|---|
| **Agentas (DI)** | parašo scenarijų (jau yra); kiekvienam ~2–3 s gabalui parenka bloką ir įrašo turinį; pažymi kertinius žodžius |
| **Kodas** | sudeda tekstą pagal įgarsinimą; išdėsto bloką viršuje; laiko pokyčius ant žodžių; pritaiko stiliaus paketą; tikrina taisykles |
| **Naudotoja** | idėja, kabliuko pasirinkimas, scenarijaus patvirtinimas; jei reikia – įrašai ekrano kortelėms; galutinis taisymas redaktoriuje |

## Etapai

| Etapas | Ką darome | Ką pamatysi | Būklė |
|---|---|---|---|
| 0 | **Konkurentų analizė – DI video generatoriai** (žr. d-planas.md „Kita sesija pradeda nuo čia“) | lentelė + išvados; patikslinti blokai ir paketo laukai | **kitas** |
| A | Išdėstymas (vaizdas viršuje, tekstas apačioje), kinetinis tekstas, stiliaus paketas, 4 pirmi blokai | pavyzdinė scena trimis stiliais | ✓ main |
| B | Likę blokai (iš 10), kiekvienas atskirai | „blokų katalogas“ – `StageCatalog` | ✓ main |
| C | Agentas renkasi blokus ir pildo juos; tekstas automatiškai iš įgarsinimo; tempo taisyklė | agento video 3 skirtingomis temomis | |
| D | Tikri žodžių laikai iš ElevenLabs įgarsinimo | tekstas ir vaizdai tiksliai ant žodžių | |
| E | Kritikas: išrenderina kadrus, vaizdą matantis modelis įvertina ir grąžina taisyti (D9) | mažiau prastų kadrų | |
| F | Stiliaus paketas iš kanalo pavyzdžių | kiekvienas kanalas savo stiliumi | vėliau |

### Captionai ir stage – sutarta 2026-11-05

**Kas ką daro su captionais:** agentas captionų nedėlioja – jis renkasi scenos **stage
tipą** ir pažymi **kertinius žodžius**. Sistema pati: ima žodžius ir jų laikus iš
įgarsinimo, skaido į frazes, piešia kanalo stiliumi (stiliaus paketas) ir deda į tą
vietą, kurią numato stage tipas (pvz. `top` – apačioje, `bottom` – viršuje, `full` –
ant vaizdo).

**Viena captionų sistema.** TikMaker jau turi captionus (`CaptionLayer`, iš ElevenLabs
žodžių laikų, stilius – `project.captions`: šriftas, dydis, spalva, kaip išskiriamas
tariamas žodis). `KineticCaption` būtų antra sistema tam pačiam – to nedarom. Vietoj
to kinetinis tekstas tampa **captionų stiliumi** (`captions.style: "kinetic"` šalia
dabartinio „pill“): frazės po 3–7 žodžius, žodžiai iššoka, kertiniai stori. Captionus
visada daro sistema iš įgarsinimo; agentas tik pažymi kertinius žodžius. Kurį stilių
naudoti – stiliaus paketas (kanalo dizainas); vietą ekrane – stage tipas.

**Stage tipai** – iš ko sudėtas kadras; captionai – tik viena iš zonų:

| Tipas | Kadras | Kada (agento taisyklė) |
| --- | --- | --- |
| `top` (yra) | vaizdas viršuje, captionai apačioje | numatytas – dauguma scenų |
| `statement` | tik didelis tekstas per visą kadrą (pati frazė – captionai) | kabliukas, svarbus teiginys, išvada |
| `full` | vaizdas / įrašas per visą kadrą, captionai ant viršaus | įrašai, „herojaus“ momentas |
| `split` | du vaizdai (prieš / po), captionai apačioje | palyginimai |
| `bottom` | captionai viršuje, vaizdas apačioje | įvairovei |

Kodėl būtent šie: jie dengia tai, ką rodo pavyzdžiai (InsiderForce kadrai, 61 maketo
analizė apibendrinta) ir mūsų blokai; visi sudėti iš tų pačių dalių, todėl perėjimai
tarp jų sklandūs. **Perėjimai:** captionai nuslysta į naują vietą; vaizdas išsiplečia
į visą kadrą arba susitraukia; kortelė virsta kita kortele. **Agentas** kiekvienai
scenai renkasi stage tipą pagal turinį (palyginimas → `split`, įrašas → `full`,
kabliukas → `statement`), o kodas tikrina: tipas tinka blokams (pvz. `split` – tik su
`compare`), tas pats tipas ne daugiau kaip 3 kartus iš eilės.

**6a būklė (2026-11-05):** ✓ įrašyta (232 testai, patikrinta kadrais su
įgarsinimu): `project.captions.style` ("pill" | "kinetic") ir
`keywords`, `CHUNK_LIMITS` + `isKeyword` (`src/utils/captions.ts`), `CaptionLayer` →
`KineticCaption`, „Caption look“ redaktoriuje (`CaptionStyleFields.tsx`), testai.

**6b būklė (2026-11-05):** padaryta ir patikrinta kadrais (Studijoje kompozicija
„StageTypes“ – visi 5 tipai): `src/video/stage/stageTypes.ts` (tipai ir jų zonos – kur
vaizdas, kur captionai), `StageBlock.tsx` (bloko duomenys → komponentas; `StageZone`
perkelia ir mastelį keičia viršutinę zoną), `StageTypesDemo.tsx`, scenos laukas `stage`
(`src/schema/scene.ts`), „kinetic“ captionai dedami pagal scenos stage tipą
(`CaptionLayer`, `KineticCaption` – `top`, `scale`). **Captionai visada virš visko**
(`CAPTIONS_Z_INDEX = 10000`, `src/video/layout/layerOrder.ts`) – naudotojos prašymu.

**6c būklė (2026-11-05):** padaryta, patikrinta kadrais ir testais (236). Blokas
projekte – **įprastas sluoksnis** (vaizdo tipas `stage-block`, `src/schema/visual.ts`,
piešia `StageBlockVisual`): vieta ir dydis iš stage tipo, atsiranda ant savo žodžio
(`delay`, trumpas `fade`), išeina, kai toje vietoje atsiranda kitas (`exitAt`) –
todėl laiko juostoje redaguojamas kaip bet kuris sluoksnis. `src/agent/projectFromBlocks.ts`
sudeda scenas (`stage`, sluoksniai, captionai „kinetic“ + kertiniai žodžiai);
**perėjimai:** paskutinis scenos vaizdas per 12 kadrų nuslenka į kitos scenos vaizdo vietą
(keyframes), į `statement` – susitraukia; captionai, pasikeitus stage, nuslysta į naują
vietą (`KineticCaption`, 10 kadrų). Redaktorius pritaiko blokus po agento
(`applyAgentBlocks`, `AgentPanel`). Žodžio paieška – viena vieta `src/utils/voWords.ts`.
**Liko:** stage scenose fonas kol kas `solid-dark` (be StageDemo tinklelio ir švytėjimo).

**6d būklė (2026-11-05):** padaryta (238 testai). Agentas kiekvienai scenai renkasi
`stage`; `statement` scena be blokų. **Sutarta:** prompte stage tipai tik **aprašomi**
(kaip atrodo), o **kada kurį naudoti – sprendžia agentas pagal situaciją**; jokių „kabliukas
→ statement“ taisyklių (`pickBlocks.ts`, `STAGES`). Kodas tikrina tik tai, kas išplaukia iš
paties tipo (`statement` be vaizdo, `split` – du); taisyklė „ne daugiau 3 to paties iš
eilės“ išimta – agentas sprendžia pats, koreguosim, jei bus blogai. `checkBlocks` tikrina: stage nurodytas; `statement` – be blokų; kitos – bent
vienas blokas; `split` – bent 2; tas pats stage ne daugiau kaip 3 scenos iš eilės.
Išbandyta su Claude (sonnet, per prenumeratą), „AI agents explained“: 9 scenos, visi 5
tipai (statement → top → bottom → split → top → bottom → full → top → bottom), **0 problemų**,
~24 s. Norų sąrašas: varnelė, antspaudas, pokalbio burbulas, pauzės ženklas, TikMaker logotipas.

**Nauja C eilė (patvirtinta):** 6a captionų stilius „kinetic“ esamoje sistemoje →
6b stage tipai (duomenys + piešimas) → 6c perėjimai → 6d agentas renkasi stage →
6e video redaktoriuje + skydelio kortelė → 7 testas.

### Etapo C dalys (pradėta 2026-11-05)

| # | Dalis | Failas | Būklė |
| --- | --- | --- | --- |
| 1 | Schema: ką modelis atsiunčia (blokai su turiniu, kertiniai žodžiai, norų sąrašas) | `src/video/stage/blocks.ts` | ✓ įrašyta |
| 2 | Patikra kodu: žodžiai yra įgarsinime ir eina iš eilės, bloko privalomi laukai, bibliotekos id, tempas (pirmas blokas per 1 s, naujas – ne rečiau kaip kas 3 s), kertiniai žodžiai | `src/agent/rules/checkBlocks.ts` + `__tests__/checkBlocks.test.ts` | ✓ įrašyta |
| 3–4 | Katalogas modeliui (blokai su „kam tinka“, bibliotekos id; „Motion only“ – be ekrano kortelės) ir promptas; taisymas – su ankstesniu atsakymu ir problemomis | `server/agent/prompts/pickBlocks.ts` + `server/agent/__tests__/pickBlocks.test.ts` | duota, rašo naudotoja. Išbandyta su Gemini 2026-11-05: 9 scenos per ~6 s; po vieno taisymo liko 3 tempo pažeidimai (3,1–3,8 s) |

**Sprendimai 2026-11-05 (po 3–4 dalies):**
- **Tempas – kodu, ne modeliu.** Modelis blogai skaičiuoja žodžius, todėl „naujas blokas
  kas ≤ 3 s“ jam nepavyksta net su taisymu. Siūloma: kodas pats suskaido kiekvienos scenos
  įgarsinimą į gabalus po ≤ 8 žodžius (~2,5 s, ties sakinio skyrybos vietomis), o modelis
  kiekvienam gabalui parenka bloką. Tada tempas teisingas iš karto, kaip maketai daro
  perpildymą neįmanomą. Keičia 1–4 dalis (schema: blokas gabalui, ne `onWord`).
- **Modelis – Claude per naudotojos Claude Code prenumeratą, ne Gemini.** Gemini mokamas
  ir su limitais, Claude geriau mąsto. Kol nepakeista, tikrų Gemini kvietimų bandymams
  nedarom. **Tempo kol kas netaisom** – pirma Claude, tada matysim, ką taisyti sistemoje,
  o ką promptuose. Kaip prijungti (patikrinta Claude Code dokumentacijoje 2026-11-05):
  serveris paleidžia `claude -p` su `--output-format json --json-schema <schema>`
  (atsakymas – lauke `structured_output`, dar patikrinamas Zod), `--tools ""` (be įrankių),
  `--system-prompt`, `--model`; užklausa – per stdin; darbo aplankas – tuščias, ne
  projektas (kad neskaitytų CLAUDE.md); be `--bare` (jis neskaito prenumeratos
  prisijungimo); iš aplinkos pašalinti `ANTHROPIC_API_KEY` (jei jis yra, `-p` naudoja jį,
  ne prenumeratą). Kiekvienas kvietimas – nauja sesija be atminties; visą kontekstą
  duoda užklausa, kaip ir dabar. Taisyklės: prenumerata tinka **asmeniniam** naudojimui
  savo kompiuteryje; jei programa būtų siūloma kitiems – reikia API rakto (Claude
  Console). Kvietimai eina į prenumeratos limitus; kaina JSON'e (`total_cost_usd`) – tik
  apytikslė. Šaltiniai: code.claude.com/docs/en/headless, cli-reference, authentication,
  legal-and-compliance.
  **Būklė 2026-11-05:** Claude Code 2.1.318 įdiegtas (`C:\Users\gt123\.local\bin\claude.exe`,
  PATH vartotojui pridėtas), prisijungta su Claude Pro. Išbandyta: `callStructured` per
  Claude Code (sonnet) grąžina atsakymą pagal schemą iš pirmo karto, ir blokų schemą
  (`blocksFromAi`); 7–9 s kvietimui. Kodas: A `server/agent/ai/claudeCode.ts` + testas
  (✓ įrašė naudotoja), B `llm.ts` perjungimas `AGENT_PROVIDER=claude-code` (✓ įrašyta,
  `.env.local` – įjungta). Faktų paieška (`callWithSearch`, žingsnis 3a) – irgi per tą
  patį jungiklį: Claude Code su WebSearch/WebFetch įrankiais, atsakymas pagal schemą
  (`text` + `sources`). Išbandyta: 6 faktai, 4 šaltiniai, ~21 s. Visas agentas dabar
  eina per Claude Code; Gemini – tik jei `AGENT_PROVIDER` ištrintas.
- **Norų sąrašas → lengvas importas** redaktoriuje (pamatai, ko trūksta, ir iškart
  įkeli) – vėliau, kai bus sugeneruotas video.

**Gemini apribojimas (2026-11-05):** schemoje negalima riboti scenų skaičiaus
(`.length`, `.min/.max` išoriniame masyve) – Gemini atmeta užklausą („invalid argument“).
Scenų skaičių tikrina `checkBlocks`.
| 5 | Agento žingsnis: „Motion graphics only“ → blokai vietoj maketų; `run.blocks` (patikra + vienas taisymas) | `server/agent/steps/5-pictures.ts`, `run.ts`, testas `server/__tests__/agent.test.ts` | ✓ įrašyta 2026-11-05 (230 testų) |
| 6 | Video iš blokų: blokai ant žodžių, apačioje kinetinis tekstas iš įgarsinimo, stiliaus paketas (pirma Studijoje, paskui redaktoriuje) | `src/video/stage/` | ✓ (6a–6e) |
| 6e | Skydelio kortelė „Pictures picked“ (scena → stage → blokai ant žodžių, norų sąrašas, problemos); „stage“ fonas (šviesus centras, slenkantis tinklelis; ženklai vėliau išimti, tinklelis – iš stiliaus) – agento motion scenoms; pilna eiga redaktoriuje su Claude | `src/editor/agent/BlocksCard.tsx`, `src/video/stage/Backdrop.tsx`, fonas `stage`, `projectFromBlocks.ts` | ✓ 2026-11-05. Bandymas (opus): „git reset --soft“, 30 s → 8 scenos (top ×4, split ×3, full ×1), 0 problemų, ~29,6 s video. Norai: Git logotipas, šiukšliadėžė, commit grafas, skydas. **Be balso subtitrų nėra** – jie daromi iš ElevenLabs žodžių laikų |
| 7 | Testas: agento video 3 skirtingomis temomis | – | vyksta (žr. „Būklė“ viršuje) |

Pavyzdys, kaip panašiai buvo daryta anksčiau: šaka `claude/charming-gauss-7ldow0`,
`src/agent/run/4-beats.ts` (vienas objektas su neprivalomais laukais – Gemini taip lengviau).

### Judesio žingsnis – sutarta 2026-11-05 (po pirmo 7 testo)

Testas „ChatGPT Plus vs Claude Pro“ parodė: vaizdai atsiranda ir išeina vienodai
(fade), scenos keičiasi be ryšio, o „split“ scenos pabaigoje abu vaizdai slenka į tą
pačią kitos scenos vietą, kur jau atsiranda naujas – susidaro krūva (kodo klaida
`projectFromBlocks`, ne agento).

| # | Dalis | Būklė |
| --- | --- | --- |
| A | Švarus pagrindas kode: vienoje vietoje vienu metu – vienas vaizdas; scenos pabaigoje vaizdai išeina (slinkimas į kitos scenos vietą išimtas – perkėlimą spręs agentas B žingsnyje) | ✓ 2026-11-05 (`projectFromBlocks.ts`) |
| C | Judesio žinios `knowledge/shared/motion-principles.json` (14 principų: principas, kodėl, kaip tai TikMaker, šaltiniai – Material Design judesio gairės, IxDF apie Disney principus, match cut). Užkrovimas į žinių bazę (schema + `server/agent/knowledge.ts`) – B dalyje | ✓ 2026-11-05 |
| B | Agento žingsnis „Motion“ (po blokų, prieš balsą), vienintelis darbas – judesys. Gauna: visą laiko juostą (scenos, tipai, vaizdai su turiniu, kada ir kur), judesių sąrašą (19 įėjimų, 14 išėjimų, keyframe'ai, perkėlimas į kitą sceną, perėjimai) ir C žinias. Sprendžia: kiekvieno vaizdo įėjimą / išėjimą, judėjimą, perkėlimą, perėjimus; gali siūlyti keisti netinkamą bloką (dar nedaryta). Kodas tikrina: niekas nesusideda vienoje vietoje, viskas rėmo ribose, tik esami judesiai, laikai scenoje; vienas taisymas. Skydelyje – kortelė „Motion“ | ✓ (be blokų keitimo) |

Eilė: A → C → B.

**B dalys** (B1 parodyta naudotojai, visą B naudotojos prašymu („padaryk tu“) įrašė Claude, 2026-11-05):

| # | Dalis | Failas | Būklė |
| --- | --- | --- | --- |
| B1 | Schema: ką modelis atsiunčia – kiekvienai scenai perėjimas, kiekvienam blokui įėjimas / išėjimas su kadrais, lėtas judesys, judėjimai (keyframe'ai ant žodžių), perkėlimas į kitą sceną; viso video judesio idėja | `src/agent/run/4-motion.ts` | ✓ |
| B2 | Patikra kodu: scenų ir blokų skaičius sutampa; blokas neatsiranda „be efekto“ (būtų matomas prieš savo žodį); įėjimas + išėjimas telpa į bloko laiką; judėjimas – ant pasakyto žodžio, rėmo ribose, neužlipa ant kitos vietos vaizdo; perkelti galima tik paskutinį scenos bloką, į sceną su paveikslėliu, ir tada perėjimas – „cut“ | `src/agent/rules/checkMotion.ts` + testai | ✓ |
| B3 | Žinių bazė: `motion-principles.json` schema ir užkrovimas | `src/agent/knowledge.ts`, `server/agent/knowledge.ts` | ✓ |
| B4 | Promptas: laiko juosta (scenos, tipai, blokai su turiniu, kada ir kur), judesių sąrašas, principai; taisymas su ankstesniu atsakymu | `server/agent/prompts/pickMotion.ts` + testai | ✓ |
| B5 | Agento žingsnis po blokų: pickMotion → checkMotion → vienas taisymas → `run.motion` | `server/agent/steps/5-pictures.ts`, `run.ts` | ✓ |
| B6 | Video: judesys pritaikomas sluoksniams (įėjimai, išėjimai, keyframe'ai, perkėlimas, perėjimai) | `src/agent/projectFromBlocks.ts` + testai | ✓ |
| B7 | Skydelio kortelė „Motion“: idėja, kiekvienos scenos perėjimas ir blokų judesiai, problemos | `src/editor/agent/MotionCard.tsx` | ✓ |

Pastabos po B:
- Perkėlimas (`carry`) padarytas ne per `link`: grandinė (`resolveHoistedLinkGroups`) apima visas scenas nuo pradžios iki galo ir nepaiso `delay`/`exitAt`. Vietoj to – du sluoksniai: blokas lieka iki scenos galo, kitoje scenoje jo kopija (`settled: true` – piešiama jau „atvykusi“, turinys iš naujo nesikuria) nuslenka į pirmą vietą ir išeina, kai ateina tos scenos pirmas blokas.
- Ištaisyta: scenos ilgis buvo skaičiuojamas iš scenos su senu tekstu ekrane, todėl paskutinio bloko išėjimas nukrisdavo už scenos galo ir nesuveikdavo.
- Ištaisyta: didelis skaičius („$20/mo“) išlįsdavo už rėmo – dabar šriftas mažėja, kad tilptų (`src/video/stage/fitText.ts`).

## Kaip tai susiję su esamu planu (docs/d-planas.md)

- Idėja → kabliukas → scenarijus (D4–D6) – **nesikeičia**.
- D7 išdėstymas: ir motion, ir „rec“ video (su tavo įrašais) naudos stage tipus ir
  blokus; 61 maketo logika pašalinta 2026-11-05.
- D8 taisyklės – prisideda tempo taisyklė; D9 kritikas – etapas E; D10 įgarsinimas – ✓ 2026-11-05.

## Kur kas guli

- `src/video/stage/` – išdėstymas, kinetinis tekstas, blokai.
- `src/agent/stylePack.ts`, `knowledge/shared/style-presets/` – stiliaus paketai.
- Agentas: `src/video/stage/blocks.ts`, `4-motion.ts`, `5-voice.ts` (ką modelis atsiunčia);
  `src/agent/rules/checkBlocks.ts`, `checkMotion.ts` (patikra kodu);
  `server/agent/prompts/pickBlocks.ts`, `pickMotion.ts`; `server/agent/steps/5-pictures.ts`,
  `5-voice.ts`; `src/agent/projectFromBlocks.ts`, `agentVoice.ts` (video redaktoriuje).
- Žinios: `knowledge/shared/motion-principles.json`.
- `docs/motion-stilius.md` – judesio ir tempo vertės; `docs/bd/kadrai/insiderforce/` – pavyzdžiai.
