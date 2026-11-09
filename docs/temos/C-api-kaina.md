# C. API ir kaina (2026-11-09)

Klausimas: kaip pasiekti kiekvieną šaltinį, kiek kainuoja mūsų apimtimi ir
ar apsimoka.

Kainos iš trečiųjų šalių apžvalgų (2026 m. liepa–spalis); prieš mokant –
patikrinti tiekėjo puslapyje. Nepatvirtinta pažymėta „?“.

## Apimtis, pagal kurią skaičiuota

1 skenavimas per savaitę (+ „skenuoti dabar“ kartais):
- Reddit: 6 subredditai × ~50 įrašų + komentarai 20 geriausių ≈ 1–2 tūkst. įrašų
- TikTok: ~10 paieškos žodžių × 30 video + ~15 nišos kūrėjų × 20 video ≈ 600
- YouTube: ~10 paieškų + komentarai 20 video
- X: ~500 įrašų
- HN, GitHub, Product Hunt, changelog'ai: keliasdešimt užklausų

## Šaltiniai

| Šaltinis | Prieiga | Kaina mūsų apimtimi | Rizika / pastabos |
| --- | --- | --- | --- |
| Hacker News | Algolia HN API, oficiali, be rakto | 0 € | nėra |
| GitHub (leidimai, populiarėjantys repo) | REST API su tokenu (5 000 užkl./val.) | 0 € | nėra |
| Claude Code / Anthropic / AI įrankių naujienos | changelog'ai, blogai, RSS | 0 € | nėra |
| YouTube | Data API v3: 10 000 vnt./dieną, paieška ~100 vnt. → ~100 paieškų per dieną | 0 € | kvotos papildomai nenupirksi, bet mums užtenka |
| Product Hunt | GraphQL API su tokenu | 0 € ? | komerciniam naudojimui gali reikėti leidimo ? |
| **Reddit** | Be prisijungimo `.json` **užblokuotas nuo 2026-05**. OAuth – tik patvirtintoms programoms, nauji prašymai, pranešama, nebepriimami nuo 2026-10-31 ?. Komercinė – sutartis. | per scraper'į: ~1–5 $/mėn | scraper'iai skaito HTML – gali lūžti; Reddit taisyklės |
| **TikTok** | Oficialus Research API – tik akademikams. Creative Center trendų sraute 2026 m. liko beveik tik hashtag'ai. | scraper'iai 0,3–1,7 $ / 1 000 rezultatų → ~1–4 $/mėn | taisyklės, blokavimai, scraper'io kokybė |
| **X** | Oficialus pay-per-use: ~0,005 $ už perskaitytą įrašą | ~500/sav. → ~10 $/mėn | nėra (oficialus) |
| Google Trends | Oficialus API – uždara alfa, kainos nėra. Scraper'iai ~3 $ / 1 000 | ~1–3 $/mėn | vėliau oficialus |
| Claude analizė | per tavo prenumeratą (kaip agentas) | 0 € papildomai | prenumeratos limitai |

Scraper'ių tiekėjai (vienas tiekėjas keliems tinklams paprasčiau):
- **Apify** – rinkinys „aktorių“ kiekvienam tinklui, mokama už rezultatą,
  5 $ nemokamo kredito per mėnesį ?. TikTok ~1,70 $ / 1 000 (Clockworks),
  pigesnių yra nuo ~0,30 $.
- **ScrapeCreators** – vienas API daugeliui tinklų, kreditai: 47 $ už
  25 000 užklausų (~1,9 $ / 1 000), 100 nemokamų. Ar kreditai nesibaigia ir ar
  apima Reddit – patikrinti ?.
- Bright Data – 1,50 $ / 1 000, 5 000 nemokamai per mėn., bet orientuota į
  didelius kiekius.

## Išvada

- **Iš viso: ~5–25 $/mėn** (be X – ~5–15 $). Mažiau nei viena mokama
  įrankio prenumerata (pvz. BuzzAbout ~98 $/mėn), todėl apsimoka.
- **Nemokamai iš karto:** HN, GitHub, YouTube, naujienų changelog'ai.
- **Mokamai, bet pigiai:** Reddit ir TikTok – tik per scraper'į (vienas
  tiekėjas abiem).
- **X – vėliau**, jei pilotas parodys, kad naujienos iš X duoda video,
  kurių nėra kitur.
- **Pilote (D) nieko nemokam:** Reddit ir TikTok peržiūriu naršykle
  (prisijungus tavo paskyra – tai įprastas skaitymas, ne skenavimas).

## Sprendžia tu

1. Biudžetas: siūlau iki 20 $/mėn, pradžioje 0 € (pilotas).
2. Tiekėjas po piloto: Apify (lankstesnis) ar ScrapeCreators (paprastesnis).

## Šaltiniai

- [Reddit API pricing 2026 – socialcrawl](https://www.socialcrawl.dev/blog/reddit-data-api-2026), [prowlo](https://prowlo.com/blog/reddit-data-api), [Techloy](https://www.techloy.com/reddit-api-pricing-in-2026-complete-guide-for-developers-and-businesses/)
- [Reddit .json blokavimas – BigIdeasDB](https://bigideasdb.com/reddit-json-403-forbidden), [dev.to](https://dev.to/tonywangca/why-reddit-blocked-unauthenticated-json-in-2026-and-how-to-still-get-reddit-data-58b9)
- [TikTok scraperiai – ScrapeCreators](https://scrapecreators.com/blog/best-tiktok-scrapers), [Apify Clockworks](https://apify.com/clockworks/tiktok-scraper), [socialcrawl](https://www.socialcrawl.dev/blog/best-tiktok-data-apis-2026), [Blotato](https://www.blotato.com/blog/tiktok-api-pricing)
- [TikTok Creative Center trendai – Apify](https://apify.com/dami_studio/tiktok-creative-center-trends), [webdata_labs](https://apify.com/webdata_labs/tiktok-hashtag-trends-scraper)
- [X API pay-per-use – postproxy](https://postproxy.dev/blog/x-api-pricing-2026/), [opentweet](https://opentweet.io/x-api-pricing)
- [YouTube Data API kvotos – getphyllo](https://www.getphyllo.com/post/is-the-youtube-api-free-in-2026-quota-limits-costs-when-to-pay), [outlierkit](https://outlierkit.com/resources/youtube-api-quota/)
- [Google Trends API alfa – ppc.land](https://ppc.land/google-opens-alpha-testing-for-new-trends-api-targeting-developers-and-journalists/), [Search Engine Journal](https://www.searchenginejournal.com/google-trends-api-alpha-mueller-confirms-small-pilot-group/554078/), [socialcrawl](https://www.socialcrawl.dev/blog/best-google-trends-apis-2026)
