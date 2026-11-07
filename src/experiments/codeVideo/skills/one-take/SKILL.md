---
name: one-take
description: Animate a whole short vertical video as ONE continuous shot – a single main visual that morphs from one idea into the next, never a collage of small parts. For the code-video experiment (variant "onetake").
---

# One take

The video is one continuous shot. There is always **ONE main visual** on screen,
big, and when the story moves on it **turns into** the next thing instead of
being replaced. A dot becomes a cursor, the cursor stretches into an input
field, the field unfolds into a window, the window's bars become a number,
the number shrinks into a dot – and at the end the picture returns to how the
video started, so it loops.

## The rules

1. **One main visual at a time.** It fills 50–80 % of the frame. Anything else
   on screen is tiny (a label, an index) or absent. Never three cards, never a
   grid of small things, never two diagrams.
2. **Morph, don't cut.** Between two ideas, interpolate the SAME element's
   size, position, corner radius, colour and content into the next state
   (shared-element transition, ~14–22 frames, `Easing.bezier(0.16, 1, 0.3, 1)`
   or a spring with a small overshoot). A hard cut is allowed at most once or
   twice in the whole video, as a deliberate punch.
3. **A camera that never stops.** Wrap everything in one camera container:
   slow push-in (scale 1.0 → 1.03) while an idea is explained, a faster pull
   or zoom-through (into a UI element / out of it) when moving to the next.
   Plus a 1–2 px organic drift. No frame is ever fully still.
4. **Build on the voice.** Every element arrives 2–3 frames before the word
   that names it (you get every word's frame). Inside one idea, the main
   visual changes in small steps on the words – a counter ticks, a line draws,
   a row lights up – instead of new things appearing around it.
5. **Few words, big.** At most ~6 words on screen besides the captions,
   headline-size. Show, don't write.
6. **Captions are yours too.** Draw the spoken words yourself in the lower
   third (around y 1250–1450 of 1920), 2–4 words at a time, the current word
   emphasised, in the same style as the rest – they are part of the shot,
   not a subtitle track. Keep the main visual clear of them.
7. **One look, chosen once.** Pick a palette (a background, one text colour,
   ONE accent) and one or two fonts at the start and keep them for the whole
   video. Dark, cinematic, soft shadows, rounded cards with a hairline border
   suit a developer channel.
8. **Loop.** The last frame matches the first.

## Technical

- Remotion 4.0.290 (this project): `useCurrentFrame`, `useVideoConfig`,
  `interpolate` (clamp both sides), `spring`, `Easing`, `Sequence`,
  `AbsoluteFill`, `Img`, `random`. Newer APIs (`Interactive`, `Easing.spring`,
  `output: "perceptual-scale"`, `@remotion/effects`) do not exist here; no new
  packages. No CSS animations – the frame is the only clock.
- Fonts: `loadFont` is not set up; use system fonts or the ones the project
  already loads (`ensureFontsLoaded` from `src/video/typography/fonts`, family
  names in `src/video/typography/tokens.ts`). Logos, if a real tool is named:
  `getLogo(id)?.src` from `src/registries/logoRegistry`.
- Write it as a "timeline": one array of states (one per idea, tied to a
  scene/word frame), and one main element whose style is interpolated between
  the neighbouring states. That is what keeps it ONE element.
