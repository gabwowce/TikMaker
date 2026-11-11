# Built with AI this week #1

Formatas: kas savaitę 3 tikri projektai, kiekvienam – kas tai, kas ir kodėl
sukūrė, pirmas žingsnis savo versijai. Autorius ir nuoroda – kiekviename
kadre. Temos: `docs/temos/2026-11-09-temos.md`.

## Projektai (patikrinti Hacker News, 2026-10/11)

| # | Projektas | Autorius | Nuoroda | Faktai |
| --- | --- | --- | --- | --- |
| 1 | Smart TV, perrašytas su AI | anubhavmalhotra (HN: animalhot) | github.com/anubhavmalhotra/r2d2-tv | Nepageidautas webOS atnaujinimas → per kelis savaitgalius su 4 AI modeliais parašė savo TV programinę įrangą; visą kodą rašė modeliai, sprendimus priėmė jis; dukra valdo TV balsu. HN 112 tšk. |
| 2 | Skraidančios katės žaidimas | pawelwentpawel | catcopter.com | Naršyklės daugelio žaidėjų žaidimas: skraidai kate prieš pterodaktilius, vištas ir piktus pingvinus. Domeną turėjo ~13 metų. Objektai, „rigging'as“ ir judesys – Opus 5.5. HN 85 tšk. |
| 3 | Veikiantis Nintendo iš AI | dbreunig | github.com/dbreunig/nesformer | Nintendo (NES) emuliuojamas ~1 GB Qwen modelio svoriuose; Opus 5.5 sukūrė veikiančius svorius ir kodą per 2 promptus. HN 298 tšk. |

Vaizdai:
- automatiškai (agentas, `scripts/asset.ts`): `screenshot` – GitHub puslapiai,
  catcopter.com, HN įrašai (kaip įrodymas su taškais); `scroll` – README;
  `logo` – Claude, GitHub;
- tavo įrašas: 5–10 s catcopter žaidimo (Cmd+Shift+5, skraidai kate);
- jokių autorių video be leidimo.

## Idėja agentui (įklijuoti į Start)

```
"Built with AI this week #1" – three real projects people built with AI,
each a few seconds, then a first step for the viewer. For everyone, not just
developers: say what each thing IS and why it's surprising, no jargon.

Hook: "A dad rewrote his TV's software with AI. And that's not even the
craziest one this week."

1. A dad's smart TV got an update he didn't want – so over a few weekends he
   rewrote its software with four AI models. The AI wrote all the code, he
   made the decisions. Now his daughter controls the TV with her voice.
   By anubhavmalhotra – github.com/anubhavmalhotra/r2d2-tv (112 points on
   Hacker News).
2. A man owned the domain catcopter.com for 13 years. With Claude Opus he
   finally built the game: a multiplayer browser game where you fly a cat
   against pterodactyls, chickens and angry penguins.
   By pawelwentpawel – catcopter.com.
3. Someone got a working Nintendo running inside an AI model – Claude Opus
   built it with just two prompts.
   By dbreunig – github.com/dbreunig/nesformer (298 points on Hacker News).

Show the REAL things, never draw them: fetch screenshots of each GitHub page,
catcopter.com and each Hacker News post (the points are the proof), scroll
the READMEs. Leave a recording slot for my 5–10 s of playing catcopter.
Put the creator's name and link on screen in every project scene.

First step for the viewer: think of the one thing that annoys you most –
an app, a device, a game you wish existed – and ask Claude Code to build it.
CTA: comment what you'd build, and follow for next week's three.
```
