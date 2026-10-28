# Darbų eilė

Vienintelis sąrašas „ką daryti toliau“. Darai iš viršaus į apačią; baigtą punktą pažymi `[x]`.
Kaip daryti (sprendimai) – `docs/bd/sprendimai.md`. Agento žingsnių smulkmenos – `docs/mano-planas.md`.
Kiti planai (`darbu-sarasas.md`, `ai-agentas-planas.md`, `igyvendinimas.md`) – tik fonui, ne eilei.

Kiekvieną punktą darai pati su Claude pagalba: pirma paaiškinimas (kur kode, kodėl), tada rašai,
tada patikra. Kiekvienas punktas – atskiras commitas.

---

## A. Žodynai: kas matyta analizėje ir ką moka TikMaker

Kodėl pirmas: be jo neaišku, ko TikMaker trūksta, ir žinių bazė neturėtų kuo remtis.

- [x] **A0. Analizės žodynas vienoje vietoje.** `knowledge/shared/vocabulary.json`, skaito `analysisStats.ts` ir `analyzeVideos.ts`.
- [ ] **A1. Aiškūs pavadinimai.** `vocabulary.json` → `analysis-vocabulary.json`, `src/knowledge/vocabulary.ts` → `analysisVocabulary.ts` (`analysisVocabulary`, `AnalysisVocabularyField`), pataisyti importus abiejuose skriptuose.
  Patikra: `npm run analysis:stats` → 0 klaidų; `npx tsx scripts/analyzeVideos.ts` → `0 analysed`.
- [ ] **A2. Redaktoriaus vaidmenys iš analizės žodyno.** `src/schema/scene.ts`: `scenePlanRoleSchema` = `analysisVocabulary.role`.
  Patikra: `npx tsc --noEmit` be naujų klaidų; storyboard lauke „Role“ 14 reikšmių.
- [ ] **A3. Ką moka TikMaker – vienoje vietoje.** Naujas `src/schema/capabilities.ts`: visi TikMaker sąrašai (fonai, atsiradimo / išėjimo animacijos, Ken Burns, perėjimai, išdėstymai, teksto dydžiai, šriftai, scenų tipai, vaizdinių tipai). `scene.ts` ir `visual.ts` juos importuoja iš čia.
  Patikra: `npx tsc --noEmit`, `npm test`, redaktorius veikia kaip anksčiau.
- [ ] **A4. Vertimo lentelė ir spragų ataskaita.** `knowledge/shared/analysis-to-tikmaker.json` (kiekvienam analizės žodžiui – TikMaker atitikmuo arba `null`) + skriptas `npm run tikmaker:gaps` → `docs/bd/tikmaker-spragos.md` (surikiuota pagal dažnį, ✅ / ❌). Skriptas nepraleidžia, jei žodyne yra žodis be vertimo.
  Patikra: ataskaitoje matosi tos pačios spragos kaip B sąraše.

## B. TikMaker spragos (iš analizės)

Kodėl dabar: agentas galės naudoti tik tai, ką TikMaker moka. Eilė – nuo mažiausių ir dažniausių.
Po kiekvieno punkto: papildyti `capabilities.ts` ir vertimo lentelę, paleisti `tikmaker:gaps` – spraga dingsta.

| # | Ką padaryti | Kodėl (analizė) | Dydis |
|---|---|---|---|
| - [ ] B1 | Patikrinti savų paveikslėlių importą (iliustracijos, nuotraukos) | iliustracijos 13 %, nuotraukos 5 % elementų | patikra |
| - [ ] B2 | Žodžio paryškinimas pusjuodžiu (`highlights` stilius: spalva / pusjuodis / pill) | pusjuodis 11 % teksto blokų | mažas |
| - [ ] B3 | Video fonas (`custom` fonas + `video`) | video fone 20 % scenų | mažas |
| - [ ] B4 | Efektai elementams: šešėlis / švytėjimas / kontūras | šešėlis 58 %, švytėjimas 13 %, kontūras 12 % efektų | vidutinis |
| - [ ] B5 | Kalbančios galvos komponentas: apskritimo rėmelis + padėtys (visas ekranas, pusė viršuje / apačioje, apskritimas 4 kampuose) | talking-head 4 % elementų; agentas siūlo, kai idėjoje pažymėta „Su veidu“ | mažas–vidutinis |
| - [ ] B6 | „Draw-on“: linijos ir apibraukimai nusipiešia | draw-on 3 % atsiradimų (diagramos) | mažas |
| - [ ] B7 | Subtitrų stiliai (šriftas, spalva, kontūras) | subtitrai 67 % video | mažas |
| - [ ] B8 | `tool-logo` → bendras „ikona / logotipas“ su bibliotekos kategorijomis | ikonos 13 % elementų | mažas |
| - [ ] B9 | Foninė muzika: biblioteka / įkėlimas, pritaikymas prie ilgio, patylinimas kalbant | muzika 80 iš 88 video | vidutinis |

Jei laiko trūks: B9, B3, B4 svarbiausi; kitus galima daryti po to, kai agentas veiks.

## C. Žinių bazė

Išsamiau: `docs/mano-planas.md` 1 žingsnis (schemos), `docs/bd/sprendimai.md` „Žinių bazė“.

- [ ] **C1. Žinių bazės schemos** (`VideoTemplate`, `SceneTemplate`, `HookFormula`, `CtaFormula`, `TitleFormula`, `TransitionPhrase`, `LayoutExample`, `DesignRule`, `SoundRule`) pagal `docs/bd/diagramos/ziniu-baze.puml` + įkėlimas ir testas.
- [ ] **C2. 3 promptas** pataisytas pagal schemas ir žodyną → paleistas → `knowledge/draft/` → patikra schemomis.
- [ ] **C3. Peržiūra** (tu) → `knowledge/shared/`. Vertimas į TikMaker žodį (A4 lentelė) daromas čia, skriptu.
- [ ] **C4. Kadrai** (`npm run videos:frames`, tavo kompiuteryje) → tu atrenki gerus / blogus → `LayoutExample`.
- [ ] **C5. Taisyklės** iš statistikos (p90) → `DesignRule`, `SoundRule`.

## D. Agentas

`docs/mano-planas.md` 2–9 žingsniai: pirmas DI kvietimas → paleidimas fone → šablonas, kabliukai, scenarijus → sąsaja → išdėstymai ir kompiliatorius → taisyklės ir taisymo ciklas → kadrų vertinimas → ataskaita.

## E. Testavimas (BD 4 skyrius)

`docs/mano-planas.md` 10 žingsnis.

## F. Diegimas (BD 5 skyrius)

Desktop programa (Electron): langas + vietinis serveris, duomenys naudotojo aplanke (`TIKMAKER_ROOT`), atvaizdavimas per `@remotion/renderer` vietoj `npx remotion`, diegimo failas (`electron-builder`), DI raktai nustatymuose.
