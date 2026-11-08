---
name: tikmaker-depth
description: TikMaker visual style "depth" – real logos, real website screenshots and real footage in glass cards with a coloured glow, a background that changes per scene (some scenes light), a giant faint motif behind, a persistent dock, springy motion and smooth scene transitions. Use with tikmaker-scene (the scene file contract) and the official Remotion skill.
---

# TikMaker style: depth

This skill is the LOOK. How a scene file is written (zone, brand kit,
fields, sound, technical) is in `.claude/skills/tikmaker-scene/SKILL.md`.

**Read the example frames first** – they ARE the style:
`.claude/skills/tikmaker-depth/references/01-…13-*.jpg` (the creator's
chosen videos), and the two frame-by-frame analyses with exact numbers
(`references/analysis-*.json`). Your frames are judged against them.

## What makes it look expensive (in this order)

### 1. Real things, not drawings
Almost nothing in the examples is a drawn mock-up. Fetch the real thing with
`npx tsx scripts/asset.ts` (commands in the brief) and put it in cards:
- **Real logos** of every tool the video names (`logo …`), big – on a white
  header strip of a card (06), on dock icons (01, 04), on film strips (07).
- **Real websites** (`screenshot …`) in a **browser card**: a glass card
  with three dots and the URL in a small pill on top (`github.com/…`), the
  screenshot filling the card (04, 06, 11, 13). The tool's GitHub page, its
  official site, its docs. On phones: real sites in phone frames (03).
- **Real footage / photos** (`scroll …`, `photo …`, `tikmaker …`): a video
  playing in a player card (10, 12), a strip of real thumbnails (02, 10, 12).
- Draw only what has no real picture: an icon, a pill, a waveform, a chart.
  Never draw a fake website, a fake app screen with made-up text, or code
  listings to read. If a fetch fails, keep the card simple (logo + name).

### 2. A background per scene – and some light scenes
Paint the background yourself, as the scene's first layer (it covers the
video's backdrop):
Colours come from the brand kit: `SCENE_COLORS` (blue, teal, purple,
amber, orange, magenta), `DARK_BG`, `LIGHT_BG`, `LIGHT_TEXT`,
`LIGHT_TEXT_SOFT` – use them, so every video of the channel is one family.
- **Dark scenes**: near-black navy (`DARK_BG`) with ONE big soft
  radial glow behind the focal card in the scene's colour – blue (a tool, a
  system), teal (it works, saved, growth), purple (ideas, commands, AI),
  amber (warmth, creative, colour), the brand orange (hook, payoff). The
  glow breathes (opacity 0.35↔0.55) and drifts ±60 px.
- **Light scenes – about one in four**: off-white `#f1f3f6` with a soft
  colour glow, dark text (`#1b1d22`, second line `#6b7280`), cards white with
  soft grey shadows (04, 05, 10). Use them for a stat, a payoff, "it's
  free", a result – the switch to light is itself a punch (come in with
  `flash`).
- Neighbouring scenes differ in colour or light; never two identical
  backgrounds in a row. Over the first ~12 frames the glow moves in from
  the previous scene's position, so it feels like one light moving.

### 3. A giant faint motif behind
Behind the focal card, something big and faint that belongs to the topic
(opacity 0.04–0.12, or blurred 12–20 px): huge HTML/code text (04, 06), a
giant number (06), a logo silhouette filling the frame (05), the product's
cards as a tilted grid (08), blurred real screenshots at the sides (01, 02,
09). It gives depth without competing. Never readable, never sharp.

### 4. One glass focal card, big
- One focal card per moment, **~80 % of the frame width** (840–900 px), a
  little tilted in perspective while it moves (`perspective: 1200px`,
  `rotateY ±6–14deg`, `rotateX 4–8deg`), flat when it settles.
- Glass: `rgba(255,255,255,0.06–0.10)` fill, `backdropFilter: blur(18px)`,
  1.5 px border `rgba(255,255,255,0.14)` with a lighter top edge, radius
  ≈ 5–7 % of its width, shadows `0 8px 16px rgba(0,0,0,0.25), 0 32px 80px
  rgba(0,0,0,0.5)` (on light scenes: `0 20px 50px rgba(20,30,60,0.12)`).
- Everything else is smaller: satellites (a pill, a chip), blurred side
  cards, the dock.

### 5. Headline: one or two lines, clean
At the top of the zone (y ≈ 220–380): the first line white and bold, an
optional second line in grey (01, 02, 13), ≤ 5 words in all. Use the brand
kit's `fontUi` family at weight 700–800 (clean, geometric – not the display
font) at 76–92 px; numbers HUGE (200–300 px, 01, 05, 09). On light scenes
the text is dark. Word by word pop-in (see motion).

### 6. Small supporting pieces that keep it alive
Pick 1–2 per scene, never all: a **dock** of the video's tools at the bottom
of the zone (real logos in rounded squares, the active one ringed and
glowing in the scene's colour – the same dock in every scene, from
`shared.tsx`); a **pill** (`★ 55k`, `render 100%`, a solid blue word pill);
a **waveform with a playhead**; a **timeline strip** of thumbnails; a
**cursor** that clicks with a ripple (12); a **magnifier lens** over a grid
(08); **film strips** crossing diagonally with motion blur (07).

## Motion vocabulary (30 fps)

- **Cards enter** from below (~25 % of the height) with the tilt revealing:
  scale 0.8 → 1.03 → 1.0 over 16 frames, `Easing.bezier(0.16, 1, 0.3, 1)`;
  a fanned deck staggers 3 frames, ±4–6° each.
- **Pills / icons** pop: `spring({ damping: 12, stiffness: 180 })` from 0.5,
  overshoot ~1.08; a row of icons staggers 2 frames.
- **Headline**: word by word, from scale 0.9, y +22 px, opacity 0, a little
  blur → 1.0 in ~10 frames, 3-frame stagger, landing 1–2 frames before the
  word; the key word in the scene colour with a +4 % punch.
- **Counters**: 22–26 frames, fast then slowing, `tabular-nums`, the icon
  next to it pulses +12 % when the number lands.
- **Idle, always**: settled cards float (`sin(frame/14)*8px`, `rotateZ ±0.6°`),
  the glow breathes, the playhead runs. Nothing frozen longer than ~1 s.
- **Camera**: the scene's content (not the background) pushes in 1.00 → 1.04
  over the scene; a 2-frame +3 % punch on the key word, back over 8 frames.
- **A change every ~1.5 s** – a card swap, a lens move, a counter, a dock
  step – but ONE thing at a time.

## Transitions between scenes

The video draws both scenes during a change (~12 frames) – you only choose
the kind (`transition` in your answer) and keep your scene's first frame
already composed (do not fade your own scene in):
- `push` / `slideLeft` – the next item of a list (tool 2 after tool 1);
- `zoomThrough` – diving into a detail (from the overview into one card);
- `flash` – into a LIGHT scene, or a big reveal;
- `dissolve` – a soft change of mood or colour;
- `slideUp` – a new section; `cut` only for a hard punch (1–2 per video).
Also continue motion across the cut: the dock stays in place, the glow
moves, a card that was leaving the last scene can arrive in this one.

## Sound

Whoosh on a card's big move or a push, pop on a pill/icon pop, tick on a
dock step, count on a counter, success when a number lands, a click on a
cursor click. 0–2 per scene (tikmaker-scene, Sound).

## Do not

- No drawn fake websites, no made-up app screens with tiny text, no code
  listings or logs to read – real screenshots or nothing.
- No two scenes with the same background in a row; not all scenes dark.
- No more than one focal card sharp at a time.
- No new packages: CSS 3D, `filter: blur`, `backdropFilter`, Remotion's
  `spring` / `interpolate`, `<Img>` / `<OffthreadVideo>` are enough.
