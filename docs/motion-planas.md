# Motion video – ką darome ir ką gausime (2026-11-03)

## Rezultatas

Naudotoja įrašo idėją (bet kokia tema) → agentas sukuria ~30–60 s vertikalų video:
- **apačioje** – didelis kinetinis tekstas: tai, kas sakoma, žodis po žodžio;
- **viršuje** – vaizdas, kuris keičiasi kas 2–3 s ir rodo tai, apie ką kalbama;
- viskas **kanalo stiliumi** (stiliaus paketas: spalvos, šriftas, ženklas);
- rezultatas atsidaro redaktoriuje ir jį galima taisyti rankomis.

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

## Kaip tai susiję su esamu planu (docs/d-planas.md)

- Idėja → kabliukas → scenarijus (D4–D6) – **nesikeičia**.
- D7 išdėstymas: „rec“ video (su tavo įrašais) lieka su 61 maketo pavyzdžiu; **motion**
  video naudoja šiuos blokus.
- D8 taisyklės – prisideda tempo taisyklė; D9 kritikas – etapas E; D10 įgarsinimas – etapas D.

## Kur kas guli

- `src/video/stage/` – išdėstymas, kinetinis tekstas, blokai.
- `src/agent/stylePack.ts`, `knowledge/shared/style-presets/` – stiliaus paketai.
- `src/agent/run/4-beats.ts`, `server/agent/prompts/planBeats.ts` – agento įvykiai
  (etape C keisis į blokus).
- `docs/motion-stilius.md` – judesio ir tempo vertės; `docs/bd/kadrai/insiderforce/` – pavyzdžiai.
