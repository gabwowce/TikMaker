# AI agentas trumpiems video: darbų planas (2 mėn.)

Baigiamojo darbo objektas yra **AI agentas**, kuris iš idėjos sukuria beveik
galutinį trumpo vertikalaus video projektą. TikMaker (scenos, vizualai,
redaktorius, balsas, renderis) yra **resursai**, kuriais agentas naudojasi.
Darbe jie minimi, bet į juos nesigilinama.

Temos registravimo lapo tekstas yra `docs/temos-registravimo-lapas.md`.

---

## Atitiktis metodiniams nurodymams (EI V2-30): rizikos ir ką daryti

BD = **Programa** + **Aprašas**. Programos tinkamumas vertinamas kaip
programų sistemos, ne kaip turinio kūrimo projekto. Iš nurodymų išplaukia:

| Reikalavimas (nurodymai) | Rizika šiam darbui | Ką darome |
|---|---|---|
| Programa netinkama, jei esminę dalį realizuoja trečiųjų šalių API ar parengti modeliai, o studentas tik juos sujungia (1.1.3) | Agentas = „kviečia Claude API“ | Esminė dalis yra **sava logika**: etapų orkestravimas, žinių bazės modelis ir parinkimas, kadrų **kompiliatorius**, **taisyklių variklis**, taisymo ciklas su įrankiais, validacija. Aprašo realizacijos skyrius rodo būtent šias dalis, o LLM yra vienas komponentas |
| Netinkama, jei pateikiamas anksčiau sukurtas darbas, aiškiai neatskiriant naujos dalies (1.1.3) | TikMaker sukurtas anksčiau | Visas agento kodas atskiruose aplankuose (`server/agent/`, `src/agent/`, `src/schema/knowledge.ts`, `knowledge/`, UI komponentai `src/editor/agent/`). Apraše TikMaker aprašomas kaip **esama platforma**, o indėlis įvardijamas aiškiai. Git istorija rodo, kas sukurta BD metu. **Suderinti su vadovu** |
| ≥2000 savarankiškai parašyto kodo eilučių, be automatiškai sugeneruoto kodo (1.1.2) | Kodas rašomas su AI pagalba | DI kaip pagalbinė priemonė leidžiama (1 lent. 8 p.; DI gairės 14.1), bet **privaloma nurodyti Apraše**, ir studentė turi **gebėti paaiškinti ir modifikuoti** kiekvieną dalį (1 lent. 1 p.). Vesti DI naudojimo žurnalą; kiekvieną modulį perskaityti ir suprasti prieš kitą |
| Savaime: Programa ne vien UI ir ne vien CRUD (1.1.3) | — | Tenkinama (orkestravimas, kompiliatorius, taisyklės) |
| Funkciniai reikalavimai turi būti patikrinami (1 lent. 2, 9 p.) | LLM atsakymai nedeterministiniai | Testai su **užfiksuotais LLM atsakymais** (mock), kad testai būtų pakartojami; vienetų testai kompiliatoriui ir taisyklėms |
| DI gairės: autorių teisės (10 p.) | Žinių bazei renkami kitų video kadrai | Naudojami tik analizei, šaltiniai nurodomi `sources.md` ir Apraše; jokie svetimi kadrai nepatenka į generuojamus video |
| DI gairės: kritiškumas (8 p.) | — | Būtent tam yra patikros ciklas ir žmogaus patvirtinimo taškai, tai paminėti Apraše |

### Aprašo struktūra pagal nurodymus

| Skyrius | Apimtis | Ką rašyti |
|---|---|---|
| Įvadas | 3–5 psl. | Problema, panašių sistemų analizė (CapCut AI, InVideo, Pictory, Opus Clip, Submagic…), tikslas, uždaviniai, priemonės (TypeScript, React, Node/tRPC, Zod, Remotion, Claude API, ElevenLabs) ir kodėl |
| Užduoties analizė | ≥15 psl. | Funkciniai ir nefunkciniai reikalavimai; panaudos atvejų diagrama; veiklos diagrama (agento eiga); ERD (žinių bazė, agento run'as, projektas); komponentų / klasių diagrama; UI maketai; žinių bazės sudarymo metodika |
| Realizacija | ≥15 psl. | Moduliai; LLM sluoksnis (struktūrizuota išvestis, validacija, pakartojimai, kešavimas); žinių bazės parinkimas; kompiliatorius; taisyklių variklis; taisymo ciklas su įrankiais; vizualinė patikra; API (tRPC); kodo fragmentai (Courier New 10 pt, ≤ pusė puslapio) |
| Testavimas | 3–5 psl. | Metodika; vienetų testai (kompiliatorius, taisyklės); integraciniai (agentas su mock LLM); funkcinių reikalavimų lentelė; nefunkciniai (laikas, kaina, pažeidimų dalis); **rezultatų įvertinimas** (8–10 idėjų: su taisymo ciklu ir be jo) |
| Diegimo ir naudotojo instrukcija | 3–5 psl. | Priklausomybės, `.env.local` raktai, paleidimas, naudojimas, šalinimas |
| Išvados | 1–2 psl. | Bent viena išvada kiekvienam uždaviniui |
| Šaltiniai | ≥7 | APA; LLM agentų, RAG, LLM-as-judge straipsniai, įrankių dokumentacija (konkretūs puslapiai), trumpų video tyrimai |

Gynimui taip pat reikia **vaizdo įrašo**, paaiškinančio Programos veikimą. Jį
galima sukurti pačiu TikMaker.

---

## Esmė: žinių bazė + agentas

Agentas neanalizuoja rinkos kiekvieną kartą. **Analizė daroma vieną kartą**
(tu, su AI pagalba) ir jos rezultatas tampa **žinių baze**: struktūrizuotais
failais. Kiekvieno paleidimo metu agentas iš tos bazės **parenka** tai, kas
tinka idėjai, ir **pritaiko**.

```
VIENĄ KARTĄ (tu, 1–3 sav.)            KIEKVIENĄ KARTĄ (agentas, ~1–2 min.)
──────────────────────────            ────────────────────────────────────
Rinkos analizė                        Idėja + tema
  ├ 20–30 sėkmingų video/temai          │
  ├ kadrai + transkriptai               ▼
  ▼                                   Parenka šabloną  ◄── žinių bazė
Žinių bazė  knowledge/                  │ (arba pasiūlo naują)
  ├ šablonai (video struktūros)         ▼
  ├ kabliukai (hook formulės)         3 kabliukų variantai ◄── žinių bazė
  ├ dizaino pavyzdžiai (gerai/blogai)   │ tu pasirenki
  └ temos aprašas + taisyklės           ▼
                                      Scenarijus → tu patvirtini
                                        │
                                        ▼
                                      Kadrai ◄── temos resursai + taisyklės
                                        │
                                        ▼
                                      Patikra ◄── taisyklės + dizaino pavyzdžiai
                                        │ ↺ taisymas (maks. 3 ratai)
                                        ▼
                                      Projektas redaktoriuje
```

### Ar tai ne paprastas if-else?

Ne. If-else reikštų, kad tu iš anksto surašai „jei idėja apie X, imk šabloną
Y“. To neįmanoma surašyti, nes idėja yra laisvas tekstas. Agentas daro tris
dalykus, kurių taisyklėmis neaprašysi:

1. **Sieja laisvą idėją su tinkamiausiu bazės įrašu** ir paaiškina, kodėl.
2. **Pritaiko formulę konkrečiai idėjai.** Kabliuko formulė „Tu darai X
   neteisingai“ tampa konkrečiu sakiniu apie konkrečią problemą.
3. **Pastebi, kai niekas netinka**, ir pasiūlo naują įrašą (žr. toliau).

Baigiamajame tai vadinama **žiniomis grįstu agentu** (angl. knowledge-grounded
agent; artima RAG idėjai): žmogaus sukaupta ekspertinė žinia + LLM gebėjimas
ją pritaikyti.

### Ar AI gali siūlyti savo šabloną ar kabliuką?

Taip, bet **pažymėtą kaip naują**:
- agentas pirmiausia renkasi iš bazės;
- jei nė vienas įrašas neatitinka gerai (pats įvertina atitikimą 1–5, ir
  geriausias gauna < 3), jis gali pasiūlyti savo įrašą su žyma `proposed`;
- UI tai rodo aiškiai („⚡ Agento pasiūlytas šablonas“), o tu gali jį
  **išsaugoti į bazę**. Taip bazė auga iš naudojimo.

Kabliukams tas pats: iš 3 variantų bent 2 remiasi bazės formulėmis, o
trečias gali būti laisvas.

### Tokenai

Bazė nėra didelė: keli šimtai įrašų nereikalingi, užtenka dešimčių. Agentas
gauna **trumpą sąrašą** (id + „kada naudoti“, ~2–4 tūkst. tokenų), išsirenka,
ir tik tada įkeliamas **pilnas pasirinkto įrašo** tekstas. Pastovi prompt'o
dalis (temos aprašas, taisyklės) kešuojama (*prompt caching*), todėl
pakartotiniai paleidimai pigūs. Orientyras: < $1 vienam video, tikslūs
skaičiai matysis run'o žurnale.

---

## Žinių bazė: ką surinkti ir kokiu formatu

Viskas viename aplanke `knowledge/`, nes tai duomenys, ne kodas:

```
knowledge/
  hooks.json                    ← kabliukų formulės (bendros, pažymėtos temomis)
  themes/
    dev/
      theme.json                ← leidžiami resursai, taisyklių ribos
      brief.md                  ← nuotaika, tempas, ko vengti (pusė psl.)
      templates/*.json          ← video struktūros
      design/
        refs.json               ← dizaino pavyzdžių aprašai
        *.png                   ← kadrai (gerai / blogai)
      sources.md                ← analizuoti video: nuoroda, peržiūros, pastabos
    stories/
      …
```

### 1. Šablonas (video struktūra)
```jsonc
{
  "id": "problem-fix",
  "name": "Viena problema → sprendimas",
  "whenToUse": "Idėja yra viena konkreti klaida ar skausmas ir jo sprendimas",
  "targetDuration": 40,
  "hookTypes": ["pain-shown", "you-are-wrong"],      // kurie kabliukai tinka
  "beats": [
    { "role": "hook",    "purpose": "Parodyti skausmą per 3 s", "maxWords": 6 },
    { "role": "problem", "purpose": "Kodėl taip nutinka (mechanizmas)" },
    { "role": "reveal",  "purpose": "Sprendimas: viena taisyklė" },
    { "role": "proof",   "purpose": "Prieš / po tame pačiame vaizde" },
    { "role": "cta",     "purpose": "Kitos dalies teaser + follow" }
  ],
  "examples": ["sources.md#3", "sources.md#7"]       // iš kurių video išvesta
}
```

### 2. Kabliukas (hook formulė)
```jsonc
{
  "id": "you-are-wrong",
  "type": "contrarian",
  "formula": "Tu [darai X] neteisingai. Štai kodėl.",
  "example": "Tu rašai prompt'us neteisingai.",
  "firstFrame": "Didelis tekstas + rezultato vaizdas, be įžangos",
  "whyItWorks": "Sukelia gynybinį smalsumą: žiūrovas nori patikrinti",
  "themes": ["dev", "edu"],
  "maxWords": 7,
  "evidence": "sources.md#3 (1,2M peržiūrų)"
}
```
Pradžiai užtenka 10–15 formulių. Dažniausi tipai: parodytas skausmas,
prieštaravimas („tu darai neteisingai“), rezultatas pirmiau, smalsumo spraga,
„POV“, istorija nuo vidurio, klausimas, skaičius ar sąrašas, „nustok daryti X“.

### 3. Dizaino pavyzdys (gerai / blogai)
```jsonc
{
  "image": "hook-big-text-good.png",
  "verdict": "good",                        // "good" | "bad"
  "tags": ["hook", "text-size", "one-idea"],
  "note": "Vienas didelis teiginys, vizualas po juo, nieko daugiau",
  "rule": "maxWordsOnScreen"                // kurią taisyklę iliustruoja (jei yra)
}
```
Pradžiai užtenka 20–30 pavyzdžių temai, maždaug pusė gerų ir pusė blogų.
Blogus pavyzdžius imk ir iš **savo** ankstesnių video: tai vertingiausia.

**Iš dizaino pavyzdžių gaunami trys dalykai, viskas iš vienos vietos:**
- žymos `rule` → **taisyklės kodu** (išmatuojamos: žodžiai, dydžiai, paraštės);
- `note` + `verdict` → **rubrika** AI vizualiai patikrai;
- patys paveikslėliai → **pavyzdžiai**, kuriuos AI mato vertindamas kadrus
  („štai gerai, štai blogai, o kaip šitas?“).

### Kaip rinkti (rinkos analizė)

Rinkos analizė baigiamajame susideda iš dviejų dalių:

**A. Įrankių analizė** (~1 diena, rašymui): CapCut AI, InVideo AI, Pictory,
Opus Clip, Submagic, Captions. Lentelė pagal kriterijus: ar rašo
scenarijų? ar dėlioja kadrus? ar galima redaguoti? ar laikosi dizaino
taisyklių? ar galima valdyti struktūrą? Išvada: niša, kurią užpildo tavo
agentas.

**B. Turinio analizė** (~1,5–2 sav. tavo darbo, lygiagrečiai su kodu).
Kiekvienai temai:
1. Surink 20–30 sėkmingų video (daug peržiūrų, tavo nišoje). Įrašyk į
   `sources.md`: nuoroda, peržiūros, data.
2. Kiekvienam: 3–6 ekrano nuotraukos (kabliuko kadras ir kiekvienas
   pagrindinis momentas) + transkriptas (TikTok dažnai rodo subtitrus,
   arba perrašyk ranka).
3. **Su AI pagalba** (Claude pokalbyje, ne agente): įkelk kadrus +
   transkriptą ir paprašyk užpildyti juodraščius pagal 3 formatus aukščiau.
   Tu pataisai ir patvirtini. Taip 30 video sutvarkysi per kelias dienas,
   ne savaites.
4. Sujunk pasikartojančias struktūras į 3–6 šablonus, o kabliukus į
   formules.

Baigiamajame tai aprašoma kaip **žinių bazės sudarymo metodika**: iš kiek
video, pagal kokius kriterijus atrinkta, kaip sugrupuota.

---

## Agento eiga (su kabliukų žingsniu)

1. **Įvestis:** tema, idėja, trukmė, (nebūtina) šablonas.
2. **Šablono parinkimas:** agentas gauna trumpą šablonų sąrašą, grąžina
   pasirinktą `id` + atitikimą 1–5 + paaiškinimą, arba `proposed` šabloną.
3. **Kabliukai:** įkeliamos šablonui tinkančios formulės → agentas sukuria
   **3 variantus** idėjai, pats įvertina kiekvieną (aiškumas, ar per 3 s
   suprantama, ar sukelia smalsumą, žodžių kiekis) → **tu pasirenki** (arba
   parašai savo).
4. **Scenarijus:** pagal šablono `beats` + pasirinktą kabliuką + `brief.md`.
   Patikra kodu (trukmė, žodžiai, rolės) + savikritika → vienas pataisymas →
   **tu patvirtini** Storyboard režime (arba komentaras → perrašo).
5. **Kadrai:** agentas renkasi tik iš temos `theme.json` leidžiamų scenų,
   išdėstymų ir vizualų. Koordinačių nerašo: projektą sudeda kompiliatorius
   pagal taisykles.
6. **Patikra ir taisymas:** taisyklės kodu + kadrų nuotraukos su dizaino
   pavyzdžiais → AI vertinimas → taisymas, maks. 3 ratai.
7. **Rezultatas:** projektas redaktoriuje + ataskaita (kas ištaisyta, kas
   liko, kaina). Balsas pagal pasirinkimą.

---

## Frontendas: žingsniai, ne chatas

1. **„Naujas video su AI“ langas:** tema, idėja, trukmė, šablonas („agentas
   parinks“ pagal nutylėjimą), ☐ turiu savo įrašų, ☐ generuoti balsą.
2. **Šablonas + kabliukai:** kortelė su parinktu šablonu (paaiškinimas,
   atitikimas, „keisti“). Po ja 3 kabliukų kortelės su įvertinimais, ir tu
   paspaudi vieną. ⚡ žyma, jei pasiūlymas agento, ne iš bazės, su mygtuku
   „Išsaugoti į bazę“.
3. **Scenarijaus peržiūra:** esamas Storyboard režimas + AI juosta (agento
   pastabos, komentaro laukelis, **Perrašyti** / **Tvirtinu →**).
4. **Progresas:** sudėlioti kadrai, ratai, pažeidimų skaičius, miniatiūros.
5. **Rezultatas:** Scenes režimas + ataskaita („Liko: scena 4… [Rodyti]“).

---

## Darbai savaitėmis

Tavo turinio darbas (žinių bazė) vyksta **lygiagrečiai** su kodu 1–3
savaitėmis. Rašymą pradėk 3 savaitę.

| Sav. | Kodas | Turinys / rašymas |
|---|---|---|
| 1 | Pagrindas: Claude API, run'o žurnalas, `knowledge/` schemos ir įkėlimas | Įrankių analizė (A); pradėti rinkti dev video |
| 2 | Šablono parinkimas + kabliukai + scenarijus + UI 1–3 | Dev: šablonai, kabliukai, dizaino pavyzdžiai |
| 3 | Kadrai: katalogas, scenos specifikacija, kompiliatorius | Antra tema (mažesnė apimtis); rašyti analizės skyrių |
| 4 | Kadrai: agento žingsnis, testai | Rašyti žinių bazės metodiką |
| 5 | Taisyklės kodu + taisymo ciklas | Rašyti architektūros skyrių |
| 6 | Vizualinė patikra su pavyzdžiais + UI 4–5 | Eksperimento idėjų rinkinys |
| 7 | Klaidų taisymas | Eksperimentas (žr. toliau) |
| 8 | — | Rezultatai, išvados, pristatymas |

**Jei vėluoji:** vizualinę patikrą sumažink iki „kadrai rodomi ataskaitoje“.
Antros temos apimtį sumažink iki 1 šablono ir 5 kabliukų. **Neatsisakyk**
taisymo ciklo ir kabliukų žingsnio.

### Kodo užduotys detaliau

**1 sav.**
- [ ] `@anthropic-ai/sdk`, `ANTHROPIC_API_KEY` į `.env.local`
- [ ] `server/agent/llm.ts`: kvietimas → Zod validacija → vienas
      pakartojimas su klaidos tekstu; prompt caching; tokenų, kainos ir
      laiko žurnalas
- [ ] `src/schema/knowledge.ts`: Zod schemos temai, šablonui, kabliukui,
      dizaino pavyzdžiui; `server/agent/knowledge.ts`: įkėlimas ir validacija
- [ ] `src/schema/agentRun.ts` + `db/agent-runs/`
- [ ] Projekto schemoje: `theme?`, `templateId?`, `hookId?`,
      `storyPlan.targetDuration?`

**2 sav.**
- [ ] `steps/pickTemplate.ts`, `steps/hooks.ts`, `steps/script.ts`
- [ ] Scenarijaus patikra kodu + savikritika
- [ ] tRPC `agent.start / get / chooseHook / reviseScript / approveScript /
      saveProposal` (fone, kaip `renderJobs.ts`)
- [ ] UI 1–3

**3–4 sav.**
- [ ] `server/agent/catalog.ts`: katalogas iš registrų, filtruotas pagal
      `theme.json`
- [ ] `src/agent/sceneSpec.ts`: AI išvestis be koordinačių, pikselių ir
      animacijų
- [ ] `src/agent/compileProject.ts` + testai (pozicijos per auto-fit, judesio
      taisyklės, sfx saikas, REC placeholder'iai, `parseProject()`)
- [ ] `steps/layout.ts`

**5 sav.**
- [ ] `src/agent/rules/`: 6 taisyklės (saugi zona, per trumpa scena, žodžiai
      ekrane, bendra trukmė, vienodos gretimos scenos, sfx kiekis);
      ribos iš `theme.json`
- [ ] `scripts/checkProject.ts` perjungti į tas pačias taisykles
- [ ] `steps/revise.ts`: tool use (`updateSceneText`, `changeLayout`,
      `replaceVisual`, `removeVisual`, `splitScene`, `done`)

**6 sav.**
- [ ] `@remotion/renderer` (`4.0.290`), `server/agent/stills.ts`
- [ ] `steps/critique.ts`: kadrai + rubrika iš `refs.json` + 4–6 pavyzdiniai
      paveikslėliai
- [ ] UI 4–5

### Testavimas ir rezultatų įvertinimas (7 sav.)

Pagal nurodymus tai **Programinės sistemos testavimo** skyriaus dalis (3–5 psl.), todėl eksperimentas laikomas nedidelis.
- Vienetų testai: kompiliatorius, taisyklės; integraciniai: visa agento eiga su užfiksuotais LLM atsakymais
- Funkcinių reikalavimų patikros lentelė
- 8–10 idėjų (daugiausia dev + 2–3 iš antros temos)
- Kiekviena paleidžiama trimis režimais:
  - **A:** be žinių bazės (tik bendras prompt'as);
  - **B:** su žinių baze, be taisymo ciklo;
  - **C:** pilnas agentas.
- Matuojama: taisyklių pažeidimai, tavo pataisų skaičius redaktoriuje
  (pagal kategorijas), laikas, kaina, įvertinimas 1–5 (pvz. kabliuko
  stiprumas, bendras vaizdas)
- A vs B parodo **žinių bazės** vertę, B vs C **patikros ciklo** vertę.
  Tai tiesiogiai atsako į tikslą.

---

## Ko NEdarome

Laisvo chato; automatinio mokymosi iš pataisų (tik tobulinimo kryptis);
daugiau nei 2 temų; vaizdų generavimo; publikavimo; automatinės video
analizės (kadrus ir transkriptus renki pati, AI padeda tik pokalbyje).
