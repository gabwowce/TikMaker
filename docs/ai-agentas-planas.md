# AI agentas trumpiems video: darbų planas (2 mėn. versija)

Baigiamojo darbo objektas yra **AI agentas**, kuris iš idėjos sukuria beveik
galutinį trumpo vertikalaus video projektą. TikMaker (scenos, vizualai,
redaktorius, balsas, renderis) yra **resursai**, kuriais agentas naudojasi.
Darbe jie minimi, bet į juos nesigilinama.

**Laikas:** 8 savaitės kūrimui ir aprašymui. Todėl planas apima tik tai, kas
būtina, kad tai būtų tikras agentas, o ne generatorius: **planuoja → žmogus
patvirtina → vykdo → pats tikrina → pats taiso.**

---

## Kaip agentas veikia

```
[1] Tu pasirenki TEMĄ (+ nebūtinai šabloną) ir įrašai IDĖJĄ
        │
[2] Agentas parenka šabloną (jei nepasirinkai) ir parašo scenarijų
    pagal šablono scenas: VO, tekstas ekrane, ką rodyti
        │
[3] Agentas pats patikrina scenarijų (kodas + savikritika pagal šabloną)
    ir vieną kartą pataiso → PARODO TAU
        │
    ┌── Tu: Tvirtinu  /  pataisai ranka  /  „perrašyk: <komentaras>“
    ▼
[4] Agentas sudėlioja kadrus: renkasi TIK iš temos leidžiamų scenų,
    išdėstymų ir vizualų; kodas sukompiliuoja į projektą pagal taisykles
        │
[5] Patikra: taisyklės kodu + kadrų nuotraukos → AI vertinimas
        │  pažeidimai? → agentas perdėlioja → vėl patikra (maks. 2–3 ratai)
        ▼
[6] Atsidaro redaktoriuje + ataskaita: kas pataisyta, kas liko.
    Balsą generuoji esamu mygtuku (arba pažymi „generuoti balsą“ [1] žingsnyje).
```

### Kas ką kuria

| Kas | Kas tai | Kas kuria |
|---|---|---|
| **Tema** | stilius, dizaino aprašas, leidžiami resursai, taisyklių ribos | tu (už baigiamojo ribų) |
| **Šablonas** | video tipas: scenų seka ir kiekvienos scenos paskirtis | tu (agentas juos tik naudoja) |
| **Scenarijus** | konkretūs tekstai konkrečiai idėjai | agentas |
| **Kadrai** | scenos, vizualai, išdėstymas | agentas (renkasi) + kodas (išdėsto) |
| **Taisyklės** | ką tikrinti ir kokios ribos | tu (sąrašas) + kodas |

Baigiamajame tai skamba taip: **„Agentas veikia žmogaus apibrėžtose ribose:
žmogus apibrėžia žanrą ir struktūrą, agentas užpildo turinį ir išdėstymą,
sistema garantuoja, kad rezultatas neišeis už dizaino taisyklių.“**

---

## Duomenų formatai (ką tu paruoši)

### Tema: `src/themes/<tema>/theme.json` + `brief.md`
```jsonc
{
  "id": "dev",
  "name": "Dev / edukacinis",
  "allowedScenes": ["hook-centered", "hook-visual", "visual-explainer", "takeaway"],
  "allowedVisualTemplates": ["claude-cli", "terminal", "code-diff", "keycap", "..."],
  "backgrounds": ["solid-dark", "soft-grid"],
  "rules": { "maxWordsOnScreen": 8, "maxSfx": 5, "hookMaxSeconds": 3 }
}
```
`brief.md` yra pusė puslapio laisvo teksto: nuotaika, tempas, kas būna
ekrane, ko vengti. Agentas jį skaito kaip instrukciją.

### Šablonas: `src/themes/<tema>/templates/<id>.json`
```jsonc
{
  "id": "problem-fix",
  "name": "Viena problema → sprendimas",
  "whenToUse": "Kai idėja yra viena konkreti klaida ar skausmas ir jo sprendimas",
  "targetDuration": 40,
  "beats": [
    { "role": "hook",    "purpose": "Parodyti skausmą per 3 s",       "maxWords": 6 },
    { "role": "problem", "purpose": "Kodėl taip nutinka (mechanizmas)" },
    { "role": "reveal",  "purpose": "Sprendimas: viena taisyklė" },
    { "role": "proof",   "purpose": "Prieš / po tame pačiame vaizde", "prefer": ["transform"] },
    { "role": "cta",     "purpose": "Kitos dalies teaser + follow" }
  ]
}
```
`role` reikšmės yra tos pačios, kurias jau naudoja `scene.plan.role`. Taip
scenarijus iškart matosi esamame Storyboard režime.

**Minimumas baigiamajam:** 1 tema (dev) su 2–3 šablonais + 1 kita tema
(pvz. istorijos) su 1 šablonu. Antros temos užtenka įrodyti, kad agentas
universalus, ir ją galima „suvibecodinti“ greitai.

---

## Frontendas: ne chatas, o žingsnių vedlys

**Laisvas chatas nerekomenduojamas.** Jį sunkiau padaryti, sunkiau
kontroliuoti ir sunkiau įvertinti baigiamajame. Agentas turi aiškius
etapus, todėl UI yra **žingsniai su teksto laukeliu ten, kur reikia tavo
žodžio**. Laukelis atrodo kaip chato, bet yra tik patvirtinimo taškuose.

### Ekranas 1: „Naujas video su AI“ (modalinis langas)
```
┌──────────────────────────────────────────────┐
│  Naujas video su AI                          │
│                                              │
│  Tema        [ Dev / edukacinis       ▾ ]    │
│  Šablonas    [ Agentas parinks        ▾ ]    │
│  Idėja       ┌─────────────────────────────┐ │
│              │ Claude Code pamiršta, ką    │ │
│              │ darė prieš /compact …       │ │
│              └─────────────────────────────┘ │
│  Trukmė      [ 40 s ]                        │
│  ☐ Turiu savo įrašų (agentas paliks vietas)  │
│  ☐ Generuoti balsą pabaigoje                 │
│                                  [ Kurti → ] │
└──────────────────────────────────────────────┘
```

### Ekranas 2: scenarijaus peržiūra (esamas **Storyboard** režimas)
Naujas ekranas nereikalingas. Agentas įrašo scenarijų į projektą, ir
atsidaro Storyboard režimas, kur jau gali taisyti VO ir tekstus. Prisideda
tik **AI juosta** viršuje:
```
┌────────────────────────────────────────────────────────────────┐
│ 🤖 Šablonas: Viena problema → sprendimas · 5 scenos · ~38 s    │
│ Agento pastabos: ✓ trukmė telpa  ✓ kabliukas 5 žodžiai         │
│                  ⚠ „proof“ scenai gali reikėti tavo įrašo      │
│ ┌──────────────────────────────────────────────┐               │
│ │ Komentaras agentui (nebūtina)…               │ [Perrašyti]   │
│ └──────────────────────────────────────────────┘ [Tvirtinu →]  │
├────────────────────────────────────────────────────────────────┤
│  (esamas scenų sąrašas + formos, redaguojamos ranka)           │
└────────────────────────────────────────────────────────────────┘
```

### Ekranas 3: dėliojimo progresas (šoninis skydelis)
```
┌────────────────────────────────┐
│ 🤖 Agentas dirba               │
│ ✓ Kadrai sudėlioti (5 scenos)  │
│ ✓ Ratas 1: 4 pažeidimai        │
│   [▢][▢][▢][▢][▢] ← kadrai     │
│ ⟳ Ratas 2: taisoma…            │
└────────────────────────────────┘
```

### Ekranas 4: rezultatas
Atsidaro **Scenes** režimas su projektu. Skydelyje lieka ataskaita:
```
✓ Ištaisyta: 3   ⚠ Liko: 1
  · Scena 4: vizualas užima per mažai ploto  [Rodyti]
Kaina: $0.42 · Laikas: 1 min 50 s
```

---

## Darbai savaitėmis

Rašymą (įvadą, analizę, architektūros aprašą) verta pradėti jau 3 savaitę,
po truputį lygiagrečiai su kūrimu, kitaip 2 savaičių pabaigoje neužteks.

### 1 savaitė: pagrindas + šablonai
- [ ] `@anthropic-ai/sdk`, `ANTHROPIC_API_KEY` į `.env.local`
- [ ] `server/agent/llm.ts`: kvietimas → Zod validacija → jei klaida, vienas
      pakartojimas su klaidos tekstu; tokenų, kainos ir laiko žurnalas
- [ ] `src/themes/types.ts` + Zod schemos temai ir šablonui; `getTheme()`,
      `listTemplates(theme)`
- [ ] `dev` tema + 2 šablonai (iš `.claude/skills/tiktok-video/SKILL.md`)
- [ ] Projekto schemoje: `theme?`, `templateId?`, `storyPlan.targetDuration?`
- [ ] `src/schema/agentRun.ts` + `db/agent-runs/` (run'o žurnalas: žingsniai,
      pažeidimai, kaina)

### 2 savaitė: scenarijus + patvirtinimas
- [ ] `server/agent/steps/pickTemplate.ts`: jei šablonas nepasirinktas,
      agentas renkasi pagal `whenToUse`
- [ ] `server/agent/steps/script.ts`: idėja + šablonas + `brief.md` →
      scenų sąrašas (role, vo, onScreenText, visualBrief, needsRecording)
- [ ] Scenarijaus patikra kodu: trukmė pagal `pacing.ts`, `maxWords`, ar
      yra visos šablono rolės
- [ ] Savikritika: vienas kvietimas su klausimais iš šablono (`purpose`
      įvykdytas? kabliukas stiprus?) → vienas pataisymas
- [ ] Įrašymas į `storyPlan` + `scene.plan` + `scene.vo`
- [ ] tRPC `agent.start`, `agent.get`, `agent.reviseScript(comment)`,
      `agent.approveScript` (fone, kaip `renderJobs.ts`)
- [ ] UI: ekranas 1 + AI juosta Storyboard režime (ekranas 2)

### 3–4 savaitės: kadrų dėliojimas (didžiausias darbas)
- [ ] `server/agent/catalog.ts`: iš registrų sugeneruojamas trumpas
      katalogas, filtruotas pagal temą (id + vienas sakinys + laukai)
- [ ] `src/agent/sceneSpec.ts`: ką grąžina AI. Scenos tipas, layout,
      tekstai, dydžio žetonas, vizualai iš katalogo, `isKeyBeat`. **Jokių
      koordinačių, pikselių ir animacijų.**
- [ ] `src/agent/compileProject.ts`: spec → pilnas projektas. Id, pozicijos
      per esamą auto-fit, judesio taisyklės (perėjimai, `entrance: "none"`,
      stagger), sfx tik `isKeyBeat`, REC placeholder'iai, carry. Rezultatas
      per `parseProject()`. **Testai.**
- [ ] `server/agent/steps/layout.ts`: vienas kvietimas visam scenarijui →
      `sceneSpec[]`; neegzistuojantis id = klaida → pakartojimas

### 5 savaitė: patikra + taisymas
- [ ] `src/agent/rules/`: taisyklė = funkcija → `Violation[]`
      (`ruleId, sceneId, severity, message, fixHint`). Pirmos 6:
      išlindimas už saugios zonos (esamas), per trumpa scena (esamas
      `pacingWarning`), per daug žodžių ekrane, bendra trukmė, dvi
      vienodos gretimos scenos, per daug sfx
- [ ] `scripts/checkProject.ts` perjungti į tas pačias taisykles
- [ ] `server/agent/steps/revise.ts`: tool use. Įrankiai:
      `updateSceneText`, `changeLayout`, `replaceVisual`, `removeVisual`,
      `splitScene`, `done`. Keičiama spec → kompiliuojama → tikrinama.
      Maks. 3 ratai arba sustojama, jei ratas nieko nepagerino.

### 6 savaitė: vizualinė patikra + užbaigimas
- [ ] `@remotion/renderer` (`4.0.290`); `server/agent/stills.ts`: 1 kadras
      scenai (`renderStill`), visi vienoje užklausoje
- [ ] `server/agent/steps/critique.ts`: kadrai + `brief.md` + rubrika
      (aišku, kas svarbiausia? neperkrauta? vizualas atitinka VO? ne
      vienodi gretimi?) → pastabos į tą patį `revise` ciklą
- [ ] UI: progreso skydelis (ekranas 3) + ataskaita (ekranas 4)
- [ ] (Jei lieka laiko) balsas pabaigoje per esamą `voice.generate`

> **Jei vėluoji:** 6 savaitės vizualinę patikrą sumažink iki
> „kadrai rodomi tau ataskaitoje“, be AI vertinimo. Patikra kodu ir taisymo
> ciklas lieka, nes be jų tai ne agentas.

### 7 savaitė: eksperimentas
- [ ] 8–10 idėjų testinis rinkinys (daugiausia dev + 2 iš kitos temos)
- [ ] Kiekviena idėja paleidžiama dviem režimais: **be taisymo ciklo** ir
      **su juo**
- [ ] Iš run'ų žurnalo: pažeidimai prieš ir po, ratai, laikas, kaina
- [ ] Rankiniu būdu: kiek pataisų redaktoriuje tau dar teko padaryti
      (skaičiuoji pati, pagal kategorijas) + įvertinimas 1–5
- [ ] 2–3 tikrai paskelbti video (nebūtina, bet stipru)

### 8 savaitė: aprašymas
- [ ] Rezultatų skyrius, išvados, pataisymai, pristatymas

---

## Ko NEdarome (sąmoningai)

- Laisvo chato su agentu
- Automatinio pataisų registravimo ir mokymosi iš jų (aprašoma tik kaip
  tobulinimo kryptis)
- Atskiros scenos taisymo su AI iš Inspector'iaus
- Vaizdų ar filmuotos medžiagos generavimo
- Daugiau nei 2 temų
- Automatinio publikavimo

---

## Baigiamojo darbo struktūra

1. **Problema:** trumpų video kūrimas užima daug laiko, o AI įrankiai
   (CapCut, InVideo, Pictory, Opus Clip) generuoja šabloniškai ir be
   dizaino kontrolės.
2. **Analizė:** esami sprendimai; LLM agentų architektūros (pipeline,
   tool use, žmogus cikle, LLM kaip vertintojas); kodėl LLM'ams sunkiai
   sekasi vizualinis dizainas.
3. **Projektavimas:** agento etapai, šablonai kaip žmogaus nustatytos ribos,
   „AI renkasi, sistema išdėsto“, dviejų lygių patikra.
4. **Realizacija:** agento moduliai; TikMaker minimas kaip platforma.
5. **Vertinimas:** su taisymo ciklu ir be jo.
6. **Išvados ir tobulinimas.**

---

## Atviri klausimai

- API biudžetas vienam video (orientyras: < $1)
- Kuri antra tema ir koks jos vienas šablonas?
