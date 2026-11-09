# Turinio strategija

Tikslas: 100 → 1 000 sekėjų, išsiaiškinti, kas veikia, tada paleisti savo
produktą auditorijai, kuri jau pasitiki.

## Kryptis (2026-11-09)

Įkvepiantis, naudingas turinys: **„žiūrėk, ką galima sukurti su AI – ir tu
gali pradėti“**. Išmokyti kažko naujo, paskatinti pradėti kurti savo
(vėliau – kurti turinį su TikMaker).

Ne kanalo tema: bug'ų taisymas, saugumo incidentai, „kaip sutvarkyti X“
tutorialai. TikTok'e scroll'inantis su tuo nesusiduria; kas ieško
sprendimo, eina į YouTube.

Vertės testas kiekvienai idėjai: ar video duoda kažką, ko žiūrovas negautų
vienu promptu – tikrą projektą, tikrą rezultatą, pirmą žingsnį? Temos
vertinamos pagal `docs/temos/A-saltiniai.md` (wow, „tu irgi gali“, gražu
parodyti, vertė, šviežumas).

Pasikartojantis formatas: **„Built with AI this week“** – 3 tikri projektai,
kiekvienam: kas tai → kas sukūrė ir kodėl → pirmas žingsnis savo versijai.
Autorius ir nuoroda – visada.

## Stulpai (pillars)

| Dalis | Pillar | Kas tai | Kodėl |
| --- | --- | --- | --- |
| 50 % | `claude-code` | Konkretūs Claude Code tipsai: komandos, shortcut'ai, workflow | Siaura niša, paieška auga, sąrašai jau veikia |
| 25 % | `vibe-coding` | Klaidos, workflow, nuo ko pradėti, kaip greičiau | Platesnė auditorija, daugiau pradedančiųjų |
| 25 % | `ai-tools` | AI naujienos: nauja funkcija / modelis / įrankis per 24–48 h nuo išleidimo | Algoritmas mėgsta naujienas; greitis > tobulumas |
| retkarčiais | `build-in-public` | Kaip TU kuri savo produktą su AI | Paruošia auditoriją produkto paleidimui |

Naujienų taisyklė: tik tai, kas išėjo per paskutines 48 h, ir tik tai, ką
galima parodyti per 30 s („X just dropped — 3 things it does“). Senesnė
naujiena jau nebe naujiena. Artėjant produkto paleidimui įterpk ir
`build-in-public` video.

## Formatas

Vienas video, viena bėda. Įžvalga, o ne sąrašas:
hook (bėda parodyta) → kodėl taip nutinka → kiek kainuoja → sprendimas →
įrodymas (prieš/po) → kitos dalies anonsas. Serijomis („trap 1/3“).

Ekrane tekstas tik hook'as, captionai ir anonsas; visa kita rodoma.
Pavyzdys: `content/scripts/vibe-trap-01-forms.md`.

## Hook formulės (pirmos 2 s)

- `N <tool> <things> you need` — „5 Claude Code commands you need“
- `Stop <doing X>` — „Stop writing giant prompts“
- `N mistakes that <bad outcome>` — „3 mistakes that kill your AI app“
- `<tool> can now <surprising thing>` — naujienoms
- `I built <X> in <time> with AI` — build-in-public
- `You're using <tool> wrong` — tik jei tikrai turi įrodymą

Taisyklės: skaičius pirmoje eilutėje, nauda — pill eilutėje, ne ilgiau nei
~10 žodžių VO.

## Ką matuoti (content/log.md)

Po 48 h įrašyk: views, vidutinis žiūrėjimo laikas / retention, follows.
Kas 10 video — pažiūrėk, kuris pillar ir kuris hook tipas laimi, ir perkelk
mišinį į jo pusę. Keisk VIENĄ dalyką vienu metu (hook ARBA formatą ARBA ilgį),
kitaip nežinosi, kas suveikė.

## Ritmas

1 video per dieną > 7 video per savaitgalį. Sugeneruok 7 brief'us vienu kartu
(`/tiktok-video` su „sugeneruok 7“), bet kelk po vieną.
