---
name: tikmaker-explainer
description: The TikMaker genre and brand kit – short educational / story TikToks explained with few big flat shapes and icons, text drawn as grey bars, one orange focus, in the channel's own look. How to write a TikMaker code scene (src/generated/<project>/scene-N.tsx). Use together with the official Remotion skill (remotion-best-practices).
---

# TikMaker explainer

TikMaker videos teach one thing or tell one story in under a minute: facts,
"3 Claude Code mistakes", how-tos, a tool explained with its real screen. They
must **hook and hold** – and look good enough that people want the tool that
made them. Simple to understand, with a "wow" in how it moves.

Every scene of a video is a **code scene**: one file
`src/generated/<project>/scene-N.tsx` whose component draws that scene's
picture. The video around it is already there – the backdrop, the voice and
the captions; the scene draws only the picture.

## The look: clear at a glance, not detailed

A TikTok viewer gives a scene one or two seconds. They will not read, and
they will not study details. **Clarity beats detail; a shape beats a word.**
Two sets of examples, for two things. The **style** examples – how things
are drawn – are the creator's choice (Read them):
`.claude/skills/tikmaker-explainer/references/example-1.jpg` … `example-5.jpg`
– two avatars and four flat icons; the icons gather into one card; a chain
of cards; a live app window next to a locked, blurred one with one number;
one label over four simple video cards. That is the level and the style.
The **composition** sheet – how a vertical frame is laid out: one dominant
thing, big, a lot of calm space, the words big – is
`knowledge/shared/reference-frames/insiderforce.png`.

1. **Few, big, flat things.** 2–6 objects in a frame, each big (icons
   ≥ 120 px, cards ≥ 300 px wide), simple flat shapes and icons, rounded,
   with a lot of dark empty space around them. If you can remove an element
   and the scene still says the same thing – remove it.
2. **No text to read.** Text inside pictures is drawn as **grey rounded bars**
   (skeleton lines), not words: a chat message, a file, a list row, a code
   line, a log line – all bars. Real words only for the ONE thing that is the
   point (a command like `/clear`, a number like `48,193`, a name, a button),
   at ≥ 64 px. Never code listings, terminal logs, file trees with names,
   lists of labels, small UI captions, "Read src/…" lines.
3. **One place to look.** Exactly one focal element per moment, in the accent
   colour (orange) – everything else grey (`textSoft`, `#3a3d44`-ish fills).
   What is not the point right now is **dimmed (opacity 0.3–0.5) or blurred**,
   like the locked window in example 4. When the focus moves, the old focus
   dims and the new one lights up.
4. **The shapes tell the story.** Show the idea with what the objects DO:
   icons fly together into one card (= all in one place), cards line up on a
   line (= a pipeline), a window gets a lock and blurs (= blocked), a bar
   fills, a counter ticks, a thing shrinks, two things swap. One clear action
   per idea, landing on the word that names it (2–3 frames before it).
5. **A label only when the picture cannot say it.** No headline by default
   – the captions already say the words. At most ONE short label per scene
   (1–3 words, or the one number), the biggest text in the frame, e.g. the
   command being shown. Pattern pills ("01", "FIX") only when the video counts
   steps, small, always in the same place.
6. **Draw tools as icons, not as screenshots.** A terminal is a dark window
   with a title bar, a few grey bars and ONE bright command line; an editor
   is a window with bars and one highlighted bar; an app is a window with the
   one control that matters. Logos (`<Logo>`) are fine as big icons.
7. **It flows.** The main object of one scene becomes the next scene's (the
   card moves to the side and a second card joins it…). Shared pieces (the
   card, the avatars, the icons) go in `src/generated/<project>/shared.tsx`;
   each scene starts from where the previous one left them and moves on over
   its first 14–22 frames. Hard cuts only to punch a moment (2–3 per video).
8. **Calm, never frozen.** Slow drift (±6 px), a slow push-in (1.0 → 1.03),
   a pulse on the focal element. No shaking, no confetti, no many stickers –
   at most one punch sticker per video, and only for the payoff number.
9. **Real things where they prove it.** A screen recording slot (≥ 860 px
   wide, it IS the main picture, nothing over it) when the viewer must see the
   real tool; a photo slot (≥ 500 px, alone) for a person or a real object.

10. **Sound marks the moment, not every motion.** Each scene gets 0–2 sound
   effects on its key moments (the main move, the payoff), named in your
   answer – never `<Audio>` in the code: the video lays them on the timeline
   from its library so the creator can edit them. A calm scene has none.

The squint test: blur the frame in your head – is it still obvious where to
look and what is happening? If not, cut elements until it is.

## The picture zone

- Stage "top" (default): the captions are drawn by the video at y 1130–1340.
  The picture zone is **y 200–1080**, side margins ≥ 90 px. Nothing of yours
  below y 1090.
- Stage "full" (only for a full-screen recording): the picture may fill the
  frame; the captions sit at y 1400–1600 over it – keep that band calm.

## The brand kit (fixed – do not invent your own)

Import from `src/video/brand/kit.tsx` (relative path from the scene file:
`../../video/brand/kit`):

- `useBrand()` → colours and fonts: `bg`, `text`, `textSoft`, `accent` (the
  ONLY accent colour), `border`; fonts `fontStrong` / `fontSemi` /
  `fontRegular` – **one family, use only these** (plus `fontUi` for text inside
  an app, `MONO` for code/terminals). No other fonts, no other colours except
  neutral white/grey at low opacity and black shadows.
- `CAPTION_TOP` (1130).
- `<PhotoSlot src find look width height />` – a real photo the creator adds
  ("cutout" or "card"); `src` comes from a `field.photo`, `find` is an exact
  description of the picture to find.
- `<RecordingSlot src record at width height />` – a real screen recording;
  `src` from a `field.recording`, `record` says exactly what to record (app,
  clicks, what appears, start/stop).
- `<Logo id size />` – a tool's logo from the library (ids:
  `src/registries/assets.generated.ts`).
- `field` – the editable fields (below); `wordFrame(words, word, fallback)` –
  the frame a word is said on.

Do not draw a background (the backdrop is there) and do not draw the spoken
words as captions (the captions are there).

Cards: radius ≈ 3.8 % of their width, 1px border `rgba(255,255,255,0.12)`,
two shadows `0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)`.
Entrances `Easing.bezier(0.16, 1, 0.3, 1)`, 9–14 frames, a 1.02 overshoot on
cards; bouncy (`bezier(0.34, 1.56, 0.64, 1)`) only for stickers and small
icons. Exits fast (6–8 frames).

## A scene file

```tsx
import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from "remotion";
import { field, PhotoSlot, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";

// One line: what the viewer sees (shown in the editor and to the reviewer).
export const description = "One chat window grows taller and taller; its fuel bar drains to red";

// What the creator may change without code – every field with a default.
export const schema = z.object({
  label: field.text("The one label", "/clear"),
  messages: field.number("Chat bubbles", 8, { min: 2, max: 12 }),
  drainsOn: field.word("Fuel drains on", "everything"),
});
type Params = z.infer<typeof schema>;

export default function Scene3({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const drain = wordFrame(words, params.drainsOn, 30) - 3;
  // … one window (grey bars for the messages), one orange fuel bar
  return <AbsoluteFill>{/* the main object centred in y 200–1080 */}</AbsoluteFill>;
}
```

The contract:
- `export default` the component; it gets `index`, `durationInFrames`,
  `voiceover`, `words` (every spoken word: `text`, `frame`, `endFrame`, frames
  from the scene's start) and `params` (the schema's values).
- `export const schema` – the few words on screen (the one label), the
  numbers that matter, the photo / recording slots and the words things
  happen on, made with `field.*`
  (`text`, `number`, `toggle`, `choice`, `photo`, `recording`, `word`). The
  creator edits them in a form; everything else (layout, motion) stays in code.
- `export const description` – one sentence, what the picture shows.
- Self-contained: imports only `remotion`, `react`, `zod`, the brand kit,
  `../../video/code/types` and files in its own folder (`./shared`).

## Technical

- Remotion 4.0.290: `useCurrentFrame`, `useVideoConfig`, `interpolate` (clamp
  both sides), `spring`, `Easing`, `Sequence`, `AbsoluteFill`, `Img`,
  `random(seed)`. No newer APIs (`Interactive`, `Easing.spring`,
  `perceptual-scale`, `@remotion/effects`), no new packages, no CSS
  animations – the frame is the only clock.
- The frame inside a scene starts at 0 at the scene's start and ends at
  `durationInFrames - 1`.
- TypeScript strict: the project must still pass `npx tsc --noEmit -p .`.
