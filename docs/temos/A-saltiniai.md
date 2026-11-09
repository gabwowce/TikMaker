# A. Šaltinių žemėlapis – ką kur ieškoti (2026-11-09)

Klausimas: kokį signalą duoda kiekvienas šaltinis ir ką tiksliai jame
žiūrėti, kad tema turėtų vertę?

Prielaida (iš plano atvirų klausimų): auditorija – vibe coders ir solo
kūrėjai, kuriantys pirmą AI produktą; video angliškai.

## Signalai

Gera tema = **bėda arba paklausa** (kažkam realiai reikia) + **įrodymas**
(daug žmonių, skaičiai) + **ką galim pridėti** (bandymas, skaičius, įrašas).
Trendas ir formatas sako *kaip* pasakoti, ne *apie ką*.

| Signalas | Klausimas, į kurį atsako |
| --- | --- |
| Bėda | Kur žmonės stringa, kas juos pykdo, kas kainuoja pinigus/laiką? |
| Paklausa | Ko jie ieško savais žodžiais? |
| Naujiena | Kas išėjo per 48 h ir ką tai pakeičia JIEMS? |
| Formatas / trendas | Kokie video šioje nišoje dabar veikia ir kodėl? |
| Įrodymas | Kas jau suveikė kitiems (peržiūros vs. jų vidurkis)? |

## Šaltiniai: ką tiksliai žiūrėti

| Šaltinis | Signalas | Ką ieškoti | Dažnis | Prieiga (C) |
| --- | --- | --- | --- | --- |
| Reddit: r/ClaudeAI, r/ClaudeCode, r/vibecoding, r/SideProject, r/indiehackers, r/SaaS | bėda, paklausa | savaitės top įrašai su skundu / klausimu („how do I“, „why does“, „burned $“, „gave up“, „stuck“); komentarų skaičius > balsų (= diskusija, skausmas); pasikartojanti bėda keliuose įrašuose | kas savaitę | scraper / naršyklė |
| Hacker News | bėda, naujiena | „Show HN“ ir „Ask HN“ apie AI kodavimą; komentarai su patirtimi, skaičiais | kas savaitę | nemokama |
| **TikTok** | formatas, įrodymas, paklausa | žr. atskirą skyrių žemiau | kas savaitę | scraper / naršyklė |
| YouTube | įrodymas, bėda | nišos video, kurie peržiūromis gerokai lenkia kanalo vidurkį; komentarai su klausimais | kas 2 sav. | nemokama |
| X | naujiena | AI kūrėjų ir įrankių paskyrų paleidimai, „just shipped“; Anthropic | kas dieną–savaitę | vėliau (mokama) |
| GitHub | naujiena | Claude Code leidimai (changelog), populiarėjantys Remotion / skill'ų / MCP repo | kas savaitę | nemokama |
| Changelog'ai, blogai (Anthropic, Cursor, Lovable, Supabase…) | naujiena | funkcija, kurią galima parodyti per 30 s | kas dieną–savaitę | nemokama |
| Product Hunt | naujiena | dienos/savaitės top AI dev įrankiai | kas savaitę | nemokama ? |
| Google Trends / paieškos pasiūlymai | paklausa | ar tema auga; kaip žmonės ją vadina | prie konkrečios temos | vėliau |

## TikTok atskirai

TikTok mums svarbus kitaip nei kiti: jis rodo **kaip** pasakoti, ir tik
kartais **apie ką**.

1. **Nišos kūrėjų „išsišokę“ video** (svarbiausia). 15–20 kūrėjų apie
   Claude Code / vibe coding / AI įrankius. Ieškom video, kurių peržiūros
   ≥ 3× to kūrėjo vidurkio. Ne tiesiog populiarūs – populiarūs *jam*.
   Užsirašom: tema, hook'as (pirmos 2 s), formatas (sąrašas, prieš/po,
   eksperimentas, istorija), trukmė, išsaugojimų/peržiūrų santykis.
2. **Paieškos pasiūlymai.** Įrašius „claude code“, „vibe coding“, „cursor“ –
   ką TikTok siūlo užbaigti. Tai žmonių žodžiai = hook'ų žodynas.
3. **Komentarai po populiariais video.** Klausimai („how did you…“,
   „does it work for…“) = neatsakytos bėdos = kitas mūsų video.
4. **Trendai (garsai, hashtag'ai)** – mažiausiai svarbu edukaciniam
   turiniui; Creative Center 2026 m. vis tiek beveik tuščias.

Iš to atskirai gimsta **formatų biblioteka**: kas veikia nišoje (pvz.
„eksperimentas su skaičiumi“, „prieš/po“, „aš sugadinau X“). Ją vėliau
skaito ir video agentas, renkantis šabloną.

## Temos kortelė ir balas

Laukai: tema · kategorija (bėda / naujiena / įrankis / formatas) · bėda
žmonių žodžiais (citata) · įrodymai (nuorodos, balsai, komentarai,
peržiūros) · šviežumas · **vertės testas** · ką pridėti mes · hook'o
pasiūlymas · statusas · susietas video · rezultatai.

**Kanalo kryptis (2026-11-09):** įkvepiantis, naudingas turinys – „žiūrėk,
ką galima sukurti su AI, ir tu gali pradėti“. NE bug'ų taisymas, saugumo
incidentai ar „kaip sutvarkyti X“ – scroll'inantis žiūrovas su tuo
nesusiduria, o kas ieško sprendimo, eina į YouTube.

Balas (0–100), kiekviena dalis su paaiškinimu:

| Dalis | Svoris | Klausimas |
| --- | --- | --- |
| Wow / smalsumas | 30 | Ar scroll'inantis sustotų? Ar tai atrodo neįmanoma / netikėta? |
| „Tu irgi gali“ | 25 | Ar paprastas žmogus galėtų tai pradėti šią savaitę? Ar įkvepia kurti? |
| Gražu parodyti | 20 | Ar tai vizualu 9:16 formatu (tikras rezultatas, ne tekstas)? |
| Vertės testas | 15 | Ar gaunama kažkas, ko vienas promptas neduotų (tikras projektas, skaičius, pirmas žingsnis)? |
| Šviežumas | 10 | Ar tai nauja (ką tik pasirodęs projektas, galimybė)? |

Atmetam iš karto: bendros žinios („kas yra MCP“), bug'ai, saugumo
incidentai ir trikčių šalinimas, temos, kurių negalim gražiai parodyti.

Signalai pagal svarbą šiai krypčiai: **ką žmonės sukūrė** (HN „Show HN“,
YouTube „I built…“, Product Hunt) → **naujos galimybės** (ką AI ką tik
išmoko) → formatas / įrodymas (TikTok) → bėdos tik tos, kurios stabdo
pradėti kurti („nežinau, ką kurti“, „nemoku programuoti“).

## Savaitės ritmas (pilotui ir vėliau automatikai)

1. Surinkti (šaltiniai pagal lentelę).
2. Sugrupuoti panašias bėdas į temas.
3. Įvertinti balu, atmesti tuščias.
4. 10–15 geriausių – į temų sąrašą su įrodymais.
5. Tu renkiesi → agentas daro video.

## Sprendžia tu

1. Patvirtinti auditoriją ir kalbą.
2. Pirmos versijos šaltiniai. Siūlau: Reddit, HN, TikTok, YouTube, GitHub +
   changelog'ai. X ir Google Trends – vėliau.
3. Ar duosi 15–20 TikTok kūrėjų, kuriuos jau seki (jei ne – surinksiu
   pilote).
