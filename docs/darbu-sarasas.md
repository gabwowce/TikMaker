# Darbų sąrašas

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

### C. Fone, po truputį

- [ ] **Kabliukai**: po 20–30 min per dieną pagal `docs/bd/kabliuku-rinkimas.md` (Promptas A arba B) → `docs/bd/kabliukai/`.
- [ ] Analizių `manual.analyzedAt` ir `manual.model`.
- [ ] Peržiūrėti agento šablonų diagramą (skiltis „Tau patikrinti“ žemiau).
- [ ] Vėliau (prieš kompozicijas): `design-refs/`, `my-style/`, brief (skiltis „Tau surinkti“).

### D. Kai galėsi programuoti

`docs/mano-planas.md`: 0 žingsnis (paketai, raktas į `.env.local`) → 2 žingsnis (pirmas DI kvietimas)
→ 1 žingsnis (žinių bazės schemos, kai jau bus šablonai iš A).

---

Eiga: `docs/bd/diagramos/agento-eiga.png` (+ paaiškinimas `agento-eiga.md`).
Agento šablonai: `docs/bd/diagramos/agento-sablonai.png`.
Fronto dizaino promptas: `docs/bd/dizaino-promptas.md`.

Sprendimai:
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
2. **Kabliukai**: 100+ pagal `docs/bd/kabliuku-rinkimas.md` → `docs/bd/kabliukai/`.
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
3. Kabliukų / CTA formulės iš surinktų kabliukų.
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
- Ekrano įrašymas su pelės sekimu → automatinis zoom ten, kur paspausta (kaip Screen Studio).
- Serijų gamyba (daug video iš vieno sąrašo).
