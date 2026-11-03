# Motion stilius (tamsus fonas) – aprašas

Šaltinis: 4 InsiderForce video (0JZtdAtJiyk, MBAwGQTOOe4, aX7QAfld7hs, g3Mh8Hws-jo),
išanalizuoti Gemini AI Studio (2026-11-03). Imame **judesį, tempą, gylį ir šlifavimą**, o ne
jų spalvas ar prekės ženklą. Mūsų fonas **tamsus**, paletė mūsų.

Pastaba dėl patikimumo: skaičiai yra Gemini įvertis, ne matavimas. Visuose 4 video jie labai
panašūs (ypač šešėliai), todėl tinka kaip **pradinės vertės**, o galutinai derinama akimis.
Ketvirto video `keyMoments` laikai klaidingi (0,35–3,12 s 107 s video), jų nenaudojam.

## 1. Pagrindinė mintis

Trys dalykai, kurie video daro „gyvą“:
1. **Niekas niekada nestovi.** Ilgiausia ramybė – iki ~1 s. Po įėjimo kortelės plūduriuoja,
   kamera lėtai artėja, fone sukasi dekoracijos.
2. **Kiekvienas įėjimas „atšoka“.** Spyruoklė su perlėkimu: 0,85 → 1,05 → 1,00.
3. **Gylis per sluoksnius.** Fonas → sulieti dekoratyvūs ženklai → kortelės su dvigubu
   šešėliu → tekstas ir „piliulės“ viršuje.

## 2. Vertės: jų video → mūsų (tamsus fonas) → dabar kode

| Kas | Jų video (4 video mediana) | Mūsų vertė | Dabar kode | Spraga |
|---|---|---|---|---|
| **Tempas** – vaizdas keičiasi kas | 0,85–1,4 s | ~1,2 s | priklauso nuo scenos, dažnai 3–5 s be pokyčio | **didelė** |
| **Įėjimo spyruoklė** | damping ~12, stiffness ~200, mass 0,6 (aiškus atšokimas) | tokia pati | `entrances.ts:13` – damping **200** (jokio atšokimo) | **didelė** |
| **Kortelės įėjimas** | iš apačios 5–12 % aukščio, scale 0,88 → 1,03–1,05 → 1, 11–16 kadrų | tokia pati | slide be scale, be atšokimo | didelė |
| **Plūduriavimas po įėjimo** | ±6–10 px, periodas 2,4–4 s, be pasvirimo | ±8 px, 2,8 s (84 kadrai) | `kenBurns.ts` `float`: ±30 px, pasvirimas ±11°, ~19 s periodas, įjungtas ne visada | didelė (per daug ir per lėtai) |
| **Kamera** | lėtas priartėjimas 1,00 → 1,03 per ~3 s + staigus „smūgis“ +2,5–5 % ant kertinio žodžio, atgal per 6 kadrus | tokia pati | scenos kameros nėra; `zoomIn` 1 → 1,14 tik medžiagos rėmeliams | didelė |
| **Kortelės kampai** | 2–6 % pločio (~20–40 px) | 28 px | 14–20 px | maža |
| **Kortelės šešėlis** | dvigubas: artimas `0 4px 10px` + platus `0 24px 50px` | ant tamsaus fono juodas šešėlis beveik nematomas → žr. 3 skyrių | vienas `drop-shadow(0 18px 36px)` | vidutinė |
| **Kortelės kraštas** | 1–1,5 px pusiau permatomas | 1 px `rgba(255,255,255,0.10)` | yra kai kuriuose (`Terminal`, `CodeDiff`) | maža |
| **Antraštė** | 7,4–9,2 % pločio (80–100 px), storis 800, iki 7–9 žodžių | 88 px, 700–800, iki 8 žodžių | – | patikrinti |
| **Teksto įėjimas** | **žodis po žodžio**, scale 0,85 → 1,06 → 1, y +18 px, 8–11 kadrų, tarp žodžių 3 kadrai, 1–2 kadrais **prieš** balsą | tokia pati | `splitAnimate` yra, bet numatytai neįjungtas | vidutinė |
| **Teksto išėjimas** | 4–6 kadrai: išblunka ir pasislenka 10–20 px | tokia pati | perėjime antraštės persidengia | **klaida** |
| **Akcentinis žodis** | „piliulė“ arba apversta dėžutė už žodžio, storis 400 → 800, scale +8 % | akcento spalvos dėžutė už žodžio | `RichHeadline` – patikrinti | vidutinė |
| **„Piliulės“** | aukštis 3–5 % kadro, pilnai apvalios, ikona kairėje, DIDŽIOSIOS, 700–800, `letter-spacing 0.05em`; įėjimas scale 0,7 → 1,06 → 1 per ~12 kadrų | tokia pati, užpildas – permatomas paviršius su 1 px kraštu | atskiro komponento nėra | **trūksta** |
| **Sąrašai** | eilutė kas 4–6 kadrus, ikona iššoka (0 → 1,15 per 6 kadrus), tekstas atslenka iš kairės 30–40 px | tokia pati | `Checklist` – patikrinti tempą | vidutinė |
| **Diagramos** | linija **nusibrėžia** (`strokeDashoffset`) per 8–12 kadrų, kai pasiekia mazgą – mazgas „pulsuoja“ 1 → 1,12 → 1 | tokia pati | `Flow`, `Line` – patikrinti | vidutinė |
| **Skaitikliai** | 14–22 kadrai, ease-out, pabaigoje scale 1,05–1,08 pop, skaitmenys vienodo pločio | tokia pati | `StatCounter` yra | maža |
| **Ikonos** | scale 0,2 → 1,15–1,2 → 1 su pasisukimu −15°…90° → 0, 10–12 kadrų | tokia pati | – | vidutinė |
| **Perėjimai** | dažniausiai **kirpimas** su tęsiamu judesiu; „push“ aukštyn 8–10 kadrų su judesio suliejimu; kartais „zoom-through“ (1 → 1,35, 12 kadrų) ir bendro elemento virsmas | tokia pati | – | vidutinė |
| **Fonas** | tinklelis su kryželiais; 2–3 dideli sulieti dekoratyvūs ženklai kampuose sukasi ~12–15°/s ir plūduriuoja ±12–14 px | tamsus tinklelis `rgba(255,255,255,0.05)` + sulieti akcento spalvos ženklai | `DotGrid`, `SoftGrid` yra, bet nejuda | vidutinė |
| **Garsai** | „whoosh“ 1–2 kadrais prieš kortelę; „pop/click“ – ant atšokimo viršūnės; „thud“ – ant skaitiklio pabaigos | tokia pati | `SceneSfx` yra | maža |

## 3. Tamsaus fono pritaikymas

Šviesiame fone kortelę „pakelia“ juodas šešėlis. Tamsiame fone jis beveik nematomas, todėl
gylis kuriamas kitaip:

- **Paviršiaus šviesumas:** fonas `#0D0D10`, kortelė šviesesnė (`#17171C`), „piliulė“ dar
  šviesesnė (`#22222A`). Kuo arčiau žiūrovo, tuo šviesiau.
- **Viršutinis kraštas:** 1 px `rgba(255,255,255,0.10)`, o viršuje ryškesnis
  (`inset 0 1px 0 rgba(255,255,255,0.08)`) – tarsi šviesa krenta iš viršaus.
- **Šešėlis stipresnis:** `0 4px 12px rgba(0,0,0,0.45), 0 28px 60px rgba(0,0,0,0.55)`.
- **Akcento švytėjimas** tik svarbiausiam elementui scenoje: `0 0 40px` akcento spalva 25 %.
- **Fono dekoracijos:** akcento spalvos, 20–30 % ryškumo, suliejimas 8–12 px.

## 4. 5 svarbiausi principai (bendri visiems 4 video)

1. **Spyruoklė su atšokimu** visiems įėjimams (0,88 → 1,05 → 1,00 per 10–16 kadrų).
2. **Nuolatinis plūduriavimas ir kameros priartėjimas** – kadras niekada nesustingsta.
3. **Dvigubas šešėlis / sluoksniuotas gylis** (tamsiame fone – šviesumas + kraštas + šešėlis).
4. **Žodis po žodžio** tekstas su akcentine „piliule“ ant kertinio žodžio, 1–2 kadrais prieš balsą.
5. **Laiptuoti sąrašai ir tinkleliai** – 3–6 kadrų tarpai tarp elementų.

## 5. Ką daryti (eilės tvarka)

| # | Kas | Kur | Dydis |
|---|---|---|---|
| 1 | Spyruoklių vertės su atšokimu (vienoje vietoje, kad visi naudotų tas pačias) | `src/video/motion/entrances.ts`, `easing.ts` | mažas |
| 2 | Plūduriavimas ±8 px / 2,8 s ir scenos kamera 1 → 1,03 visada | `kenBurns.ts`, `SceneFrame.tsx` | mažas |
| 3 | Kortelių gylis tamsiam fonui (paviršius, kraštas, dvigubas šešėlis) | `visualEffects.tsx`, `tokens.ts` | mažas |
| 4 | Teksto išėjimas ir antraščių persidengimo taisymas | `RichHeadline.tsx`, scenos | mažas |
| 5 | Tekstas žodis po žodžio + akcentinė „piliulė“ | `splitAnimate.tsx`, `RichHeadline.tsx` | vidutinis |
| 6 | Naujas komponentas „piliulė“ (ikona + tekstas) | `src/video/visuals/` | vidutinis |
| 7 | Gyvas fonas: tinklelio dreifas + sulieti besisukantys ženklai | `backgrounds/` | vidutinis |
| 8 | Sąrašai, diagramų linijų brėžimas, ikonų iššokimas | `Checklist`, `Flow`, `Line` | vidutinis |
| 9 | Perėjimai: push aukštyn, zoom-through, kamera „smūgis“ ant kertinio žodžio | `motion/transitions.ts` | vidutinis |

Patikra: tas pats projektas (`claude-code-hooks-explained`) išrenderinamas prieš ir po,
kadrai lyginami šalia InsiderForce kadrų.
