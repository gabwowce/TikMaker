# One sentence → a 3D animation (Claude Code)

Tema: `docs/temos/2026-11-09-temos.md` Nr. 1 (balas 89). Panašūs video
YouTube'e: 229K per 4 d.

## Sakinys (promptas), kurį gavo Claude Code

> A glowing light bulb cracks open and a tiny 3D city builds itself out of
> it, block by block, then day turns to night.

## Rezultatas

`out/bulb-city.mp4` – 12 s, 9:16. Kodas: `src/showcase/bulbCity/`
(Remotion + three.js per `@remotion/three`), kompozicija `BulbCity`
(`npx remotion render src/index.ts BulbCity out/bulb-city.mp4 --gl=angle`).

Eiga (pagal kūrėjos pavyzdinį storyboard'ą): lemputė kaip produkto
nuotraukoje (gintarinis stiklas, ilgi langų atspindžiai, švytintis siūlas,
auksinis cokolis, šilta šviesa po ja) → švytėjimas stiprėja, per stiklą
bėga švytintys įtrūkimai → stiklas sprogsta išlenktomis kevalo dalimis su
žiežirbomis, šviesos branduoliu ir spinduliais iš viršaus → iš šviesos
išauga miestas, pastatai iš pradžių švyti auksu, cokolis nusileidžia į
sankryžą → diorama atvėsta iki dienos spalvų, išsipučia debesys →
važiuoja automobiliai → saulėlydis → naktis: langai užsidega bangomis,
žibintai, žvaigždės. Švytėjimas – tikras „bloom“ (three.js UnrealBloomPass).

Įrašyti ekraną: kaip įvedi tą sakinį į Claude Code (tikras įrašas
hook'ui / „kaip“ scenai).

## Idėja agentui (įklijuoti į Start)

```
I gave Claude Code one sentence – "A glowing light bulb cracks open and a
tiny 3D city builds itself out of it, block by block, then day turns to
night" – and it made a 12-second 3D animation with Remotion and three.js,
no Blender, no After Effects. I have the finished clip (a realistic bulb
cracks, its light lands, a detailed diorama city builds itself, cars drive,
sunset, windows light up at night) and a
screen recording of typing the sentence into Claude Code.
Open on the most satisfying moment of the clip. Show the sentence, then the
clip as big as possible (leave recording slots for the clip and for my
screen recording – do not redraw them).
First step for the viewer: install Claude Code, ask it for a Remotion 3D
animation of one sentence of your own.
CTA: comment "3D" and I'll send you the exact prompt and setup.
```
