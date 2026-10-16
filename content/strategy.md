# Turinio strategija

Tikslas: 100 → 1 000 sekėjų, išsiaiškinti, kas veikia, tada paleisti savo
produktą auditorijai, kuri jau pasitiki.

## Produktas, į kurį veda turinys

> **TikMaker: daug vientiso stiliaus video tavo produktui, be filmavimo, be
> montavimo ir be scenarijų rašymo.**

Kam: žmonėms, kurie turi produktą (dažnai appsą, padarytą su AI) ir jiems
reikia klientų, bet nenori ar neturi kur filmuotis, nemoka rašyti scenarijų
ar montuoti, nori daug turinio greitai ir vienodo stiliaus visuose video.
Skausmas: „mano produktui reikia klientų, o neturiu laiko ir nemoku
montuoti“ (pinigai ir skubu), ne „noriu gražesnių video“.

Tai ta pati auditorija kaip dabar: vibe coderiai sukuria appsą, o kitas jų
skausmas yra kaip jį parduoti. Sistemos neplečiam, kol nematom vartotojų;
kol kas tik landingas su waitlistu ir video (TikTok, IG, YT).

## Stulpai (pillars)

| Dalis | Pillar | Kas tai | Kodėl |
| --- | --- | --- | --- |
| 40 % | `claude-code` | Konkretūs Claude Code tipsai: komandos, shortcut'ai, workflow | Siaura niša, paieška auga, sąrašai jau veikia |
| 20 % | `vibe-coding` | Klaidos, workflow, nuo ko pradėti, kaip greičiau | Platesnė auditorija, daugiau pradedančiųjų |
| 20 % | `ship-and-sell` | Kaip parduoti savo appsą per shorts: formatai be veido, saugios zonos, tempas, daug turinio vienam | Čia yra TikMaker pirkėjai; veda į waitlistą |
| 20 % | `ai-tools` | AI naujienos: nauja funkcija / modelis / įrankis per 24–48 h nuo išleidimo | Algoritmas mėgsta naujienas; greitis > tobulumas |
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

## Waitlist CTA

Landingas: viena antraštė (pozicija aukščiau), geriausias video pavyzdys, el.
pašto laukelis ir lankytojų statistika. Duok priežastį registruotis dabar
(ankstyva prieiga, nuolaida) arba nemokamą failą (pvz. TikTok saugių zonų
overlay).

- CTA ne kiekviename video: maždaug 1 iš 3–5, tik kur tinka tema
  (`ship-and-sell`, `build-in-public`). Kituose lieka „follow for part 2“.
- Vienas sakinys gale, ne atskira scena: „I'm making the tool behind these
  videos. Early access: link in bio.“
- Kartą per mėnesį trumpas laiškas waitlistui: kas padaryta, kas toliau.

## Mėnesio peržiūra (~15 min.)

1. TikTok analitikoje surūšiuok mėnesio video pagal išsaugojimus: kas bendro
   5 geriausiuose ir 5 blogiausiuose? Vienas sakinys į `log.md`.
2. Waitlist: kiek registracijų ir po kurių video. Jei nėra, ieškok, kur
   nutrūksta: peržiūros → profilis → landingas → registracija.
3. TikMaker: kas šį mėnesį darant video erzino ar užtruko? Tas sąrašas yra
   produkto planas.

Kantrybė + vienas pakeitimas vienu metu. Pagal pirmas 2–4 savaites nieko
nespręsk; vertink po 2–3 mėnesių.
