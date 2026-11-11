# Temos: iš kur imti video idėjas, kurios turi vertę (planas, 2026-11-09)

## Problema

Video išeina gražūs, bet tušti: juose tai, ką žiūrovas gautų vienu promptu.
Trūksta dviejų dalykų:
1. **Temų su įrodymais** – ką žmonės dabar realiai klausia, kur stringa,
   kas trendina šią savaitę.
2. **Vertės patikros** – video agentas turi atpažinti tuščią video ir
   paprašyti daugiau (bandymo, skaičiaus, patirties).

## Tikslas

TikMaker viduje – skiltis **Temos**: savaitės pasiūlymai su analize ir
šaltiniais vienoje vietoje. Pasirenki temą → agentas kuria video su tos
temos įrodymais (įrašus, jei reikia, TikMaker jau moka paprašyti).

## Principai

- Pirma išsiaiškinam, tada statom. Kiekviena dalis baigiasi sprendimu.
- Pirma rankinis bandymas (pilotas), tik tada automatika – kad nestatytume
  skenerio temoms, kurios neveikia.
- Pirma nemokami šaltiniai; mokam tik ten, kur signalas įrodė vertę.
- Vertės patikra tobulinama eigoje – testuojam ir taisom.

---

## A. Šaltinių žemėlapis – ką kur ieškoti

**Klausimas:** kokį signalą duoda kiekvienas šaltinis ir ką tiksliai jame
žiūrėti?

Signalų rūšys (kiekvienas šaltinis duoda ne visas):

| Signalas | Ką reiškia | Pavyzdys |
| --- | --- | --- |
| Bėda | žmonės stringa, skundžiasi | Reddit įrašas „Claude Code burned $40 in an hour“ |
| Paklausa | ko žmonės ieško | paieškos pasiūlymai, Google Trends |
| Formatas / trendas | kokie video dabar veikia | TikTok populiariausi nišos video, garsai, formatai |
| Naujiena | kas ką tik išėjo (≤48 h) | Claude Code changelog, AI įrankių paleidimai |
| Įrodymas | kas jau suveikė kitiems | konkurentų video su daug peržiūrų/išsaugojimų |

Šaltiniai analizei (kiekvienam: ką žiūrėti, kaip dažnai, kokia prieiga):
- Reddit – r/ClaudeAI, r/ClaudeCode, r/vibecoding, r/SideProject,
  r/indiehackers, r/SaaS (bėda)
- Hacker News (bėda, naujiena)
- TikTok – nišos kūrėjų top video, paieška, Creative Center trendai
  (formatas, įrodymas, paklausa)
- YouTube – nišos video ir jų komentarai (bėda, įrodymas)
- X – AI kūrėjų įrašai, paleidimai (naujiena)
- Google Trends / paieškos pasiūlymai (paklausa)
- GitHub – Claude Code leidimai, populiarėjantys Remotion / skill'ų
  projektai (naujiena)
- Product Hunt (naujiena, įrankiai)

**Rezultatas:** lentelė „šaltinis → signalas → ką tiksliai ieškoti →
dažnis → prieiga“ ir kontrolinis sąrašas, kas daro temą gera.
**Sprendžia tu:** kurie šaltiniai pirmoje versijoje.

## B. Kas jau taip daro (konkurentai)

**Klausimas:** ar yra sistemų, kurios trendą / bėdą paverčia video? Ko joms
trūksta?

Analizuojam dvi grupes:
- trendų ir idėjų įrankiai (trendų radarai, TikTok / YouTube idėjų įrankiai);
- „idėja → video“ AI įrankiai.

Kiekvienam: ką daro, kiek kainuoja, ar sujungia temą su įrodymais ir
gamyba, ko trūksta.

**Rezultatas:** palyginimo lentelė ir TikMaker skirtumas vienu sakiniu
(spėjimas: tema su įrodymais + vertės patikra + tikri įrašai + pilnas
redaktorius – patikrinti).
**Sprendžia tu:** ar kryptis verta, ar yra ką perimti.

## C. API ir kaina

**Klausimas:** kaip pasiekti kiekvieną šaltinį, kiek tai kainuoja mūsų
apimtimi ir ar apsimoka?

Kiekvienam šaltiniui palyginti:
- oficiali nemokama prieiga (ribos);
- oficiali mokama;
- trečiųjų šalių scraper'iai / duomenų API (kaina už rezultatą ar mėnesį);
- naudojimo taisyklių rizika.

Apimtis skaičiavimui: 1 skenavimas per savaitę (+ rankinis „skenuoti dabar“),
~10 šaltinių, keli šimtai įrašų per kartą. Plius Claude kaina analizei
(per prenumeratą, kaip dabartinis agentas).

**Rezultatas:** lentelė „šaltinis → prieiga → €/mėn → rizika“ ir
rekomenduojamas minimalus rinkinys.
**Sprendžia tu:** mėnesio biudžetas ir ar mokėti už TikTok / X duomenis.

## D. Pilotas rankomis

**Klausimas:** ar tokiu būdu rastos temos iš tiesų duoda geresnius video?

Vieną kartą padarom skenavimą rankomis (aš: naršyklė + nemokami API) pagal
A dalies sąrašą. Gaunam 10–15 temų su įrodymais ir vertės balu. Tu iš jų
padarai 3–5 video, juos įkeliam ir matuojam (`content/log.md`: išsaugojimai,
pasidalinimai, follows).

**Rezultatas:** pirmos temos, išbandyta temos kortelės forma (kokie laukai
iš tiesų reikalingi) ir pirmi skaičiai.
**Sprendžia tu:** kurios temų rūšys verčiamos automatika.

## E. Vertės patikra video agente (lygiagrečiai, tobulinama eigoje)

Kryptis – `content/strategy.md` „Kryptis“: įkvėpimas („ką galima sukurti,
ir tu gali pradėti“), ne bug'ai ar tutorialai.

1. Tyrimo žingsnis (`server/agent/prompts/research.ts`) – ne „kas tai,
   kaip veikia“, o tikri dalykai: kas tai sukūrė ir kaip, tikras
   rezultatas, skaičiai, pirmas žingsnis, nuo kurio pradėti.
2. Nauja patikra prieš scenarijų, du klausimai:
   - „Ar scroll'inantis sustotų – kas čia wow?“
   - „Ką žiūrovas gaus, ko negautų vienu promptu (tikras projektas,
     rezultatas, pirmas žingsnis)?“
   Silpna → agentas klausia tavęs (tikras projektas, tavo bandymas,
   įrašas) arba siūlo stipresnį kampą.
3. Peržiūroje (`7-review`) vertė ir „tu irgi gali“ – kriterijai.

Testas: 5 idėjos – tuščia („3 skills“ video), saugumo tema (turi būti
atmesta kaip ne kanalo), ir 3 iš `docs/temos/D-pilotas.md` (turi praeiti).
Kas neveikia – taisom.

**Padaryta (2026-11-09):** `server/agent/prompts/checkValue.ts` – pirmas
„Angle“ žingsnis (prieš šabloną). Kryptis ir „ko nedarom“ – kanalo
`workspace.json` (`direction`, `offTopic`), ne kode. Silpna / ne kanalo
idėja → agentas klausia (tikras projektas? stipresnis kampas?), atsakius –
eina toliau ir pasako spragą pokalbyje. Rezultatas (`run.value`: wow,
takeaway, firstStep) keliauja į tyrimą, hook'us ir scenarijų. Tyrimas
perrašytas: tikri projektai, rezultatai, pirmas žingsnis – ne apibrėžimai.

Bandymas su tikru modeliu (Opus): saugumo tema → ne kanalo + geresnis
kampas; dainavimo treneris, vokselių miestas, AI detektyvas → stiprios;
„3 skills“ video pirmą kartą praėjo (modelis prisigalvojo, kad rezultatai
jau yra) → prompt'as pataisytas „vertink tai, kas parašyta“ → silpna, klausia
renderių ir skill failo. 5/5.

## F. Skiltis „Temos“ TikMaker'yje

Statom tik po A–D. Preliminariai:
- **Duomenys:** `db/topics/` (tema, kategorija, bėda žmonių žodžiais,
  įrodymai su nuorodomis, vertės balas ir kodėl, ką išbandyti, hook,
  statusas, susietas projektas, rezultatai), `db/scans/` (kiekvieno
  skenavimo žurnalas).
- **Serveris:** skeneris per šaltinį, Claude grupuoja ir vertina, tRPC
  procedūros kaip visur.
- **Redaktorius:** skirtukas „Temos“ – savaitės pasiūlymai, tema su visa
  analize ir šaltiniais, mygtukas **„Daryti video“** → agento paleidimas su
  tema ir įrodymais (eina tiesiai į E patikrą ir tyrimą).
- **Ritmas:** automatiškai kartą per savaitę + „Skenuoti dabar“.

## G. Matavimo ratas

Įkelto video rezultatai grįžta į temą. Kas 10 video: kurios kategorijos ir
šaltiniai duoda geriausius video → skeneris tuos vertina aukščiau.

---

## Eilė

1. **A + B + C** – analizė ✅ (2026-11-09), kiekviena atskiras
   dokumentas `docs/temos/`.
2. **E** – vertės patikra agente ✅ (2026-11-09).
3. **D** – pilotas rankomis ✅ dalinai (2026-11-09, be Reddit ir TikTok) – `docs/temos/D-pilotas.md`.
   Pamoka: iš jo kilę video-3 ir video-4 atmesti – temos be paklausos ir be
   naudos žiūrovui.
4. **v2 skeneris** ✅ (2026-11-10) – `npm run topics:scan`: paklausa iš
   YouTube (×N nuo kanalo įprasto), Google tendencijų ir naujienų, vartai
   (nauda žiūrovui, ne perkramtyta) ir naujas balas – `docs/temos/v2-kriterijai.md`.
   Ta pati taisyklė – agento vertės patikroje.
5. **F** – skiltis Temos (skaito `db/topics/`).
6. **G** – matavimas, nuolat.

## Atviri klausimai

- Auditorija: vibe coders / solo kūrėjai, kuriantys pirmą AI produktą –
  patvirtinti (nuo to priklauso A šaltiniai).
- Kalba: video angliškai, auditorija pasaulinė?
- Biudžetas API mėnesiui.
