# Kodo skaitymas: progresas

Tikslas: suprasti visą TikMaker kodą (`server/` ir `src/`) tiek, kad galėčiau
paaiškinti, kaip kas veikia, ir žinočiau, kur ką pakeisti. Skaitome kartu su
Claude, po vieną modulį.

## Kaip skaitome

Kiekvienas modulis turi gylį:

| Gylis | Ką reiškia | Kur |
|---|---|---|
| 🔬 **Eilutė po eilutės** | Suprantu kiekvieną eilutę ir galiu ją pakeisti | Agentas ir video gamybos šerdis: tai, ką klaus komisija |
| 🔍 **Funkcijomis** | Žinau, ką daro kiekviena funkcija ir kaip jos susijungia, bet ne kiekvieną eilutę | Video piešimas, redaktoriaus būsena, serverio dalys |
| 🗺️ **Žemėlapis** | Žinau, kas kuriame faile, ir randu, kur keisti | Redaktoriaus UI, vaizdų komponentai, registrai |

Vieno susitikimo eiga:
1. Claude trumpai paaiškina, ką modulis daro ir kodėl jis toks.
2. Skaitau kodą ir klausiu visko, kas neaišku.
3. **Papasakoju savais žodžiais**, o Claude patikslina.
4. Mažas pratimas: ką nors pakeičiu pati ir paleidžiu testus (`npx vitest run`).
5. Užpildau „Kur keisti" ir „Mano užrašai".

Būsenos: ⬜ neskaityta · 🟨 pradėta · ✅ suprantu · 🔁 grįžti dar kartą

## Apimtis

Skaičiuojamos eilutės be tuščių ir be komentarų.

| Dalis | ~Eilutės | Gylis |
|---|---|---|
| Agentas (`server/agent`, `src/agent`, `trpc/agent`) | 3 300 + 1 000 promptų | 🔬 |
| Video gamybos šerdis (projekto schema, renderis, kodo scenos, laikas) | 2 300 | 🔬 |
| Serveris (be agento) | 1 100 | 🔍 |
| Video piešimas (subtitrai, judesys, maketai) | 3 400 | 🔍 |
| Redaktoriaus būsena ir API | 1 700 | 🔍 |
| Redaktoriaus UI | 15 000 | 🗺️ |
| Vaizdų komponentai, fonai, registrai | 5 000 | 🗺️ |
| Skriptai | 2 400 | 🗺️ |
| *Neįeina:* `src/generated/` (agento parašytos scenos, ~21 000), `src/showcase/` (3D klipai, ~3 200) | | |

---

# I. AGENTAS 🔬

## 1. Kas yra run'o JSON'e ⬜
Pradedam nuo tikro failo `db/agent-runs/<id>.json`: ką jame saugome ir kodėl.

| Failas | Eil. | Būsena |
|---|---|---|
| `src/agent/run/run.ts`: viso run'o schema | 31 | ⬜ |
| `src/agent/run/status.ts`: visos būsenos | 28 | ⬜ |
| `src/agent/run/1-idea.ts`: forma | 18 | ⬜ |
| `src/agent/run/2-angle.ts`: vertė, šablonas, hookai | 70 | ⬜ |
| `src/agent/run/3-script.ts`: scenarijus | 40 | ⬜ |
| `src/agent/run/4-code.ts`: vaizdai kodu | 72 | ⬜ |
| `src/agent/run/5-voice.ts`: balsas | 9 | ⬜ |
| `src/agent/run/7-chat.ts`: pokalbis, žinutės, tikslai | 108 | ⬜ |
| `src/agent/run/asking.ts`, `log.ts`: klausimai, modelio iškvietimų žurnalas | 38 | ⬜ |

Po šito turiu mokėti atsakyti:
- [ ] Kas yra run'as ir kur jis saugomas?
- [ ] Kuo skiriasi `...FromAi` ir `...InRun` schemos?
- [ ] Ką reiškia `pausedFrom`?

## 2. Žemėlapis: visa eiga ⬜
| Failas | Eil. | Būsena |
|---|---|---|
| `server/agent/agent.ts` | 270 | ⬜ |

- [ ] Kokios keturios `agent.ts` dalys ir ką daro kiekviena?
- [ ] Kas vyksta paspaudus Approve, nuo mygtuko iki `done`?
- [ ] Kaip agentas tęsia po pauzės?
- [ ] Kodėl vienam run'ui leidžiamas tik vienas workeris (`working`, `again`)?

## 3. Išsaugojimas ir du rašytojai ⬜
| Failas | Eil. | Būsena |
|---|---|---|
| `server/agent/runs.ts`: run'ų failai, rašymų eilė | 42 | ⬜ |
| `server/agent/job.ts`: ką gauna kiekvienas žingsnis; `save`, `ai`, `mergeMessages` | 110 | ⬜ |
| `server/db.ts`: JSON failų skaitymas ir rašymas | 66 | ⬜ |
| `server/ids.ts` | 6 | ⬜ |

- [ ] Kas nutiktų be `updateRun` eilės?
- [ ] Ką loguoja `job.ai()` ir kodėl loguojami ir nepavykę iškvietimai?

## 4. Kalbėjimas su modeliu ⬜
| Failas | Eil. | Būsena |
|---|---|---|
| `server/agent/llm.ts`: vienos durys į modelį, `withRetries` | 218 | ⬜ |
| `server/agent/claudeCode.ts`: `claude -p`, leidimai, atsakymo skaitymas | 210 | ⬜ |
| `server/agent/models.ts`: modelio parinkimas žingsniui | 20 | ⬜ |
| `server/agent/limits.ts`: naudojimo limito atpažinimas | 6 | ⬜ |

- [ ] Ką tikrina Zod, jei API ir taip grąžina JSON?
- [ ] Kaip perjungti Gemini ↔ Claude, nekeičiant kodo?
- [ ] Kuo skiriasi `callStructured` ir `callAgent`?
- [ ] Kur vyksta laisvojo agento „ratai"?

## 5. Idėja, šablonas, hookai, klausimai ⬜
| Failas | Eil. | Būsena |
|---|---|---|
| `server/agent/steps/angle.ts` | 117 | ⬜ |
| `server/agent/steps/ask.ts` | 97 | ⬜ |
| `server/agent/messages.ts` | 114 | ⬜ |
| `prompts/checkValue.ts`, `pickTemplate.ts`, `writeHooks.ts`, `productScreens.ts` | ~350 | ⬜ |

- [ ] Kada agentas klausia kūrėjos, o kada pats nusprendžia?
- [ ] Kur dingsta atsakymas su „remember"?

## 6. Scenarijus ir jo patikra kodu ⬜
| Failas | Eil. | Būsena |
|---|---|---|
| `server/agent/steps/script.ts` | 73 | ⬜ |
| `src/agent/rules/checkScript.ts` | 56 | ⬜ |
| `src/utils/pacing.ts`: kalbėjimo greitis, scenų trukmė | 103 | ⬜ |
| `prompts/writeScript.ts`, `research.ts` | ~250 | ⬜ |

- [ ] Ką tikrina kodas, o ką AI?
- [ ] Kas nutinka, jei scenarijus po taisymo vis dar per ilgas?

## 7. Balsas ir vaizdai kodu ⬜
| Failas | Eil. | Būsena |
|---|---|---|
| `server/agent/steps/voice.ts` | 26 | ⬜ |
| `server/voice.ts`: ElevenLabs | 84 | ⬜ |
| `server/agent/codeScenes.ts`: rašymas, `checkScenes`, fallback, Undo | 325 | ⬜ |
| `server/agent/codeVersions.ts` | 25 | ⬜ |
| `server/agent/visuals.ts`: „Mano vizualai" | 107 | ⬜ |
| `src/agent/projectFromScript.ts`, `projectFromCode.ts`: run'as → projektas | 80 | ⬜ |
| `src/agent/agentVoice.ts`, `soundCues.ts`, `visualStyles.ts` | 160 | ⬜ |
| `prompts/writeCode.ts` | ~200 | ⬜ |
| `.claude/skills/tikmaker-scene`, `tikmaker-explainer`, `tikmaker-depth` (ne kodas, bet būtina) | — | ⬜ |
| `scripts/asset.ts`: tikri vaizdai (screenshotai, logotipai, įrašai) | ~300 | ⬜ |

- [ ] Ką laisvasis agentas gali daryti, o ko negali?
- [ ] Kaip kodas patikrina, ar scena gera?
- [ ] Kaip agento kodas tampa projekto scena redaktoriuje?

## 8. Agentas žiūri į savo kadrus ⬜
| Failas | Eil. | Būsena |
|---|---|---|
| `server/agent/steps/review.ts` | 212 | ⬜ |
| `server/agent/stills.ts`: kadrų renderinimas | 75 | ⬜ |
| `server/agent/frames.ts`: kurie kadrai | 35 | ⬜ |
| `prompts/reviewFrames.ts` + `knowledge/shared/review-rubric.json` | ~100 | ⬜ |

- [ ] Kada self-review sustoja?
- [ ] Kuo skiriasi `selfReview` ir `reviewOnRequest`?

## 9. Pokalbis ir router'is ⬜
| Failas | Eil. | Būsena |
|---|---|---|
| `server/agent/steps/chat.ts` | 228 | ⬜ |
| `server/trpc/agent.ts` | 92 | ⬜ |
| `prompts/routeMessage.ts`, `rewriteScene.ts` | ~100 | ⬜ |

- [ ] Kelią nuo žinutės iki pakeitimo: kas, kur, kokia tvarka?
- [ ] Kada agentas pirma pasiūlo, o ne daro?

## 10. Žinių bazė ⬜
| Failas | Eil. | Būsena |
|---|---|---|
| `src/agent/knowledge.ts`: žinių schemos | 174 | ⬜ |
| `server/agent/knowledge.ts`: įkėlimas ir klaidų sąrašas | 202 | ⬜ |
| `knowledge/` aplankas: šablonai, formulės, taisyklės, kanalas | — | ⬜ |
| `src/agent/stylePack.ts` | 27 | ⬜ |

- [ ] Kur pridėti naują video šabloną ar hook formulę?
- [ ] Kas yra workspace ir ką jis duoda promptams?

---

# II. VIDEO GAMYBOS ŠERDIS 🔬

## 11. Projektas ir scena: duomenys ⬜
| Failas | Eil. | Būsena |
|---|---|---|
| `src/schema/project.ts` | 81 | ⬜ |
| `src/schema/scene.ts` | 302 | ⬜ |
| `src/schema/visual.ts` (pakanka bendros struktūros) | 504 | ⬜ |
| `src/utils/normalizeProject.ts`: senų projektų pataisymas įkeliant | 358 | ⬜ |

- [ ] Iš ko susideda projektas?
- [ ] Kuo skiriasi kodo scena nuo kitų scenų?

## 12. Kaip video piešiamas ⬜
| Failas | Eil. | Būsena |
|---|---|---|
| `src/Root.tsx`, `src/index.ts`: Remotion kompozicijos | 82 | ⬜ |
| `src/video/TikTokVideo.tsx` | 46 | ⬜ |
| `src/video/SceneRenderer.tsx`: scenos laiko juostoje, perėjimai | 339 | ⬜ |
| `src/video/code/*`: kodo scenos įkėlimas, parametrai | 198 | ⬜ |
| `src/video/brand/kit.tsx`, `fields.ts`: brand kit ir redaguojami laukai | 254 | ⬜ |

## 13. Laikas ir žodžiai ⬜
| Failas | Eil. | Būsena |
|---|---|---|
| `src/utils/duration.ts`: scenų laikai | 79 | ⬜ |
| `src/utils/voiceClips.ts`, `sceneWords.ts`, `voWords.ts`, `captionWords.ts`, `captions.ts` | 235 | ⬜ |

- [ ] Kaip agentas žino, kuriame kadre ištariamas žodis?

## 14. Renderis ⬜
| Failas | Eil. | Būsena |
|---|---|---|
| `server/renderJobs.ts`, `server/trpc/renders.ts`, `scripts/render-project.ts` | ~150 | ⬜ |

---

# III. SERVERIS (be agento) 🔍

## 15. Serverio karkasas ir tRPC ⬜
| Failas | Eil. | Būsena |
|---|---|---|
| `server/index.ts`, `app.ts`, `config.ts` | 53 | ⬜ |
| `server/trpc/init.ts`, `router.ts` | 36 | ⬜ |
| `server/trpc/collections.ts`, `jsonFile.ts`: projektai ir storyboard'ai | 44 | ⬜ |
| `server/trpc/assets.ts`, `sfx.ts`, `visuals.ts`, `voice.ts`, `uploads.ts` | 208 | ⬜ |

- [ ] Kaip mygtukas redaktoriuje pasiekia serverį (tRPC)?

## 16. Temų skeneris ⬜
| Failas | Eil. | Būsena |
|---|---|---|
| `server/topics/collect.ts`: YouTube, Google Trends, HN, RSS | 244 | ⬜ |
| `server/topics/prompts.ts` | 203 | ⬜ |
| `scripts/findTopics.ts` | — | ⬜ |

---

# IV. VIDEO PIEŠIMAS 🔍

## 17. Subtitrai ir tekstas ⬜
`src/video/typography/` (1 670): `CaptionLayer`, `KineticCaption` (`video/stage/`), `RichHeadline`, `splitAnimate`, `Text`, `fonts`, `tokens`

## 18. Judesys, perėjimai, garsai ⬜
`src/video/motion/` (775): `transitions`, `entrances`, `exits`, `SceneSfx`, `sfxDefaults`

## 19. Maketai ir sluoksniai ⬜
`src/video/layout/` (470), `src/video/typography/VisualsLayer.tsx`, `BlockLayer.tsx`, `AnimatedVisual.tsx`, `src/utils/visualLinks.ts`

## 20. Stage, fonas, saugi zona ⬜
`src/video/stage/` (386), `src/video/backgrounds/` (263), `src/editor/SafeZoneOverlay.tsx`

---

# V. REDAKTORIUS 🔍 / 🗺️

## 21. Būsena ir ryšys su serveriu 🔍 ⬜
| Failas | Eil. | Būsena |
|---|---|---|
| `src/editor/state/projectStore.ts`, `projectStoreTypes.ts`: visas redaktoriaus atminties modelis | 703 | ⬜ |
| `src/editor/state/linkScenes.ts`, `editorPrefs.ts` | 104 | ⬜ |
| `src/api/*`: tRPC klientas, agento užklausos (polling) | 365 | ⬜ |
| `src/editor/AutoSave.tsx` | 25 | ⬜ |

## 22. Agento panelė 🔍 ⬜
`src/editor/agent/` (1 500): `AgentPanel`, `RunProgress`, `IdeaForm`, `HookCard`, `ScriptCard`, `ChatMessages`, `ChatInput`, `QuestionsCard`, `ReviewView`, `StepLog`…

## 23. Redaktoriaus karkasas 🗺️ ⬜
`src/editor/Editor.tsx`, `EditorToolbar`, `VideoPreview`, `RenderButton`, `panels/`, `useEditorShortcuts`, `usePreviewPlayer`… (~1 450)

## 24. Laiko juosta 🗺️ ⬜
`src/editor/timeline/` (5 800, didžiausia dalis). `SceneTimeline.tsx` ir `FullVideoTimeline.tsx` yra du vaizdai, `build*TimelineRows.ts` paverčia projektą eilutėmis.

## 25. Inspektorius 🗺️ ⬜
`src/editor/inspector/` (4 070). `CodeSceneFields.tsx` (kodo scenos laukai) yra svarbiausias. Kiti skirti seno tipo scenoms ir sluoksniams.

## 26. Biblioteka 🗺️ ⬜
`src/editor/library/` (1 700): Visuals, garsai, balsai, fonai, scenos

## 27. Storyboard 🗺️ ⬜
`src/editor/storyboard/` (222)

---

# VI. VAIZDAI, REGISTRAI, SKRIPTAI 🗺️

## 28. Vaizdų komponentai ⬜
`src/video/visuals/` (2 200) ir `src/video/scenes/` (525): rankiniam redagavimui skirti vaizdai (terminalas, naršyklė, diagramos, sąrašai) ir seno tipo scenos.

## 29. Registrai ⬜
`src/registries/` (1 545): logotipai, garsai, fonai, scenų tipai, vaizdų šablonai. `assets.generated.ts` generuojamas automatiškai (`npm run assets:sync`).

## 30. Skriptai ⬜
`scripts/`: `syncAssets`, `sfxGenerate`, `analyzeVideos`, `buildKnowledgeDraft`, `fetchVideoStats`, `extractFrames`, `checkProject`…

---

# Kur keisti: greita rodyklė

Pildome skaitydami. Formatas: *ką noriu pakeisti* → *failas:vieta*.

| Noriu… | Kur |
|---|---|
| pridėti naują agento žingsnį | `server/agent/agent.ts` runAgent + `steps/` |
| pakeisti, ką modelis gauna žingsnyje | `server/agent/prompts/<žingsnis>.ts` |
| pakeisti, kuris modelis daro žingsnį | `server/agent/models.ts` STEP_MODELS |
| pridėti scenarijaus taisyklę | `src/agent/rules/checkScript.ts` |
| leisti laisvajam agentui naują komandą | `server/agent/prompts/writeCode.ts` writeCode `allow` |
| | |

# Ką pastebėjome tvarkytina

Skaitant randami dalykai, kuriuos verta supaprastinti:

- [ ] Prompt funkcijos turi ilgus argumentų sąrašus su `undefined`: pakeisti vienu objektu, o testų modelį nustatyti per `setTestModel()`
- [ ] Laisvojo agento `Read` leidimas neribotas (gali perskaityti `.env.local`): apriboti iki `src/`, `.claude/`, `knowledge/`, `out/`
- [ ] Schemų failai `src/agent/run/` dar sunumeruoti (`1-idea.ts`, `7-chat.ts`): pervadinti kaip `steps/`
- [ ] Seno tipo scenos ir vaizdai (`video/scenes`, `video/visuals`, dalis inspektoriaus): ar dar reikalingi, kai agentas piešia kodu?
- [ ] Kodo scenų problemos atpažįstamos pagal tekstą (`"Scene N:"`): naudoti `{sceneIndex, message}`

# Mano užrašai

### Susitikimas 1: (data)
-
