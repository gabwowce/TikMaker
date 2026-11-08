# TikMaker: kas tai yra, ko jam reikia ir planas (2026-11-07)

## Kas yra TikMaker

**Automatizuota studija edukaciniams ir pasakojamiesiems trumpiems video**
(TikTok, Reels, Shorts), kurie **užkabina ir išlaiko žiūrovą**. Turinio pavyzdžiai:
faktai, „3 Claude Code paslaptys“, instrukcijos, įrankių paaiškinimai su ekrano
įrašais, istorijos.

Ko TikMaker nedaro: reklaminių „wow“ filmukų apie produktus (launch film).
Tam yra kiti įrankiai.

Kam jis skirtas:
- **tau**: kanalas apie AI įrankius (demo, instrukcijos, edukacija) ir
  netiesioginė TikMaker reklama („made with TikMaker“ pabaigoje, CTA);
- **tau vėliau**: antras kanalas su istorijomis;
- **kitiems vėliau**: tas pats tikslas (peržiūros, affiliate, savo produkto
  reklama), tik jų kanalui ir jų produktui.

Kanalas = **workspace**: auditorija, tikslas (peržiūros / affiliate / produktas),
produkto ekranai, prekės ženklo rinkinys (šriftas, spalvos, fonas, subtitrai),
žinomi faktai.

## Kas lemia kokybę (pagal svarbą)

1. **Scenarijus ir hook** – jau stiprus: šablonai, formulės, klausimai, kai
   agentas nežino.
2. **Vaizdai**: ekrano įrašai + aiškus paaiškinamasis motion dizainas su
   „prekybine“ išvaizda – paprasta, bet su wow. **Čia dabar silpniausia vieta.**
3. **Balsas, subtitrai, garsas** – balsas ir subtitrai veikia, garsas silpnas.
4. **Agentas pats pasitikrina** – peržiūra akimis veikia.
5. **Viską galima pataisyti žinute** – pokalbis veikia.

## Sprendimas dėl vaizdų: vienas kelias, ne du režimai

Eksperimentas parodė, kad Claude, rašantis scenų kodą pagal skilą, smarkiai
lenkia bibliotekos blokų rinkimą. Siūlau **ne pridėti antrą režimą, o
pakeisti vaizdų žingsnį** (taip pat, kaip anksčiau išmetėm senus maketus –
vienas kelias, be senų atšakų):

- vaizdus rašo **Claude kodu**, kiekvienai scenai;
- pagal **tris skilų sluoksnius**:
  1. **oficialus Remotion skilas** – kaip techniškai teisingai rašyti;
  2. **TikMaker paaiškinamojo motion skilas** – mūsų žanras: vienas pagrindinis
     vaizdas, aiškumas, sinchronizacija su žodžiais, kas užkabina;
  3. **kanalo prekės ženklo rinkinys** – tavo šriftas, spalvos, fonas,
     subtitrai, logotipai, nuotraukų ir įrašų vietos;
- **biblioteka nedingsta, bet tampa statybinėmis dalimis**: subtitrai, fonas,
  įrašo rėmelis, nuotraukos vieta, logotipai. Jas naudoja sugeneruotas kodas,
  o ne agentas renkasi iš blokų sąrašo.

Viename kanale vienas stilius, todėl pasirinkimų formoje nereikia.

## Kaip tai atrodo redaktoriuje

- Sugeneruota scena projekte yra **viena „kodo scena“**. Laiko juostoje ji
  rodoma su balsu, subtitrais ir trukme kaip ir dabar, ją rodo Player.
- Skilas reikalauja, kad kodas **išvardintų, ką galima keisti**: tekstus,
  nuotraukų ir įrašų vietas, skaičius. Inspector'ius juos rodo kaip formą.
- Kas formoje netelpa (išdėstymas, judesys) – **žinute**: „3 scenoje padaryk
  vaizdą didesnį“ → agentas perrašo tą sceną ir peržiūri kadrus.

## Ką imti iš repozitorijų (ir ko ne)

| Repo | Ką imam | Kada |
|---|---|---|
| **argo** | Playwright pats paspaudo programą ir įrašo ekraną. Agentas pagal įrašo užklausą parašo scenarijų paspaudimams ir **pats įrašo TikMaker ekranus** – tau nereikia įrašinėti | 2 etapas |
| **video-director** | jų taisykles ir QA patikras perkeliam į mūsų peržiūrą (rubriką) | kartu su 1 etapu |
| **earshot** | idėją, kaip agentui „išgirsti“, ar garsas krenta ant vaizdo | 3 etapas |
| **reanimate** | perkelti judesį iš pavyzdinio video į skilą | jei reikės |
| take-one | palyginti jų peržiūros eigą su mūsų | tik pažiūrėti |
| huashu-motion, rossark, explainroo, HyperFrames | ne mūsų formatas arba kitas variklis | – |

## Eksperimento rezultatai (šaka experiment/code-video, 2026-11-07)

Tas pats 11 testo scenarijus ir balsas („3 Claude Code mistakes that burn your
tokens“), vaizdus rašo Claude Code fone (`claude -p`, Opus, ~11–14 min vienam
video). Kompozicijos `src/Root.tsx`, kodas `src/experiments/codeVideo/`.

| Kompozicija | Skilai | Rezultatas |
|---|---|---|
| `CodeVideo` | mūsų pirmas skilas `.claude/skills/motion-video` | vientisas HUD stilius, bet vaizdai maži, viršuje |
| `CodeVideoOnetake` | `skills/one-take` | viena kortelė virsta kita, ramu, bet monotoniška |
| `CodeVideoOfficial` | oficialus Remotion skilas, jokio mūsų dizaino | **geriausias**: drąsus, spalvingas, didelės antraštės, lipdukai |
| `CodeVideoBrand` | oficialus + `skills/tikmaker-explainer` + brand kit | tavo stilius išlaikytas (fonas, subtitrai, šriftas), viena kortelė, MISTAKE/FIX, lipdukai; silpniau: kortelė per maža, nuotraukos vieta užlipo ant kito elemento |

MP4: `out/code-video-brand.mp4`, `out/code-video-official.mp4` (neįrašyti į git).
Išvada: kryptis pasiteisino – Claude su skilais smarkiai lenkia bibliotekos
blokų rinkimą; skilas ir brand kit laiko stilių.

## Kaip veiks (sprendimas)

**Biblioteka keičiasi.** Agento žingsnis „rink blokus + judesį“
(`pickBlocks`/`pickMotion`) išmetamas; jį keičia „parašyk scenos kodą pagal
skilus“. Lieka statybinės dalys (brand kit): fonas, subtitrai, šriftas ir
spalvos, nuotraukų ir įrašų vietos, logotipai, garsai. Atsiranda nauja
biblioteka – **„Mano vizualai“** (Claude padarytos scenos, kurias išsaugai).

**Projekte:** video lieka scenų sąrašas; scena gali būti **kodo scena** –
kodas faile (`generated/<projektas>/scene-N.tsx`), projekte nuoroda ir
parametrai. Player ją rodo, renderis renderina, laiko juostoje trukmė, balsas
ir subtitrai kaip dabar.

**Redagavimas, nuo paprasčiausio:**
1. **Forma Inspector'iuje** – skilas reikalauja, kad kodas išvardintų, ką
   galima keisti (tekstai, skaičiai, nuotraukų/įrašų vietos, ant kurio žodžio
   kas atsiranda). Kodo neliečiam.
2. **Įprasti sluoksniai** ant kodo scenos viršaus (logotipas, tekstas, rodyklė).
3. **Žinute agentui** – išdėstymas, judesys, visas vaizdas: perrašo tik tą
   sceną, pasitikrina kadrus; ankstesnė versija išsaugoma, Undo grąžina.

**Pakartotinis naudojimas:** „Išsaugoti kaip mano vizualą“ → kodas + kadras +
aprašas į kanalo vizualų biblioteką; agentas ją mato ir gali pritaikyti; gali
paprašyti „naudok kuro rodyklę iš praeito video“.

**Agento eiga:** idėja → hook → scenarijus → vaizdai kodu (Remotion skilas +
TikMaker skilas + brand kit + mano vizualai) → patikra (kompiliuojasi,
renderinasi) → kadrai → peržiūra akimis → taisymas (iki 3 ratų) → balsas,
subtitrai → redaktorius.

**Rizikos:** ~12–15 min ir Opus limitai vienam video (pauzė ties limitu jau
yra); sugedęs kodas – agentas taiso, nepavykus scena lieka paprasta su klaidos
žinute; seni projektai su blokais toliau atsidaro ir renderinasi.

## Planas – 6 žingsniai

Kiekvienas žingsnis patikrinamas atskirai (testai + naršyklė).

1. **Kodo scena projekte.** Naujas scenos tipas (`code`): kodas faile, Player
   (Vite dinaminis importas) ir Remotion renderis jį rodo; laiko juosta rodo
   trukmę, balsą, subtitrus. 4 bandymo video (`CodeVideoBrand`) perkeliamas į
   tikrą projektą, kad atsidarytų redaktoriuje.
2. **Redaguojami laukai.** Kodo scena eksportuoja parametrų schemą (Zod):
   tekstai, skaičiai, nuotraukų/įrašų vietos, žodžių inkarai. Inspector'ius
   rodo formą; nuotraukų/įrašų vietos pildomos per esamą `AssetSelect`
   (Import…) vietoj `brand/media.ts`. Brand kit perkeliamas iš eksperimento į
   `src/video/brand/`.
3. **Agento žingsnis: vaizdai kodu.** `server/agent/steps/4-building.ts`
   vietoj `pickBlocks`/`pickMotion` paleidžia Claude Code (`claude -p` su
   Write/Read/Edit ir `tsc` + `remotion still`) su skilais
   (`remotion-best-practices`, `tikmaker-explainer` + brand kit taisyklės,
   pataisytos pagal 4 bandymą: pagrindinis vaizdas ≥ 60 % zonos, nuotraukos
   vieta didelė ir niekada ant kito elemento, kiekviena scena su antrašte).
   Toliau – esama peržiūra akimis ir pauzė ties limitu. `projectFromBlocks`
   keičia kodo scenų statymas. Blokų rinkimo kelias išmetamas.
4. **Taisymas žinute.** Pokalbio `pictures`/`motion` taikiniai perrašo vienos
   kodo scenos failą; versijų istorija (ankstesnis kodas išsaugomas), Undo.
5. **„Mano vizualai“.** Mygtukas išsaugoti kodo sceną (kodas + kadras +
   aprašas) į `knowledge/workspaces/<id>/visuals/`; agentas mato sąrašą ir
   gali pritaikyti; Visuals skiltyje rodomi.
6. **Pilnas bandymas.** Naujas video per agentą nuo idėjos iki MP4 su visais
   1–5; palyginimas su `CodeVideoBrand`/`CodeVideoOfficial`.

Po 6 (atskirai): automatiniai ekrano įrašai (argo, Playwright), garsas
(earshot idėja), istorijų kanalas, personažas su veidu, TikMaker kitiems.

**Ko nedarom:** naujų bibliotekos blokų, dviejų režimų, stilių pasirinkimų
formoje, launch filmukų.

## Baigiamajam darbui

1 etapas keičia vieną agento žingsnį: vietoj „išdėstymas iš bibliotekos“
lieka „vaizdai kodu pagal skilus“. Reikalavimus apie išdėstymo parinkimą
(FR-11 ir gretimus) reikėtų peržiūrėti su vadovu.

## Įgyvendinta (šaka experiment/code-video, 2026-11-07)

| Žingsnis | Kas padaryta | Kur |
|---|---|---|
| 1 Kodo scena | scenos tipas `code`: `scene.code = { file, params }`, kodas `src/generated/<projektas>/scene-N.tsx`; Player (Vite) ir renderis (webpack) krauna tuo pačiu dinaminiu importu; scena gauna savo žodžius iš balso (`sceneWords`); sugedęs kodas rodo klaidą tik toje scenoje. 4 bandymas perkeltas į projektą `code-video-brand` | `src/video/code/`, `src/video/SceneRenderer.tsx`, `src/generated/code-video-brand/` |
| 2 Laukai | `export const schema = z.object({...})` su `field.text/number/word/photo/recording/...` → forma Inspector'iuje; nuotraukų ir įrašų vietos per `AssetSelect` (Import…); brand kit `src/video/brand/` | `src/video/brand/fields.ts`, `src/editor/inspector/CodeSceneFields.tsx` |
| 3 Agentas | 4 žingsnis = Claude Code (`claude -p`, opus) projekto aplanke su skilais `.claude/skills/remotion-best-practices` + `.claude/skills/tikmaker-explainer`; rašyti leidžiama tik `src/generated/<projektas>/`; pats paleidžia `tsc` ir `remotion still`, žiūri kadrus; serveris dar kartą tikrina `tsc`, vieną kartą grąžina klaidas, nepavykus – paprasta scena su klaida. Balsas dabar daromas prieš vaizdus. Blokų kelias (`pickBlocks`, `pickMotion`, `projectFromBlocks`, `checkBlocks/Motion`) išmestas | `server/agent/codeScenes.ts`, `server/agent/prompts/writeCode.ts` |
| 4 Taisymas žinute | `pictures`/`motion`/`words` perrašo tos scenos failą (peržiūra – visas taisytinas scenas vienu paleidimu); senas kodas `db/code-versions/`, Undo Inspector'iuje | `server/agent/codeVersions.ts`, `agent.undoScene` |
| 5 Mano vizualai | „☆ Save as my visual“ → `knowledge/workspaces/<id>/visuals/<id>/` (kodas, shared, kadras, aprašas, laukai); Visuals › My visuals su „Use in scene N“; agentas sąrašą gauna rašydamas vaizdus | `server/agent/visuals.ts`, `src/editor/library/VisualLibrary.tsx` |

### 6 žingsnis: pilnas bandymas

Idėja: „3 Claude Code commands most people never use“ (/rewind, /compact,
plan mode), 35 s, „motion graphics only“, **be balso** (šioje aplinkoje
ElevenLabs nepasiekiamas – todėl ir be subtitrų). Projektas `code-final`,
paleidimas `run-mw67ocbd`, MP4 `out/6-ingsnis-pilnas-bandymas-*.mp4` (ne git).

Laikas: šablonas+hookai+scenarijus ~0,5 min; **vaizdai kodu 7,6 min
(6 scenos)**; savipatikra 2 ratai (kadrai 36 + 31 s, 4 scenos taisymas 82 s) –
iš viso ~10,6 min modelio darbo. Pirmas ratas rado lipduką ant santraukos
(4 sc.) ir pataisė; antras rado tą patį 3 scenoje ir sustojo („ne geriau“).

Palyginimas (`docs/eksperimentai/kodo-scenos-palyginimas.jpg`, 70 % scenos):
- **Naujas** laiko tavo stilių kaip CodeVideoBrand (fonas, šriftas, oranžinė),
  bet geriau: **kiekviena scena su antrašte ir „COMMAND 0N“ juosta**, per visą
  video eina 1-2-3 skirtukų juosta (tęstinumas tarp atskirų scenų failų),
  lipdukai ant žodžių, nieko neužlipa po savipatikros (išskyrus 3 sc. lipduką).
- Silpniau: pagrindinis vaizdas vis dar ~65–70 % zonos aukščio, ne visa zona;
  2 scena – trys tušti pilki laukeliai (atrodo kaip šablonas); be balso
  apatinė pusė tuščia (subtitrų juostos nėra).
- **CodeVideoOfficial** lieka drąsiausias (didesni vaizdai, ryškios spalvos,
  didelės antraštės) – bet ne tavo stilius ir neredaguojamas.

Ką toliau: skilui – „pagrindinis vaizdas iki y 1060, ne trumpiau“, „jokių
tuščių placeholder eilučių“; balsas šioje aplinkoje (leisti `api.elevenlabs.io`).

### Aiškus stilius (po 6 žingsnio, kūrėjo pavyzdžiai)

Pastaba: per daug smulkių detalių ir teksto – TikTok žiūrovas nespėja
perskaityti ir nežino, kur žiūrėti. Pavyzdžiai (YouTube kūrėjas):
`.claude/skills/tikmaker-explainer/references/example-1…5.jpg`.

Pakeista:
- `tikmaker-explainer` skilas: 2–6 dideli plokšti objektai ir piktogramos,
  **tekstas – pilki brūkšniai**, tikras žodis tik vienas (komanda, skaičius),
  **vienas oranžinis fokusas**, kita pilka / pritemdyta / sulieta; istoriją
  pasakoja tai, ką daro formos; antraštė tik kai paveikslas negali pasakyti;
  „suspaudimo“ (squint) testas. Ankstesnė taisyklė „kiekviena scena su
  antrašte“ atsisakyta.
- Peržiūra: rubrikoje nauja „fix“ patikra `glanceable` (> ~6 dalykų ar
  skaitomas tekstas), pavyzdinis lapas `reference-frames/icon-minimal.png`.

Bandymas su tuo pačiu scenarijumi (projektas `code-clear`, `run-clearlook`):
vaizdai 7 min, savipatikra – „visos scenos skaitosi gerai“ (3 pastabos).
Palyginimas `docs/eksperimentai/aiskus-stilius-pries-po.jpg`.

### Garsai ir pavyzdžių vaidmenys

- **Garso efektai:** agentas savo atsakyme kiekvienai scenai pažymi 0–2
  akimirkas (`sounds: [{ onWord, sound }]`, rūšys: whoosh, slide, pop, enter,
  ping, tick, count, success, fix, break, type, message, reveal, check).
  Sistema (`src/agent/soundCues.ts`) jas paverčia garso klipais iš bibliotekos
  laiko juostoje ant to žodžio (2 kadrai anksčiau, garsumas 0,55) – juos galima
  perstumti, nutildyti, ištrinti. Kode `<Audio>` agentas nededa. Riba – ~3
  per 10 s (dizaino taisyklė `sfx-density`). Perrašius sceną, perstatomi tik
  jos garsai; ranka pridėti lieka.
- **Pavyzdžiai:** du rinkiniai, du vaidmenys – STILIUS (kūrėjo pavyzdžiai,
  `icon-minimal`: kaip piešiama) ir KOMPOZICIJA (`insiderforce`: kaip
  išdėstytas kadras). Agentas abu mato ir rašydamas kodą, ir peržiūroje;
  peržiūra kiekvieną kadrą lygina su abiem, kiekvieną savo dalykui.
- Bandymas `code-clear` iš naujo: 7 min, 11 garsų per 36 s, savipatikra –
  „visos scenos skaitosi gerai“.

### Du vizualiniai stiliai (pasirenkama formoje)

Formoje „Visual style“: **Clear** (kaip iki šiol) arba **Depth** (naujas).
Skilai `.claude/skills/`:
- `tikmaker-scene` – bendra kodo scenos sutartis (zona, brand kit, laukai,
  garsai, technika), skaitoma visada;
- `tikmaker-explainer` – stilius Clear (pavyzdžiai `references/`);
- `tikmaker-depth` – stilius Depth: 2.5D stiklinės kortelės perspektyvoje,
  spyruokliniai judesiai, nuolatinis „dock“, žodis po žodžio antraštės,
  kamera nuolat juda, **kiekviena scena su savo fono spalva** (stilius pats
  piešia foną). Pavyzdžiai: `references/*.jpg|png` + du kadrų analizės JSON.

Registras `src/agent/visualStyles.ts`; stilius išsaugomas paleidime
(`run.input.visualStyle`), juo naudojasi ir taisymai žinute. Peržiūra mato
kompozicijos lapą ir tik **savo** stiliaus pavyzdžius.

Bandymas `code-depth` (tas pats scenarijus, be kūrėjo kadrų – tik tekstas ir
analizės): 9 min, savipatikra – „visos scenos skaitosi gerai“. Palyginimas
`docs/eksperimentai/clear-vs-depth.jpg`.

### Depth v2 (pagal kūrėjos 13 kadrų) + tikri vaizdai + perėjimai

- **Perėjimai variklyje:** kai scena ateina su judesiu, ankstesnė scena
  piešiama po ja dar 12 kadrų ir išeina priešinga kryptimi (push/slide,
  zoomThrough, fromDepth, flip, nauji `dissolve` ir `flash`). Agentas
  kiekvienai scenai pasirenka `transition`; ranka keičiama Motion skiltyje.
- **Tikri vaizdai (`scripts/asset.ts`):** `screenshot` (svetainė naršyklės
  kortelei), `scroll` (puslapio slinkimo įrašas), `logo` (Simple Icons, CC0),
  `photo` (Pexels, reikia `PEXELS_API_KEY`), `tikmaker` (Playwright pats
  spaudo TikMaker redaktorių ir įrašo – argo idėja). Naudoja Remotion jau
  turimą Chrome; failai – `public/assets/agent/<projektas>/`. Agentui leista
  `Bash(npx tsx scripts/asset.ts:*)`.
- **Depth skilas perrašytas pagal kadrus** (`references/01…13-*.jpg`, lapas
  `reference-frames/depth-glass.png`): tikri logotipai ir svetainės stiklinėse
  kortelėse, kiekvienos scenos spalva, ~1 iš 4 scenų šviesi, didžiulis blankus
  motyvas fone, antraštė 1–2 eilutės `fontUi`, „dock“, perėjimų taisyklės.
  Brand kit: `SCENE_COLORS`, `DARK_BG`, `LIGHT_BG`, `asset()`.
- Bandymas `code-depth` (be interneto GitHub'ui): 11 min, agentas pats
  atsisiuntė Claude Code dokumentacijos ekranus ir logotipus.

### Argo bandymas: TikMaker pats save įrašo

Idėja apie TikMaker, Depth, be balso (projektas `code-argo`, `run-mw7h6ktf`).
Agentas parašė 5 paspaudimų scenarijus (`src/generated/code-argo/steps-*.json`)
ir pats įrašė redaktorių: formą, agento panelę, hookų kortelę, scenarijaus
patvirtinimą, sukurtą video; 9 scenos su tikrais ekranais ir „dock“
(Idea → Angle → Script → Building → Result). Vaizdai 18 min, savipatikra 2
ratai (pataisė 3 sceną – per daug teksto). Kadrai
`docs/eksperimentai/argo-tikmaker-irasai.jpg`.

Pagal agento pageidavimus įrašytuvui pridėta: `project` (atidaro projektą
pagal id), `select` (išskleidžiamas sąrašas), `still` (ryškus 2x PNG, visas
ekranas arba apkirptas iki kortelės/panelės aplink tekstą). Dar trūksta:
TikMaker logotipo bibliotekoje; peržiūros lange headless įraše kodo scenos
negroja; renderio eigos įrašas (kad nepaleistų tikro renderio).
