# Darbų sąrašas

> Eilė „ką daryti toliau“: `docs/darbu-eile.md`. Šis failas – fonui.

## Baigiamojo darbo Aprašas

Karkasas: **`docs/bd/BD-aprasas-karkasas.docx`** (tavo praktikos ataskaitos stiliai, metodinių EI V2-30 struktūra,
juodraščio tekstai, oranžinės „Gairė“ pastabos, geltoni [PAPILDYTI] / [PATIKRINTI], pilkos vietos paveikslams).
Pergeneruoti: `python3 scripts/bd2docx.py <praktikos-ataskaita.docx> . docs/bd/BD-aprasas-karkasas.docx`.

Kur kuris uždavinys:
| Uždavinys | Aprašo vieta |
|---|---|
| 1. Analizė + reikalavimai | Įvadas (trumpa apžvalga, privaloma) + **1 skyrius**: 1.1 panašios sistemos, 1.2 video analizė, 1.3 FR, 1.4 NFR |
| 2. Projektavimas | **2 skyrius**: 2.1 panaudos atvejai, 2.2 veiklos, 2.3 agento šablonai, 2.4 žinių bazė, 2.5 kompozicijos, 2.6 patikra, 2.7 architektūra, 2.8 maketai |
| 3. Realizacija | **3 skyrius** |
| 4. Testavimas | **4 skyrius** (5 – diegimo instrukcija, privaloma visiems) |

1 uždavinio užbaigimas (dabar):
- [ ] Peržiūrėti Įvadą karkase (sutrumpintas iš `docs/bd/1-ivadas.md`), užpildyti [PATIKRINTI] šaltinius.
- [ ] Peržiūrėti FR / NFR v2 (1.3, 1.4); suderinti su vadove 1 ir 2 skyrių padalijimą – ar viskas atitinka norimą sistemą.
- [ ] Nauji video (C skiltis) → `videos:analyze` → `analysis:stats` → pergeneruoti karkasą (1.2 ir 7 priedo lentelės atsinaujina pačios).
- [ ] 3 promptas → šablonai (A skiltis) → 1.2 išvadas papildyti šablonų sąrašu.

## 1 etapas: video analizė iš naujo (DABAR)

Planas: **`docs/bd/analizes-planas.md`**. Promptas: `docs/bd/video-analizes-promptas.md` (1 promptas v2).
- [ ] (tu) Rinkti 50–70 naujų nuorodų → `docs/bd/rinkimas/video-nuorodos.txt` (senos 53 jau įrašytos).
- [x] (aš) Skriptai `videos:analyze`, `videos:frames` (paleidimas: `docs/bd/analizes-planas.md`, „Kaip paleisti namie“).
- [ ] (tu) Gemini raktas → `.env.local`, paleisti skriptus namie (visos ~110 video, ir senos).
- [ ] (tu) Peržiūrėti ~220 atsitiktinių kadrų: geri → `kadrai/geri/`, blogi → `kadrai/blogi/`, kiti – ištrinti.

## Dabar, eilės tvarka (be programavimo, galima daryti darbe)

### A. Analizės → žinių bazė (3 etapai)

Visi trys etapai aprašyti viename faile: **`docs/bd/video-analizes-promptas.md`**.

| Etapas | Kas | Kur faile | Būsena |
|---|---|---|---|
| 1 | **1 promptas**: vieno video analizė (AI Studio, 1 video = 1 pokalbis) | skiltis „1 promptas. Vieno video analizė“ | ✓ 53 analizės `docs/bd/analizes/` |
| 2 | **Skriptas** (ne promptas): žodyno patikra + skaičiai. `npm run analysis:stats` → `docs/bd/analizes-statistika.md`, `analizes-statistika.json`, `analizes-rinkinys.json` | skiltis „2 etapas. Skaičiai skriptu“; kodas `scripts/analysisStats.ts` | ✓ padaryta, klaidų 0 |
| 3 | **3 promptas**: visos analizės → šablonai, kabliukų / CTA / pavadinimų formulės | skiltis „3 promptas. Apibendrinimas į žinių bazę“ | ☐ **tavo eilė** |

3 etapo žingsniai:
- [ ] `git pull origin main` (arba atsisiųsti 2 failus iš GitHub).
- [ ] Google AI Studio → naujas pokalbis → prisegti `docs/bd/analizes-rinkinys.json` ir `docs/bd/analizes-statistika.json`.
- [ ] Įklijuoti 3 promptą (blokas tarp ``` žymių).
- [ ] Atsakymą išsaugoti `knowledge/draft/knowledge-draft.json` (jei per ilgas ir nutrūksta: paprašyti „continue“ ir sujungti).
- [ ] Atsiųsti man → kartu peržiūrim šablonus ir formules, tada aš sudedu į `knowledge/`.
- [ ] Jei pataisysi analizes ranka: vėl `npm run analysis:stats` ir 3 promptą iš naujo.

### B. API raktas (5 min)

- [ ] https://aistudio.google.com → „Get API key“ → išsaugoti saugiai (ne į GitHub).
- [ ] AI Studio konsolėje pasižiūrėti savo nemokamus limitus (užklausos per minutę / dieną).

### C. Viskas viename Word faile: `docs/bd/rinkimas/duomenu-rinkimas.docx`

Pildyk darbe, kada patogu. Ekrano nuotraukas klijuok tiesiai į lentelės langelius
(Windows: Win + Shift + S → langelis → Ctrl + V). Skyriai:

| Skyrius | Ką rinkti | Kiek | Kam |
|---|---|---|---|
| 1. Nauji video | tik **nuorodos** į populiarius Shorts (kiti stulpeliai nebūtini) | 30–60, ypač story ir facts | pilna analizė tuo pačiu 1 promptu → nauji šablonai, kabliukai, CTA, kompozicijos, judesys, garsai |
| 2. Geri kadrai | **ekrano nuotraukos** sustabdyto kadro, 9 tipai po 3 | 25–35 | kompozicijų pavyzdžiai DI |
| 3. Blogi kadrai | ekrano nuotraukos + kas blogai | 8–12 | neigiami pavyzdžiai + patikros testas |
| 4. Mano stilius | ekrano nuotraukos + kas patinka | 10–15 | tavo darbo vietos stilius |
| 5. Brief | 10 klausimų apie kanalą | 1 | DI kontekstas darbo vietai |

Su kuo lyginsim: testavimo skyriuje agento sugeneruotus kadrus lyginsim su gerais kadrais (vertinimo
lentelė) ir tikrinsim, ar patikra pagauna blogų kadrų klaidas.

Kai užpildysi (gali ir dalimis):
- [ ] Įkelti užpildytą failą tuo pačiu vardu į `docs/bd/rinkimas/duomenu-rinkimas.docx` (GitHub → Add file → Upload, arba git).
- [ ] Parašyti man → aš ištraukiu:
  - nuorodas → `docs/bd/rinkimas/video-nuorodos.txt` (skriptui);
  - nuotraukas → `docs/bd/design-refs/`, `docs/bd/design-refs/bad/`, `docs/bd/my-style/`;
  - brief → `knowledge/themes/dev/brief.md`.

Skriptas (parašau aš, paleisi namie): `npm run videos:analyze`
- skaito `docs/bd/rinkimas/video-nuorodos.txt`;
- kiekvieną nuorodą siunčia Gemini API su **1 promptu** iš `docs/bd/video-analizes-promptas.md`;
- išsaugo `docs/bd/analizes/<videoId>.json` (jau esami praleidžiami);
- tada `npm run analysis:stats` ir 3 promptas iš naujo → daugiau šablonų ir formulių.
- Reikia tik Gemini API rakto (B) `.env.local`: `GEMINI_API_KEY=...`.

Kabliukų atskirai rinkti nebereikia: 1 promptas kabliuką, CTA ir pavadinimą jau ištraukia.
(`docs/bd/kabliuku-rinkimas.md` lieka atsarginiam variantui.)

### C2. Kadrai automatiškai (vietoj rankinių ekrano nuotraukų)

1 promptas jau grąžina kiekvienos scenos `startSeconds` / `endSeconds`, todėl kadrus galima ištraukti skriptu:
- [ ] (aš) `scripts/extractFrames.ts`: atsisiunčia video (yt-dlp, tik analizei, nepublikuojama) ir ffmpeg ištraukia
      po 1 kadrą iš kiekvienos scenos vidurio → `docs/bd/kadrai/<videoId>/<scena>.jpg`.
- [ ] (aš) 4 promptas: kadras → kompozicija kompozicijų kalba (zonos, elementai, akcentų dydžiai, tekstas)
      + įvertinimas (ar tvarkingas, kas blogai). Rezultatas → kompozicijų pavyzdžiai žinių bazei.
- [ ] (tu) peržiūrėti kadrus ir pažymėti gerus / blogus (užtenka ištrinti netinkamus ar perkelti į `bad/`).
- Rankinių nuotraukų Word faile tada reikia tik blogiems kadrams iš kitur ir tavo stiliui.

### C3. Testinis idėjų rinkinys (4 uždaviniui)

- [ ] (tu) 10–20 idėjų, kurias agentas turės paversti video (skirtingi formatai, su šaltiniu ir be) → `docs/bd/testai/idejos.md`.

### D. Fone, po truputį

- [ ] Analizių `manual.analyzedAt` ir `manual.model`.
- [ ] Peržiūrėti agento šablonų diagramą (skiltis „Tau patikrinti“ žemiau).

### E. Kai galėsi programuoti

`docs/mano-planas.md`: 0 žingsnis (paketai, raktas į `.env.local`) → 2 žingsnis (pirmas DI kvietimas)
→ 1 žingsnis (žinių bazės schemos, kai jau bus šablonai iš A).

---

Eiga: `docs/bd/diagramos/agento-eiga.png` (+ paaiškinimas `agento-eiga.md`).
Agento šablonai: `docs/bd/diagramos/agento-sablonai.png`.
Fronto dizaino promptas: `docs/bd/dizaino-promptas.md`.

Sprendimai:
- Baigiamajame tik **faceless** video: agentas nesiūlo filmuoti veido ar talking-head; išteklių vietos tik ekrano įrašams, nuotraukoms, video be veido.
- DI kūrimui: Gemini API nemokamas lygis per Vercel AI SDK (`ai` + `@ai-sdk/google`); modelis konfigūruojamas,
  galutiniam vertinimui galima perjungti į Claude (`@ai-sdk/anthropic`) ir palyginti.
- Kompozicija gyvena tik generuojant: kompiliatorius ją paverčia į paprastą TikMaker sceną
  su aiškiai įrašytais efektais (`animation`, `entrance`...). Rankiniam redagavimui niekas
  nesikeičia; numatytieji efektai lieka tik ranka pridėtiems elementams. Scenos `plan`
  pasižymi, iš kurios kompozicijos sukurta (`compositionId`).
- Agentas = naujas modulis esamame serveryje (`server/agent/`) + tRPC maršrutai `agent.*`,
  ne naujas serveris.
- Frontas: „Naujas video su DI“ langas, 5 žingsniai: Idėja → Kampas (sprendimas 1) →
  Scenarijus (sprendimas 2) → Kūrimas → Rezultatas. Pataisymų promptas: `docs/bd/dizaino-promptas.md` (Promptas 2).
- Darbo vieta (workspace) pasirenkama prisijungus, ne formoje: vienas kanalas = brief, stilius, biblioteka, formatai.
- Idėja 20–500 simb.; šaltinis: tekstas iki 15 000 simb. arba iki 3 nuorodų.
- Šablono naudotojas nesirenka: DI siūlo 3 kampus (formatas + kabliukas + pirmo kadro eskizas).
- Paieška internete tik su jungikliu (numatyta išjungta, jei yra šaltinis). Atskiro faktų žingsnio nėra:
  faktai rodomi scenarijaus žingsnyje šoniniame skydelyje, prie scenų, kurios juos naudoja.
- Scenarijus: kiekviena scena = balsas + tekstas ekrane + kompozicijos eskizas; galima taisyti, skaidyti, perrašyti.
- Rezultatas: peržiūra + išteklių sąrašas pagal scenas (trumpas pavadinimas, „Details“, „Copy AI prompt“, „Later“).
  Zoom vieta nustatoma iškart įkeliant įrašą, tame pačiame lange.
- Įspėjimai: tik tai, ko taisymo ciklas nepataisė, ir tik tikros problemos (netelpa tekstas, už saugios zonos,
  trūksta ištekliaus) su vienu veiksmu. Patarimų („skaidyk sceną“) rezultate nėra, jie scenarijaus žingsnyje.
  Taisyklės iš dalies jau yra kode: `layerOverflowWarning`, `visualOverflowWarning`, `pacingWarning`.

## Tau patikrinti

- [ ] **Agento šablonų diagrama**: [`docs/bd/diagramos/agento-sablonai.png`](bd/diagramos/agento-sablonai.png)
  (paaiškinimas [`agento-eiga.md`](bd/diagramos/agento-eiga.md), skiltis „Agento šablonai“).
  Eiti nuosekliai, blokas po bloko, ir pažymėti, kas neaišku:
  1. Papildytas LLM (geltona pastaba viršuje): ką gauna kiekvienas kvietimas.
  2. Maršrutizavimas: kaip parenkamas šablonas.
  3. Faktų rinkimas: kada LLM ieško internete ir kada sustoja.
  4. Grandinė: kabliukai → scenarijus → kompozicijos ir vartai (rausvi blokai).
  5. Kodas (ne LLM): kas vyksta be DI.
  6. Vertintojas–tobulintojas: patikros ir taisymo ciklas.
  7. Legenda: kodėl nenaudojami kiti šablonai.
  Palyginti su šaltiniu: https://www.anthropic.com/research/building-effective-agents.
  Neaiškias vietas parašyti man → patobulinsim diagramą.

## Tau surinkti (prieš programuojant)

1. **Analizės**: 53 yra ✓. Į kiekvieno failo `manual` įrašyk `analyzedAt` ir `model`.
2. **Kabliukai**: iš naujų video analizių, žr. „C“ viršuje.
3. **Dizaino kadrai**: 20–30 ekrano nuotraukų gražiai sudėliotų kadrų (kuo įvairesnės
   kompozicijos) → `docs/bd/design-refs/` (pavadinimas `videoId-1.png`).
   Plius 5–10 blogų pavyzdžių (`bad-1.png`), gali būti iš savo senų video.
4. **Tavo stilius**: 10–15 kadrų, kurie atrodo taip, kaip nori, kad atrodytų TAVO
   video (gali būti tavo pačios arba kito kanalo) → `docs/bd/my-style/`.
5. **Pirmo projekto aprašas** (pusė puslapio, laisvai): kam tavo video, tonas,
   ko vengti → `knowledge/themes/dev/brief.md`.

## Aš paruošiu (iš tavo duomenų)

1. ✓ Statistikos skriptas: `npm run analysis:stats` → `docs/bd/analizes-statistika.md` (26 žodyno klaidos pataisytos).
2. ✓ 3 promptas atnaujintas (šablonai su `userFacing`, `slots` fixed/creative, formulės iš KIEKVIENO kabliuko).
   **Tau:** žr. „Dabar, eilės tvarka“ → A, 3 etapas.
3. Skriptas `scripts/analyzeVideos.ts` (`npm run videos:analyze`, Gemini API + 1 promptas) → naujos analizės.
4. Kompozicijų kalba + 15–20 pavyzdžių iš dizaino kadrų (DI kompozicijas kuria pats, pavyzdžiai jį moko).
5. Tavo stiliaus aprašas iš `my-style/` kadrų.

## Programuojam dabar (baigiamasis)

| # | Darbas | Kas keičiasi kode |
|---|---|---|
| 1 | Žinių bazė | `knowledge/` failai + Zod schemos (šablonai, formulės, kompozicijos, stilius) |
| 2 | Scenarijus | šablono parinkimas → 3 kabliukai (pasirinkimai tik kūrybinėms vietoms) → scenarijus |
| 3 | Faktai | nebūtinas šaltinio laukas; paieškos įrankis trūkstamiems faktams (tik jei įjungta); faktų sąrašas su nuorodomis |
| 4 | Scenos plano plėtra | `scene.plan`: + `act`, `connectionToNext`, `transitionPhrase`, `continuity` |
| 5 | Kompozicijos | DI pats kuria kadrą „kompozicijų kalba“ (zona, elemento tipas, akcento dydis); kompiliatorius paverčia į koordinates; pavyzdžiai iš `design-refs/` |
| 6 | Judesys | DI kiekvienam elementui renkasi iš judesių žodyno: atsiradimas (pop, slideUp, scaleIn…), gyvumas (Ken Burns, lėtas zoom, bounce), išėjimas; kompiliatorius paverčia į esamus `entrance` / `kenBurns` / `keyframes` |
| 7 | Tekstas pagal balsą | elementas atsiranda ant nurodyto balso žodžio (`appearsOnWord` → kadras iš ElevenLabs laikų) |
| 8 | Tęstinumas | `continuity`: `new` / `carry:<elementas>` / `zoom-into:<taikinys>`; carry → kiti elementai dedami į laisvą zoną; zoom → keyframes |
| 9 | Fokuso taškas (zoom į įrašo / nuotraukos dalį) | elemento laukas `focus` (x, y, didinimas, % nuo medijos); DI parenka zoną iš 3×3 tinklelio + aprašą („Settings mygtukas“); kompiliatorius → keyframes; redaktoriuje pataisymas vienu paspaudimu ant peržiūros + didinimo slankiklis |
| 10 | Išteklių vietos | REC / IMG / VID su aprašymu; ataskaitoje gamybos planas |
| 11 | Patikra | taisyklės su ribomis iš statistikos (pvz. vaizdas nejuda ilgiau nei N s); vertinimas iš kadrų 1–2 kartus per video |
| 12 | Taisymo ciklas, UI, ataskaita | `server/agent/` + `agent.*` maršrutai; UI: „Naujas video su DI“ (forma → eigos žingsniai → kabliukų kortelės → scenarijaus patvirtinimas → rezultatas + ataskaita), redaktoriuje išteklių vietų sąrašas ir fokuso taškas paspaudus ant peržiūros |

## Jei spėsim

- Kadrų vertinimas su DI (jei ne, patikra tik taisyklėmis).
- Fokuso taško paieška kadre su DI (įkėlus įrašą DI pats randa „Settings mygtuką“).
- Antras projektas su kitu stiliumi (įrodo, kad sistema universali).

## Garso efektai (atskiras darbas, jei spėsim, kitaip po baigiamojo)

DI agentas garsų nedėlioja: juos sudeda sistema pagal taisykles. Bet dabar sistema
tai daro nepilnai. Rasta kode:

1. **Vizualų garsai neveikia automatiškai.** `VisualsLayer.tsx` naudoja tik
   `resolveExplicitSfx`, todėl be rankinio pasirinkimo vizualas garso negauna, o
   `db/sfx-overrides.json` visiems vizualų atsiradimams nustatyta `"none"`.
2. **Scenų perėjimai be garso.** `motion.transition` (push, slide…) garso neturi.
3. **Judesiai be garso.** Keyframe zoom / perstūmimas, carry slinkimas, Ken Burns
   garso negauna, nors analizėse whoosh dažniausiai būna būtent čia.
4. **Taisyklės pagal animaciją, ne pagal prasmę.** Garsas parenkamas pagal
   animacijos pavadinimą (`slideUp` → garsas), o ne pagal tai, kas vyksta
   (skaičius, atskleidimas, klaida, sėkmė). Išimtys tik `StatCounter` ir `Checklist`.
5. **Per daug garsų tekste.** Tekstas, skaidomas į žodžius, kiekvienam žodžiui groja
   `d-word`; nėra ribos „ne daugiau kaip X garsų per sekundę“.
6. **Laikas tik kadrais.** `sfxAt` nurodomas kadrais ranka; nėra „ant žodžio X“.
7. **Neaiški sąsaja.** Garsas parenkamas sąraše prie kiekvieno elemento atskirai
   (`SfxSelect`), be perklausos; nesimato, kodėl „Auto“ parinko tą garsą ir kur
   jis bus; numatytųjų taisyklių keitimas paslėptas.

Ką daryti:
- Viena vieta taisyklėms: `įvykis → garsas` (atsiranda tekstas, atsiranda vizualas,
  perėjimas, zoom, skaičius, sėkmė, klaida, atskleidimas) + ribos (min. tarpas tarp
  garsų, maks. per sceną). Reikšmės iš analizių statistikos.
- Vienas „garsų planuotojas“, kuris pereina visą projektą ir sudeda garsus į
  laiko juostą (vietoj to, kad kiekvienas komponentas grotų savo).
- Sąsaja: garsai matomi laiko juostoje kaip žymės su priežastimi („zoom → whoosh“),
  perklausa, „pakeisti šią vietą“ / „pakeisti taisyklę visur“ / „išjungti“.
- Testai: kiekvienam įvykio tipui yra garsas arba aiškiai `none`.

## Vėliau (po baigiamojo)

- Stiliaus ištraukimas iš kliento kadrų automatiškai.
- Keli stiliai: kiekvienam projektui savas (spalvos, šriftai pagal projektą).
- Nuotraukų ir video generavimas per API (promptai jau bus).
- Agentas, kuris kuria naujus komponentus.
- Darbo vietos nustatymas „pasirodymas kadre“: faceless / filmuoju save / personažas – agentas pagal tai siūlo išteklius.
- Muzikos pasiūlymai: nuotaika, žanras, tempas pagal sceną (analizėje jau renkama `audio.music`, `musicMood`); vėliau – populiarių garsų platformose pasiūlymai (atsižvelgiant į autorių teises).
- Ekrano įrašymas su pelės sekimu → automatinis zoom ten, kur paspausta (kaip Screen Studio).
- Serijų gamyba (daug video iš vieno sąrašo).
