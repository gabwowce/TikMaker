# Agento kodo skaitymas: progresas

Tikslas: suprasti, **kaip agentas sukuria video** – nuo idėjos formoje iki
MP4 – tiek, kad galėčiau paaiškinti kiekvieną dalį ir žinočiau, kur ką
pakeisti. Redaktoriaus (laiko juostos, inspektoriaus, bibliotekos) neskaitome.

Apimtis: **~5 000 eilučių kodo + ~1 000 eilučių promptų**, 12 modulių,
po ~1 val. kiekvienas.

## Kaip vyksta susitikimas

1. Claude trumpai paaiškina, ką modulis daro ir kodėl jis toks.
2. Skaitau kodą eilutė po eilutės, klausiu visko, kas neaišku.
3. **Papasakoju savais žodžiais** – Claude patikslina.
4. Mažas pratimas: kažką pakeičiu pati, paleidžiu testus (`npx vitest run`).
5. Užpildau „Kur keisti“ ir „Mano užrašai“.

Būsenos: ⬜ neskaityta · 🟨 pradėta · ✅ suprantu · 🔁 grįžti dar kartą

## Kelias, kurį sekame

```
Forma (idėja) ──► run'o JSON ──► agentas: vertė → šablonas → hookai ──► ⏸ kūrėja renkasi
                                         → scenarijus + patikra ──────► ⏸ kūrėja patvirtina
                                         → balsas → vaizdai kodu → savikontrolė
              ──► projektas (scenos) ──► Remotion piešia ──► MP4
```

| # | Modulis | ~Eil. | Būsena |
|---|---|---|---|
| 1 | Kas yra run'o JSON'e | 410 | ⬜ |
| 2 | Žemėlapis: `agent.ts` | 270 | ⬜ |
| 3 | Išsaugojimas ir du rašytojai | 220 | ⬜ |
| 4 | Kalbėjimas su modeliu | 450 | ⬜ |
| 5 | Idėja, šablonas, hookai, klausimai | 330 + promptai | ⬜ |
| 6 | Scenarijus ir jo patikra | 230 + promptai | ⬜ |
| 7 | Balsas | 110 | ⬜ |
| 8 | Vaizdai kodu (laisvasis agentas) | 450 + promptas + skilai | ⬜ |
| 9 | Savikontrolė: agentas žiūri į kadrus | 320 + promptas | ⬜ |
| 10 | Pokalbis ir router'is | 320 + promptai | ⬜ |
| 11 | Žinių bazė | 400 | ⬜ |
| 12 | Iš run'o į video: projektas, piešimas, renderis | 900 | ⬜ |

---

## 1. Kas yra run'o JSON'e ⬜
Pradedam nuo tikro failo `db/agent-runs/<id>.json`: ką saugome ir kodėl.

| Failas | Eil. | Būsena |
|---|---|---|
| `src/agent/run/run.ts` – viso run'o schema | 31 | ⬜ |
| `src/agent/run/status.ts` – visos būsenos | 28 | ⬜ |
| `src/agent/run/1-idea.ts` – forma | 18 | ⬜ |
| `src/agent/run/2-angle.ts` – vertė, šablonas, hookai | 70 | ⬜ |
| `src/agent/run/3-script.ts` – scenarijus | 40 | ⬜ |
| `src/agent/run/4-code.ts` – vaizdai kodu | 72 | ⬜ |
| `src/agent/run/5-voice.ts` – balsas | 9 | ⬜ |
| `src/agent/run/7-chat.ts` – pokalbis, žinutės, tikslai | 108 | ⬜ |
| `src/agent/run/asking.ts`, `log.ts` – klausimai, modelio iškvietimų žurnalas | 38 | ⬜ |

Po šito turiu mokėti atsakyti:
- [ ] Kas yra run'as ir kur jis saugomas?
- [ ] Kuo skiriasi `...FromAi` ir `...InRun` schemos?
- [ ] Ką reiškia `pausedFrom`?

## 2. Žemėlapis: visa eiga ⬜
| Failas | Eil. | Būsena |
|---|---|---|
| `server/agent/agent.ts` | 270 | ⬜ |
| `server/trpc/agent.ts` – mygtukai → `agent.ts` | 92 | ⬜ |

- [ ] Kokios keturios `agent.ts` dalys ir ką daro kiekviena?
- [ ] Kas vyksta paspaudus Approve – nuo mygtuko iki `done`?
- [ ] Kaip agentas tęsia po pauzės?
- [ ] Kodėl vienam run'ui – vienas workeris (`working`, `again`)?

## 3. Išsaugojimas ir du rašytojai ⬜
| Failas | Eil. | Būsena |
|---|---|---|
| `server/agent/runs.ts` – run'ų failai, rašymų eilė | 42 | ⬜ |
| `server/agent/job.ts` – ką gauna kiekvienas žingsnis; `save`, `ai`, `mergeMessages` | 110 | ⬜ |
| `server/db.ts` – JSON failų skaitymas ir rašymas | 66 | ⬜ |
| `server/ids.ts` | 6 | ⬜ |

- [ ] Kas nutiktų be `updateRun` eilės?
- [ ] Ką loguoja `job.ai()` ir kodėl ir nepavykusius iškvietimus?

## 4. Kalbėjimas su modeliu ⬜
| Failas | Eil. | Būsena |
|---|---|---|
| `server/agent/llm.ts` – vienos durys į modelį, `withRetries` | 218 | ⬜ |
| `server/agent/claudeCode.ts` – `claude -p`, leidimai, atsakymo skaitymas | 210 | ⬜ |
| `server/agent/models.ts` – modelis kiekvienam žingsniui | 20 | ⬜ |
| `server/agent/limits.ts` – naudojimo limito atpažinimas | 6 | ⬜ |

- [ ] Ką tikrina Zod, jei API ir taip grąžina JSON?
- [ ] Kaip perjungti Gemini ↔ Claude nekeičiant kodo?
- [ ] Kuo skiriasi `callStructured` ir `callAgent`?
- [ ] Kur vyksta laisvojo agento „ratai“?

## 5. Idėja, šablonas, hookai, klausimai ⬜
| Failas | Eil. | Būsena |
|---|---|---|
| `server/agent/steps/angle.ts` | 117 | ⬜ |
| `server/agent/steps/ask.ts` | 97 | ⬜ |
| `server/agent/messages.ts` | 114 | ⬜ |
| `prompts/checkValue.ts`, `pickTemplate.ts`, `writeHooks.ts`, `productScreens.ts` | ~350 | ⬜ |

- [ ] Kada agentas klausia kūrėjos, o kada nusprendžia pats?
- [ ] Kur dingsta atsakymas su „remember“?

## 6. Scenarijus ir jo patikra kodu ⬜
| Failas | Eil. | Būsena |
|---|---|---|
| `server/agent/steps/script.ts` | 73 | ⬜ |
| `src/agent/rules/checkScript.ts` | 56 | ⬜ |
| `src/utils/pacing.ts` – kalbėjimo greitis, scenos trukmė | 103 | ⬜ |
| `prompts/writeScript.ts`, `research.ts` | ~250 | ⬜ |

- [ ] Ką tikrina kodas, o ką AI?
- [ ] Kas, jei scenarijus po taisymo vis dar per ilgas?

## 7. Balsas ⬜
| Failas | Eil. | Būsena |
|---|---|---|
| `server/agent/steps/voice.ts` | 26 | ⬜ |
| `server/voice.ts` – ElevenLabs, žodžių laikai | 84 | ⬜ |

- [ ] Kodėl balsas daromas prieš vaizdus?
- [ ] Iš kur agentas žino, kuriame kadre ištariamas žodis?

## 8. Vaizdai kodu – laisvasis agentas ⬜
| Failas | Eil. | Būsena |
|---|---|---|
| `server/agent/codeScenes.ts` – užduotis, `checkScenes`, fallback, Undo | 325 | ⬜ |
| `prompts/writeCode.ts` – ką Claude Code gauna ir ką jam leidžiama | ~200 | ⬜ |
| `server/agent/codeVersions.ts` – scenų versijos | 25 | ⬜ |
| `server/agent/visuals.ts` – „Mano vizualai“ | 107 | ⬜ |
| `src/agent/soundCues.ts`, `visualStyles.ts` – garsai, stiliai | 107 | ⬜ |
| `.claude/skills/tikmaker-scene`, `tikmaker-explainer`, `tikmaker-depth` – ne kodas, bet būtina | — | ⬜ |
| `scripts/asset.ts` – tikri vaizdai: screenshotai, logotipai, įrašai (pakanka bendrai) | ~300 | ⬜ |

- [ ] Ką laisvasis agentas gali daryti, o ko – ne?
- [ ] Kaip kodas patikrina, ar scena gera?
- [ ] Kas, jei scena nesikompiliuoja?

## 9. Savikontrolė: agentas žiūri į kadrus ⬜
| Failas | Eil. | Būsena |
|---|---|---|
| `server/agent/steps/review.ts` | 212 | ⬜ |
| `server/agent/stills.ts` – kadrų renderinimas | 75 | ⬜ |
| `server/agent/frames.ts` – kurie kadrai | 35 | ⬜ |
| `prompts/reviewFrames.ts` + `knowledge/shared/review-rubric.json` | ~100 | ⬜ |

- [ ] Kada savikontrolė sustoja?
- [ ] Kuo skiriasi `selfReview` ir `reviewOnRequest`?

## 10. Pokalbis ir router'is ⬜
| Failas | Eil. | Būsena |
|---|---|---|
| `server/agent/steps/chat.ts` | 228 | ⬜ |
| `prompts/routeMessage.ts`, `rewriteScene.ts` | ~100 | ⬜ |

- [ ] Kelias nuo žinutės iki pakeitimo: kas, kur, kokia tvarka?
- [ ] Kada agentas pirma pasiūlo, o ne daro?

## 11. Žinių bazė ⬜
| Failas | Eil. | Būsena |
|---|---|---|
| `src/agent/knowledge.ts` – žinių schemos | 174 | ⬜ |
| `server/agent/knowledge.ts` – įkėlimas ir klaidų sąrašas | 202 | ⬜ |
| `knowledge/` – šablonai, formulės, taisyklės, kanalas (workspace) | — | ⬜ |

- [ ] Kur pridėti naują video šabloną ar hook formulę?
- [ ] Kas yra workspace ir ką jis duoda promptams?

## 12. Iš run'o į video: projektas, piešimas, renderis ⬜
Kaip agento darbas virsta video: run'as → projekto scenos → Remotion piešia → MP4.

| Failas | Eil. | Būsena |
|---|---|---|
| `src/agent/projectFromScript.ts`, `projectFromCode.ts`, `agentVoice.ts` – run'as → projektas | 133 | ⬜ |
| `src/schema/project.ts`, `scene.ts` – projekto ir scenos duomenys (pakanka bendrai) | 383 | ⬜ |
| `src/utils/duration.ts`, `voiceClips.ts`, `sceneWords.ts` – scenų laikai, žodžiai | 172 | ⬜ |
| `src/video/TikTokVideo.tsx`, `SceneRenderer.tsx` – video piešimas, perėjimai | 385 | ⬜ |
| `src/video/code/*` – kodo scenos įkėlimas | 198 | ⬜ |
| `src/video/brand/kit.tsx`, `fields.ts` – brand kit, redaguojami laukai | 254 | ⬜ |
| `server/renderJobs.ts` – MP4 renderis | 60 | ⬜ |

- [ ] Kur agento scenos failas tampa video dalimi?
- [ ] Ką kūrėja gali pakeisti redaktoriuje be agento (laukai)?

---

# Kur keisti – greita rodyklė

Pildome skaitydami. *Ką noriu pakeisti* → *failas:vieta*.

| Noriu… | Kur |
|---|---|
| pridėti naują agento žingsnį | `server/agent/agent.ts` runAgent + `steps/` |
| pakeisti, ką modelis gauna žingsnyje | `server/agent/prompts/<žingsnis>.ts` |
| pakeisti, kuris modelis daro žingsnį | `server/agent/models.ts` STEP_MODELS |
| pridėti scenarijaus taisyklę | `src/agent/rules/checkScript.ts` |
| leisti laisvajam agentui naują komandą | `server/agent/prompts/writeCode.ts` writeCode `allow` |
| | |

# Ką pastebėjome tvarkytina

- [ ] Prompt funkcijos – ilgi argumentų sąrašai su `undefined`: vienas objektas, testų modelis per `setTestModel()`
- [ ] Laisvojo agento `Read` leidimas neribotas (gali perskaityti `.env.local`): apriboti iki `src/`, `.claude/`, `knowledge/`, `out/`
- [ ] Schemų failai `src/agent/run/` dar sunumeruoti (`1-idea.ts`, `7-chat.ts`): pervadinti kaip `steps/`
- [ ] Kodo scenų problemos atpažįstamos pagal tekstą (`"Scene N:"`): naudoti `{sceneIndex, message}`

# Mano užrašai

### Susitikimas 1 – (data)
-
