---
name: motion-video
description: Write the pictures of a short vertical TikMaker video as Remotion code, in the channel's one motion style. Use for the code-video experiment (src/experiments/codeVideo) – every scene's picture written by hand-crafted code instead of picked from the block library.
---

# Motion video – the channel's style, as code

You write each scene's **picture** as a Remotion component. The voice, the
kinetic captions and the dark stage backdrop are already there
(`src/experiments/codeVideo/CodeVideo.tsx`) – you draw only what goes above
the captions. Every scene is designed for ITS idea (no generic template), but
all of them share one style, so the video reads as one piece.

The numbers below come from frame-by-frame analyses of two Claude-Code-made
videos that work (a Swiss/HUD motion reel and a "one take" launch film with
shared-element morphs) and from the InsiderForce channel
(`knowledge/shared/reference-frames/*.png` – look at them).

## The frame

- 1080 × 1920, 30 fps. **Picture zone: y 230–1080 px**, side margins ≥ 90 px.
- The captions are drawn by the shell at **y 1130–1340** – never put anything
  there, never write the spoken sentence on screen yourself.
- On-screen words are labels only: **≤ 6 words visible at once**, big
  (headline ≥ 7 % of frame width ≈ 76 px; labels ≥ 40 px). Text smaller than
  that is unreadable on a phone.
- **One idea per scene, one dominant element** (40–70 % of the zone); the rest
  clearly smaller, thinner or dimmer. Never two things of equal weight.

## The look (one style for the whole video)

- Colours and fonts from the style pack: `const c = usePack()` (from
  `src/video/stage/pack`): `c.bg`, `c.text`, `c.textSoft`, `c.accent` (the one
  accent – orange), `c.border`, fonts `c.fontStrong` / `c.fontSemi` /
  `c.fontRegular`, `c.fontUi` for anything imitating an app. No other colours
  except neutral greys/whites at low opacity and the accent.
- **Cards** (windows, terminals, panels): radius ≈ 3.8 % of card width,
  border `1px solid rgba(255,255,255,0.12)`, two shadows
  `0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)`, width ≈ 78 % of
  the frame. Terminals in a mono font with a coloured prompt.
- **Pills / tags**: hairline 1px outline + 8 % fill, uppercase 600 weight,
  +0.14em letter spacing, or a fully rounded solid pill for UI inputs.
- **Emphasis**: the accent colour on ONE word or element per scene, a small
  accent square/dot marker, or a bracket/box around it.
- Depth in 3 layers: faint grid/rulers behind, the main card in the middle,
  small HUD marks (index `01 / 03`, coordinates, crosshairs) in front.

## Motion

- Entrances: `cubic-bezier(0.16, 1, 0.3, 1)` (`Easing.bezier(0.16,1,0.3,1)`),
  9–14 frames, start scale 0.92–0.96 + translateY 16–22 px, a 1.02 overshoot
  on cards; staggers 2–4 frames. Bouncy pops (`cubic-bezier(0.34,1.56,0.64,1)`)
  only for small icons/dots.
- Exits: fast, 6–8 frames, accelerating (crop-mask push up, or fade + −10 px).
- **Nothing is ever fully still for more than ~0.6 s**: idle float ±8 px on a
  75-frame sine after entrance, a slow camera push-in of the whole picture
  1.0 → 1.025 over the scene, blinking cursors, ticking counters.
- **Sync to the voice**: `props.words` gives every spoken word's frame. The
  thing a word names lands 2–3 frames BEFORE that word. Build the picture up
  word by word instead of showing it all at once.
- **Within a scene, morph instead of swapping**: the same element changes into
  the next state (a dot → a cursor → an input pill → a window; a bar chart →
  a number). Shared-element continuity is what makes it feel engineered.
- Techniques worth using where they fit the idea (not all at once): SVG line
  draw-on (`strokeDashoffset`), counters that count/scramble to their value,
  a 3D rolodex list (perspective + rotateX by distance from the active item),
  a stepped radial dial, split-flap digits, a bounding box with live
  dimension labels around a key element, mask wipes, camera zoom-through into
  a UI element.
- A scene opens with motion within its first 4 frames (the cut lands on a
  move, not on an empty frame).

## Code rules

- One file per scene: `src/experiments/codeVideo/generated/SceneN.tsx`
  exporting `export function SceneN(props: SceneProps)`; list them in order in
  `generated/index.ts` (`generatedScenes`). `SceneProps` is in `../types`.
- Only Remotion + React: `useCurrentFrame`, `useVideoConfig`, `interpolate`
  (always with `extrapolateLeft/Right: "clamp"`), `spring`, `Easing`,
  `Sequence`, `AbsoluteFill`, `Img`, `random(seed)` for any randomness. No CSS
  animations, no timers, no network, no new packages. Inline styles.
- Files under `public/` only through `assetUrl()` (`src/utils/assetUrl`).
  Logos: `getLogo(id)?.src` (`src/registries/logoRegistry`), props:
  `getProp(id)?.src` (`src/registries/propRegistry`); the ids are in
  `src/registries/assets.generated.ts`. Prefer drawing with divs/SVG over
  clip-art; a logo only where the real tool is named.
- Deterministic: the frame number is the only clock.
- Keep each scene under ~220 lines; small helpers inside the file are fine.

## Check your work (required)

1. `npx tsc --noEmit -p .` – no errors.
2. For every scene, render 2 frames (mid-scene and near its end) and LOOK at
   them with the Read tool:
   `npx remotion still CodeVideo out/code-video/scene-N-a.png --frame=<global frame> --scale=0.5`
   (global frame = the sum of the previous scenes' lengths + the frame inside
   the scene; lengths are in the brief).
3. Fix what you see: anything unreadable, two things fighting for attention,
   anything in the caption band (y > 1080), anything off the side margins,
   an empty or static-looking frame. Then render again.
