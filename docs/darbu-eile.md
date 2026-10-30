# Darbų eilė

Vienintelis sąrašas „ką daryti toliau“. Darai iš viršaus į apačią; baigtą punktą pažymi `[x]`.
Kaip daryti (sprendimai) – `docs/bd/sprendimai.md`. Agentas ir jo sąsaja žingsnis po žingsnio –
**`docs/d-planas.md`** (būsena, failai, darbo taisyklės); „Išmoksiu“ ir gynimo klausimai – `docs/mano-planas.md`.
Kiti planai (`darbu-sarasas.md`, `ai-agentas-planas.md`, `igyvendinimas.md`) – tik fonui, ne eilei.

Kiekvieną punktą darai pati su Claude pagalba: pirma paaiškinimas (kur kode, kodėl), tada rašai,
tada patikra. Kiekvienas punktas – atskiras commitas.

---

## A. Žodynai: kas matyta analizėje ir ką moka TikMaker

Kodėl pirmas: be jo neaišku, ko TikMaker trūksta, ir žinių bazė neturėtų kuo remtis.

- [x] **A0. Analizės žodynas vienoje vietoje.** `knowledge/shared/vocabulary.json`, skaito `analysisStats.ts` ir `analyzeVideos.ts`.
- [x] **A1. Aiškūs pavadinimai.** `vocabulary.json` → `analysis-vocabulary.json`, `src/knowledge/vocabulary.ts` → `analysisVocabulary.ts` (`analysisVocabulary`, `AnalysisVocabularyField`), pataisyti importus abiejuose skriptuose.
  Patikra: `npm run analysis:stats` → 0 klaidų; `npx tsx scripts/analyzeVideos.ts` → `0 analysed`.
- [x] **A2. Redaktoriaus vaidmenys iš analizės žodyno.** `src/schema/scene.ts`: `scenePlanRoleSchema` = `analysisVocabulary.role`.
  Patikra: `npx tsc --noEmit` be naujų klaidų; storyboard lauke „Role“ 14 reikšmių.
- [x] **A3. Ką moka TikMaker – vienoje vietoje.** Naujas `src/schema/capabilities.ts`: visi TikMaker sąrašai (fonai, atsiradimo / išėjimo animacijos, Ken Burns, perėjimai, išdėstymai, teksto dydžiai, šriftai, scenų tipai, vaizdinių tipai). `scene.ts` ir `visual.ts` juos importuoja iš čia.
  Patikra: `npx tsc --noEmit`, `npm test`, redaktorius veikia kaip anksčiau.
- A4 (vertimo lentelė ir spragų ataskaita) perkeltas į „G. Po baigiamojo“.

## B. TikMaker spragos (iš analizės)

Kodėl dabar: agentas galės naudoti tik tai, ką TikMaker moka. Eilė – nuo mažiausių ir dažniausių.
Po kiekvieno punkto: papildyti `capabilities.ts` ir vertimo lentelę, paleisti `tikmaker:gaps` – spraga dingsta.

| # | Ką padaryti | Kodėl (analizė) | Dydis |
|---|---|---|---|
| - [x] B1 | Patikrinti savų paveikslėlių importą (iliustracijos, nuotraukos) | iliustracijos 13 %, nuotraukos 5 % elementų | patikra |
| - [x] B2 | Paryškinimo stilius: dabar tik „pill“ → + spalva ir pusjuodis; redaktoriuje paryškinamų žodžių ir stiliaus pasirinkimas (dabar nėra) | spalva 17 %, pusjuodis 11 %, pill 2 % teksto blokų | vidutinis |
| - [x] B3 | Video fonas (`custom` fonas + `video`), plačiam video / paveikslėliui – fokusas X / Y ir priartinimas | video fone 20 % scenų | mažas |
| - [x] B4 | Efektai elementams: šešėlis / švytėjimas / kontūras | šešėlis 58 %, švytėjimas 13 %, kontūras 12 % efektų | vidutinis |
| - [x] B5 | Kalbančios galvos komponentas: apskritimo rėmelis + padėtys (visas ekranas, pusė viršuje / apačioje, apskritimas 4 kampuose) | talking-head 4 % elementų; agentas siūlo, kai idėjoje pažymėta „Su veidu“ | mažas–vidutinis |
| - [x] B6 | „Draw-on“: linijos ir apibraukimai nusipiešia | draw-on 3 % atsiradimų (diagramos) | mažas |
| - [x] B7 | Subtitrų stiliai (šriftas, spalva, kontūras) | subtitrai 67 % video | mažas |
| - [x] B8 | `tool-logo` → bendras „ikona / logotipas“ su bibliotekos kategorijomis | ikonos 13 % elementų | mažas |
| - [x] B9 | Foninė muzika: biblioteka / įkėlimas, pritaikymas prie ilgio, patylinimas kalbant | muzika 80 iš 88 video | vidutinis |
| - [x] B10 | Redaktorius: pasirinktą (laiko juostoje) elementą tempti peržiūroje už bet kurios vietos, ne tik už mažo taškiuko | taškiukai susipainioja, neaišku, kurį elementą pagriebsi | mažas–vidutinis |

Jei laiko trūks: B9, B3, B4 svarbiausi; kitus galima daryti po to, kai agentas veiks.

## C. Žinių bazė

Išsamiau: `docs/mano-planas.md` 1 žingsnis (schemos), `docs/bd/sprendimai.md` „Žinių bazė“.

- [x] **C1. Žinių bazės schemos** (`VideoTemplate`, `SceneTemplate`, `HookFormula`, `CtaFormula`, `TitleFormula`, `TransitionPhrase`, `LayoutExample`, `DesignRule`, `SoundRule`) pagal `docs/bd/diagramos/ziniu-baze.puml` + įkėlimas ir testas.
- [x] **C2. Juodraštis.** `knowledge/draft/proposal.json` (grupavimas ir formuluotės; pirmąjį sudarė Claude Code pagal 3 prompto taisykles) → `npm run knowledge:draft` suskaičiuoja scenas, trukmes ir pavyzdžius → `knowledge/draft/shared/`. 3 promptas paruoštas pakartojimui (Gemini AI Studio), dar nepaleistas.
- [x] **C3. Perkėlimas** → `knowledge/shared/` (20 šablonų, formulės, frazės). Išsami peržiūra atidėta: šablonai taisomi tada, kai generuojant video kas nors netinka (`proposal.json` → `npm run knowledge:draft` → kopija į `knowledge/shared/`). Vertimas į TikMaker žodį (A4 lentelė) reikalingas tik išdėstymams (C4).
- [x] **C4. Kadrai.** Rinkti ranka (ne `npm run videos:frames`): 61 geras kadras `docs/bd/kadrai/geri/` → `knowledge/shared/layout-examples/*.json` (dėžutės x, y, w, h, fonas, teksto stilius, subtitrų aukštis, perėjimai `continuity`). Sąrašas: `docs/bd/kadrai/kadru-rinkimas.md`. Blogų kadrų dar nėra; trūksta reveal, setup, problem po 1–3.
- [x] **C5. Taisyklės** iš statistikos (p90) → `knowledge/shared/design-rules.json` (6 įspėjimai: žodžiai ekrane, scenos ir kabliuko trukmė, garsų tankis, kalbėjimo greitis, vaizdo pasikeitimas); patikros kodas `src/agent/rules/` (`runRules`). Video trukmė ir elementai vienu metu sąmoningai netikrinami; `SoundRule` atidėtas (agentas garsų nedėlioja).

## D. Agentas

**`docs/d-planas.md`** – kiekvienas žingsnis su serverio ir sąsajos dalimi:
- [x] D2. Pirmas DI kvietimas (`server/agent/llm.ts`)
- [ ] D3. Paleidimas fone + AI skydelio karkasas (serveris padarytas, liko skydelis)
- [ ] D4. Šablono parinkimas · D5. Kabliukai · D6. Scenarijus
- [ ] D7. Išdėstymas ir kompiliatorius · D8. Taisyklės ir taisymo ciklas
- [ ] D9. Kadrų vertinimas (nebūtinas) · D10. Įgarsinimas, ataskaita, rezultatas

## E. Testavimas (BD 4 skyrius)

`docs/mano-planas.md` 10 žingsnis.

## F. Diegimas (BD 5 skyrius)

Desktop programa (Electron): langas + vietinis serveris, duomenys naudotojo aplanke (`TIKMAKER_ROOT`), atvaizdavimas per `@remotion/renderer` vietoj `npx remotion`, diegimo failas (`electron-builder`), DI raktai nustatymuose.

## G. Po baigiamojo

- [ ] **Automatinė analizė programoje.** Naudotojas įkelia video nuorodas → analizė (Gemini), statistika ir žinių bazės papildymas paleidžiami automatiškai.
- [ ] **Vertimo lentelė ir spragų ataskaita** (buvęs A4). Reikalinga automatinei analizei: naujuose video atsiradus tam, ko TikMaker nemoka, ataskaita tai parodo. Lentelės juodraštis: `knowledge/shared/analysis-to-tikmaker.json`; ataskaitos skripto (`npm run tikmaker:gaps`) kodas – Claude pokalbyje 2026-10-28.
