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
