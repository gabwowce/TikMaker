# The city became a game (Claude Code) – video-4

Tęsinys po „Learning 3D took years“: tas pats miestas, dabar – žaidimas.
Žinutė: 3D nebūtinai video – tas pats galima paversti žaidimu.

## Kas yra

- Žaidimas „City Flight“: popierinis lėktuvėlis naktiniame mieste – 22
  šviesos, 4 žiedai su pagreičiu, serijos su vis aukštesniu garsu,
  susidūrimai su pastatais, finišas su fejerverkais, laikas ir rekordas,
  „Share“. Valdymas: tempti pirštu (telefone) arba rodyklės / WASD.
- Žaisti: https://gabwowce.github.io/city-flight/ (veikia; repo
  `gabwowce/city-flight`, Pages iš `main`). Atnaujinti – `npm run game:deploy`.
  Kodas: `src/showcase/cityGame/`.
- Įrašas: `out/city-flight.mp4` (20 s, 9:16), importuotas į TikMaker kaip
  „City Flight – game played (Claude Code)“. Įrašytas kadras po kadro
  (`npm run game:record`), skrenda žaidimo autopilotas – ne piešta animacija.
- Klipo momentai: 0–4 s gatve tarp šviečiančių namų, pirmas žiedas;
  4–7 s virš parko, „streak“ auga; 7–11 s skersgatvis, žiedai, pagreitis;
  11–14 s spiralė aplink dangoraižį; 14,2 s „All 22 lights!“; 14–20 s
  fejerverkai virš miesto, kamera sukasi aplink.

## Forma (kaip video-2, kad būtų viena serija)

- Length: **30** s
- Template: **Build it fast**
- Visual style: **Depth**
- Hook: `Making a 3D game took months. Now you just ask Claude Code.`
  (kita galimybė: `Claude Code made this game in under an hour. You can play it.`)
- With face – ne, Motion graphics only – ne (naudojam tikrą įrašą),
  Generate the voiceover – **taip**

„Under an hour“ – tiesa: nuo „bandom“ (2026-11-09 17:44 UTC) iki veikiančios
nuorodos (~18:27 UTC) praėjo ~45 min.

## Idėja agentui (įklijuoti į „Video idea“)

```
Part 2 of "Learning 3D took years. Now you just ask Claude Code".
Last time Claude Code built a little 3D city from one sentence and a picture.
This time I asked it to turn that city into a real game anyone can play on
their phone: fly a paper plane through the streets at night, collect all 22
lights, shoot through rings for speed, fireworks at the finish. Under an hour
of chatting with Claude Code, from my first ask to a playable link online.
I wrote no code.

My 20-second recording of the game being played (9:16):
/assets/custom/city-flight-game-played-claude-code-mw9l7aio.mp4
Make it the default of every recording field – never redraw the game.
Moments: 0–4 s down the street, first ring; 4–7 s through a glowing ring,
streak climbing; 7–11 s more rings, speed boost; 11–14 s spiral around the
glass tower; 14.2 s "All 22 lights!", time 14.2 s; 14–20 s fireworks.

Open on the gameplay (4–7 s), no words on a blank screen. Gameplay full
screen, edge to edge: no card, no fake video player, no dark gradient. Keep
text off the score and timer at the top of the recording.
Build step – draw it, no recording: Claude Code's prompt bar with "Turn this
3D city into a game I can play on my phone – a paper plane, lights to
collect, rings for speed, fireworks at the finish", then colorful code.
Short; don't read the prompt out loud.
The point for everyone: 3D isn't only for videos – it can become a game you
send to a friend, and you just describe it.
First step for the viewer: open Claude Code and describe a tiny game in a few
sentences – what you fly, what you collect, how you win.
CTA: "Comment PLAY and I'll send you the link – beat 14.2 seconds."
```
