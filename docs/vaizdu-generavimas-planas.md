# Vaizdų generavimas kodu – planas ir būklė (atnaujinta 2026-11-02)

Šablonai ir maža biblioteka neduoda tokių video, kokius kiti daro su Claude Code. Jų
video geri todėl, kad kiekviena scena nupiešiama kodu atskirai. Mūsų kelias: agentas
parašo scenarijų su aiškia istorija ir **vaizdų planą**, pagal jį kodą rašantis modelis
nupiešia scenas, o kodas jas patikrina, kol tu dar nematai. Tikslas – video, kurį
suprasti galima ir be garso.

## Kur esam

Viskas padaryta **eksperimento šakoje** `experiment/e1-e4` (aplankas
`C:\ig-tiktok-yt\wt-e`, atskiras nuo main). Main nepaliestas: jame tik šis planas ir
3D planas. **Į main kelsim tik tada, kai gausim norimą rezultatą**, ir tada kodą rašysi
pati, žingsnis po žingsnio (sutarta 2026-11-02).

Šakoje veikia keturios dalys. **Vaizdų planas (E1)** – agentas po scenarijaus parašo
režisūrinį planą (pasaulis, daiktai ir ką jie reiškia, kiekvienos scenos kadras, kas
atsiranda ant kurio žodžio), o kodas jį patikrina. **Piešimo skill'as (E2)** – Claude
Code pagal planą nupiešia scenas iš bibliotekos dalių. **Kadrų patikra (E3)** – kodas
išrenderina kadrus ir juos išmatuoja. **Biblioteka (E4)** – piešti daiktai, scena su
kamera, antraštė ir garsai, kuriuos naudoja visi video. Be to, scenarijus dabar turi
**istoriją**: vieną sakinį, lūžį, kulminaciją, visą video išliekantį daiktą ir
kiekvienai scenai, ką žiūrovas turi suprasti vien iš vaizdo.

## Rezultatai

| Video | Kas tai | Įvertinimas |
| --- | --- | --- |
| `out/ai-agents-2d.mp4` | pirmas bandymas, senasis scenarijus | prastas: neaišku, kas vyksta |
| `out/agents-flash.mp4` (A) | Flash modelio scenarijus ir planas, lentelė su užrašais | primena formą su užrašais |
| `out/agents-pro.mp4` (B) | Pro modelio scenarijus ir planas, robotukas-darbuotojas | geresnis už A, bet **dar nepakankamai aiškus** |

Visi trys piešti ta pačia biblioteka. A ir B skiriasi tik scenarijumi ir vaizdų planu,
todėl palyginimas rodo, kad stipresnis modelis su režisūros taisyklėmis rašo aiškiau.
Abiejų scenarijai šalia vienas kito – šakoje, `docs/eksperimentai/e-story/run-mvzczmc2.md`.
Ankstesni 3D bandymai – `out/ai-agent-explained-3d.mp4`, kodas šakoje `experiment/3d-desk`.

## Sprendimai

| Sprendimas | Kodėl |
| --- | --- |
| Scenarijui ir vaizdų planui – `gemini-pro-latest` (galvoja daug), kitiems žingsniams – Flash | B buvo aiškesnis; Pro lėtesnis (~106 s vietoj 33 s) ir naudoja ~8 kartus daugiau žetonų, bet tai tik du kvietimai viename video |
| Režisūros taisyklės – mūsų promptuose ir schemose, ne Gemini skill'uose | Gemini API skill'ų neskaito; taisyklė, paversta schemos lauku, nepraleidžiama |
| Naujus daiktus ar modelius pirma parodyti viename kadre ir tik tada dėti į video | parsiųsti 3D modeliai nederėjo tarpusavyje, video atrodė pasenęs |
| Formatą galima rinktis (žemiau) | vienai temai tinka skirtingi pasakojimo būdai |

## Formatai: vienas scenarijus, keli būdai jį parodyti

Scenarijus ir istorija lieka tie patys, keičiasi tik vaizdų planas. Plane atsiras laukas
`format`, ir kiekvienam formatui bus savas promptas.

| Formatas | Kuo pasakojama | Kas piešia | Būklė |
| --- | --- | --- | --- |
| **Motion** | langai, mygtukai, naršyklės, diagramos, grafikai, schemos | Claude Code, iš bibliotekos | **kitas bandymas (C)** |
| **2D siužetas** | personažai ir daiktai | Claude Code | bandyta (A, B) |
| **3D** | tas pats siužetas erdvėje | Claude Code | po BD (`docs/eksperimentai/3d-planas.md`) |
| **Rec** | tavo įrašai ekrane su užrašais ir išryškinimais | tu įrašai, TikMaker sudeda | jau yra (dabartinis agentas) |

Motion formatas tikriausiai seksis geriausiai: kodu lengviausia piešti tikslias formas,
tekstą ir langus, o sunkiausia – „vaidinančius“ personažus. Dalis motion dalių TikMaker
jau turi (`browser`, `terminal`, `claude-cli`, `flow`, `checklist`, `node-group`).

## Kas toliau (eilės tvarka)

| # | Kas | Kaip žinosim, kad pavyko |
| --- | --- | --- |
| 1 | **C – motion versija** to paties Pro scenarijaus: vaizdų plano promptas motion formatui (daiktai = sąsajos dalys: chato langas, TikMaker langas, diagramos mazgai, kodo patikros skydelis) ir piešimas | B ir C šalia – kuris aiškesnis be garso |
| 2 | **Nebylus kritikas**: kitas modelis mato tik kadrus ir turi atpasakoti video mintį; jei neatpasakoja, grąžinama taisyti (tai ir yra D9 „Kadrų vertinimas“) | kritikas atpasakoja mintį taip, kaip `story.oneSentence` |
| 3 | **Kompozicija vertikaliam kadrui**: daiktai ne eilėje vienas šalia kito, o vienas už kito (priekyje didesni), arba mažiau daiktų viename kadre | patikra nebeskundžia mažų daiktų |
| 4 | **Scenarijaus taisymai**: kabliukas „in three simple steps“ verčia rašyti „First / Second / Third“ – uždrausti numeruoti, kai scenos pasakoja vieną istoriją; sušvelninti per stiprius pažadus („never breaks“) | Pro scenarijuje nebėra sąrašo ir per stiprių teiginių |
| 5 | **Formato pasirinkimas** vaizdų plane (`format`) ir skydelyje | tą pačią idėją galima nupiešti keliais formatais |
| 6 | Kai rezultatas tinka – **kelti į main žingsnis po žingsnio** (E1 → E4), kodą rašai pati | – |
| 7 | Po BD: piešimas per API pačiame TikMaker (E5), 3D (E6) | – |

## Žingsniai E1–E6

| # | Kas | Būklė |
| --- | --- | --- |
| E1 | Vaizdų planas: schema `src/agent/run/visualPlan.ts`, patikra `src/agent/rules/checkVisualPlan.ts`, promptas `server/agent/prompts/writeVisualPlan.ts` | šakoje veikia (paleidžiama skriptu, dar ne skydelyje) |
| E1+ | Scenarijaus istorija: `story` ir `reads` laukai `src/agent/run/3-script.ts`, taisyklės `writeScript.ts`, patikra `checkScript.ts` | šakoje veikia |
| E2 | Piešimo skill'as `.claude/skills/draw-video/SKILL.md` | šakoje |
| E3 | Kadrų patikra `scripts/checkDrawn.ts` + `src/video/custom/FrameAudit.tsx` | šakoje veikia, randa tikras klaidas |
| E4 | Biblioteka `src/video/custom/kit/` (`objects.tsx`, `objects2.tsx`, `Stage.tsx`, `camera.ts`, `scene.tsx`, `timing.ts`, `palette.ts`) | šakoje |
| E5 | Piešimas per API serveryje | po BD |
| E6 | 3D formatas | po BD |

## Taisyklės, kurias tikrina kodas

| Taisyklė | Kaip tikrinama |
| --- | --- |
| Istorija: lūžis po kabliuko, kulminacija po lūžio ir paskutiniame 40 % video | `checkScript` |
| Kiekviena scena turi 1–2 dalykus, kuriuos suprasti galima vien iš vaizdo | schema ir `checkScript` |
| Įvykiai krenta ant žodžių, kurie tikrai ištariami, ir ta pačia tvarka | `checkVisualPlan` |
| Visą video išliekantis daiktas matomas daugumoje scenų; kiekvienas daiktas parodomas | `checkVisualPlan` |
| Ne daugiau 5 garsų visame video, ne daugiau 5 žodžių antraštėje | `checkVisualPlan` |
| Tekstas ne mažesnis už 42 px išrenderintame kadre | `checkDrawn` matuoja kadrą |
| Tekstas tarp šoninių paraščių (130 px) ir virš TikTok apatinės juostos | `checkDrawn` |
| Pagrindinis daiktas pakankamai didelis (stambiame kadre 15 %, vidutiniame 8 %, bendrame 4 % kadro) | `checkDrawn` |
| Ekrane ne daugiau 12 žodžių vienu metu | `checkDrawn` |
| Scenose nėra ranka įrašytų spalvų ir šriftų dydžių | `checkDrawn` skaito kodą |

## Kaip paleisti (šakos aplanke `C:\ig-tiktok-yt\wt-e`)

Vaizdų planas paleidimui: `node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/visualPlan.ts <runId>`.
Flash ir Pro palyginimas: tas pats su `scripts/compareScripts.ts <runId>`. Kadrų patikra:
`node node_modules/tsx/dist/cli.mjs scripts/checkDrawn.ts db/projects/<failas>.json 30`
(kadrai lieka `out/check/<projektas>/`). Video: `npx tsx scripts/render-project.ts db/projects/<failas>.json out/<vardas>.mp4`.
Šakos aplanke `node_modules` yra nuoroda į main aplanko, o šriftai, garsai ir `.env.local`
nukopijuoti (jų nėra git'e).

## Kaip tai daro kiti

Remotion turi oficialius agentų skill'us (`npx skills add remotion-dev/skills`) ir
pradinį projektą „Prompt to Motion Graphics“, kuriame modelis rašo kodą, o
kompiliavimo klaidos grąžinamos jam taisyti. Naudingiausias rastas skill'as –
[video-director](https://github.com/win4r/video-director) (MIT): viena mintis, vienas lūžis
ir vienas „herojaus momentas“, kiekvienai scenai – ką žiūrovas turi suprasti, rodyk
veiksmą, ne užrašą, ir **nebylus kritikas**, kuris iš kadrų turi atpasakoti mintį. Iš jo
paimtos mūsų istorijos taisyklės; pats skill'as neįdiegtas. Dar žr.
[vox-explainer](https://github.com/charlie947/motion-graphics-skills) (kiekviena scena
atsako į ankstesnę; daiktai juda erdvėje). Neradau, kad kas nors sietų kodu piešiamus
video su scenarijaus struktūra ir išmatuojamomis kadro taisyklėmis – tai būtų TikMaker
išskirtinumas.

Šaltiniai: [Remotion – coding agents](https://www.remotion.dev/docs/ai/coding-agents),
[Remotion – agent skills](https://www.remotion.dev/docs/ai/skills),
[Remotion – AI SaaS template](https://www.remotion.dev/docs/ai/ai-saas-template).
