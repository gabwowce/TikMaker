---
name: tikmaker-explainer
description: The TikMaker genre and brand kit – short educational / story TikToks that hook, explained with simple but striking motion, in the channel's own look. How to write a TikMaker code scene (src/generated/<project>/scene-N.tsx). Use together with the official Remotion skill (remotion-best-practices).
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

## The genre

1. **One main visual per scene – and it is BIG.** The main visual takes **at
   least 60 % of the picture zone** (zone below): ≥ 860 px wide and ≥ 520 px
   tall on a 1080x1920 frame. Never a collage of small things, never two
   diagrams of the same weight. A card of 600x400 in the middle of the zone is
   too small (test 4's main weakness).
2. **Every scene has a headline.** A short headline at the top of the zone
   (2–5 words, big: ≥ 84 px, one key word in the accent colour or boxed), the
   visual under it. Pattern labels where the video has them: "MISTAKE 01" /
   "FIX 01" as a small pill above the headline – the same place in every scene.
   The headline is a field (`field.text`) so the creator can change it.
3. **It flows from scene to scene.** The main element of one scene morphs into
   the next one's (a terminal shrinks into a counter, the counter cracks into a
   leaking pipe…). Put shared pieces (the card, the gauge, helpers) in
   `src/generated/<project>/shared.tsx`; each scene starts from the shape the
   previous scene ended in and morphs to its own over its first 14–22 frames.
   Cut hard only to punch a moment (at most 2–3 times in the video).
4. **Stickers for the punch.** A tilted sticker ("3 FIXES", "$0.00", "×3")
   slams in with an overshoot on the word it belongs to – 2–4 per video.
5. **Bookends.** The first scene's main visual comes back at the end in its
   resolved state (e.g. a fuel gauge empty → full) – it closes the story.
6. **Build on the voice.** Every element lands 2–3 frames before the word that
   names it. Take the frame from `words` at run time (`wordFrame(words, "dollars")`)
   – never hard-code frame numbers from the brief: the voice may be made again
   and its timings change. Inside one idea the visual changes in small steps on
   the words instead of new things appearing around it.
7. **Never still.** Idle float ±6–8 px, a slow push-in (1.0 → 1.03), typing
   cursors, counters ticking. Nothing frozen > 0.6 s.
8. **Real things beat drawings.** Where a real screen or a real photo proves
   the point better than a drawing, use a slot (below) – a recording when the
   viewer must SEE the tool do it; a photo (cut-out or card) for a metaphor, a
   person, a real object. One or two photos make a video feel alive. Developer
   tools (terminals, editors, file trees) you may draw yourself – convincingly.
9. **A slot is big and alone.** A photo or recording slot is at least 500 px
   wide (a recording ≥ 860 px – it IS the main visual), sits in its own place
   and **never over or under another element** (test 4 put a small photo on top
   of a card's corner – never again). If a photo is the main visual of the
   scene, nothing else competes with it.

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
export const description = "A token counter racing up while a dollar bill burns";

// What the creator may change without code – every field with a default.
export const schema = z.object({
  pill: field.text("Strip", "MISTAKE 01"),
  headline: field.text("Headline (*word* – key word)", "One *endless* session"),
  tokens: field.number("Tokens at the end", 184000, { min: 0 }),
  photo: field.photo("Burning dollar", "Cut-out: a dollar bill on fire, no background"),
  burnsOn: field.word("Photo appears on", "dollars"),
});
type Params = z.infer<typeof schema>;

export default function Scene3({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const burn = wordFrame(words, params.burnsOn, 30) - 3;
  // …
  return <AbsoluteFill>{/* headline at y≈230, main visual y≈420–1060 */}</AbsoluteFill>;
}
```

The contract:
- `export default` the component; it gets `index`, `durationInFrames`,
  `voiceover`, `words` (every spoken word: `text`, `frame`, `endFrame`, frames
  from the scene's start) and `params` (the schema's values).
- `export const schema` – the texts on screen, the numbers that matter, the
  photo / recording slots and the words things happen on, made with `field.*`
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
