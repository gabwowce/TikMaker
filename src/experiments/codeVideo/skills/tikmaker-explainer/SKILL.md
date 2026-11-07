---
name: tikmaker-explainer
description: The TikMaker genre and brand kit – short educational / story TikToks that hook, explained with simple but striking motion, in the channel's own look. Use together with the official Remotion skill for the code-video experiment (test 4).
---

# TikMaker explainer

TikMaker videos teach one thing or tell one story in under a minute: facts,
"3 Claude Code mistakes", how-tos, a tool explained with its real screen. They
must **hook and hold** – and look good enough that people want the tool that
made them. Simple to understand, with a "wow" in how it moves.

## The genre

1. **One main visual at a time, and it flows into the next.** Big (50–80 % of
   the picture zone). When the idea changes, the same element morphs into the
   next state (a terminal shrinks into a counter, the counter cracks into a
   leaking pipe, the pipe straightens into a progress bar…) – a shared-element
   transition of 14–22 frames. Cut hard only to punch a moment (at most 2–3
   times in the video). Never a collage of small things, never two diagrams.
2. **Headline + visual.** A short headline above the visual (2–5 words, big:
   ≥ 84 px, one key word in the accent colour or boxed), the visual under it.
   Pattern labels where the video has them: "MISTAKE 01" / "FIX 01" as a small
   pill above the headline – keep the same place in every scene.
3. **Stickers for the punch.** A tilted sticker ("3 FIXES", "$0.00", "×3")
   slams in with an overshoot on the word it belongs to – 2–4 per video.
4. **Bookends.** The first scene's main visual comes back at the end in its
   resolved state (e.g. a fuel gauge empty → full) – it closes the story.
5. **Build on the voice.** Every element lands 2–3 frames before the word that
   names it (you get every word's frame); inside one idea the visual changes in
   small steps on the words instead of new things appearing around it.
6. **Never still.** Idle float ±6–8 px, a slow push-in (1.0 → 1.03) on the
   whole picture, typing cursors, counters ticking. Nothing frozen > 0.6 s.
7. **Real things beat drawings.** Where a real screen or a real photo proves the
   point better than a drawing, use a slot (below) – a recording when the
   viewer must SEE the tool do it; a photo (cut-out or card) for a metaphor, a
   person, a real object. One or two photos make a video feel alive. Developer
   tools (terminals, editors, file trees) you may draw yourself – convincingly.

## The brand kit (fixed – do not invent your own)

The shell already draws **the backdrop and the captions** – do not draw a
background or the spoken words. Import from
`src/experiments/codeVideo/brand/kit.tsx`:

- `useBrand()` → colours and fonts: `bg`, `text`, `textSoft`, `accent` (the
  ONLY accent colour), `border`; fonts `fontStrong` / `fontSemi` /
  `fontRegular` – **one family, use only these** (plus `fontUi` for text inside
  an app, `MONO` for code/terminals). No other fonts, no other colours except
  neutral white/grey at low opacity and black shadows.
- `CAPTION_TOP` (1130): the picture stays above y ≈ 1080; the zone is
  y 200–1080, side margins ≥ 90 px.
- `<PhotoSlot id find look width height />` – a real photo the creator adds
  ("cutout" or "card"); give `find` an exact description of the picture.
- `<RecordingSlot id record at width height />` – a real screen recording;
  `record` says exactly what to record (app, clicks, what appears, start/stop).
- `<Logo id size />` – a tool's logo from the library.

Cards: radius ≈ 3.8 % of their width, 1px border `rgba(255,255,255,0.12)`,
two shadows `0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)`.
Entrances `Easing.bezier(0.16, 1, 0.3, 1)`, 9–14 frames, a 1.02 overshoot on
cards; bouncy (`bezier(0.34, 1.56, 0.64, 1)`) only for stickers and small
icons. Exits fast (6–8 frames).

## Technical

- Remotion 4.0.290: `useCurrentFrame`, `useVideoConfig`, `interpolate` (clamp
  both sides), `spring`, `Easing`, `Sequence`, `AbsoluteFill`, `Img`,
  `random(seed)`. No newer APIs (`Interactive`, `Easing.spring`,
  `perceptual-scale`, `@remotion/effects`), no new packages, no CSS
  animations – the frame is the only clock.
- Write the video as one component with a timeline of states (one per idea,
  tied to word frames), so the main element can morph from state to state.
