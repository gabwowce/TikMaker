---
name: tikmaker-scene
description: How to write a TikMaker code scene (src/generated/<project>/scene-N.tsx) – the picture zone, the brand kit, the file contract (component, editable fields, description), sound cues and the technical limits. Shared by every TikMaker visual style (tikmaker-explainer = clear, tikmaker-depth = depth).
---

# A TikMaker code scene

Every scene of a video is a **code scene**: one file
`src/generated/<project>/scene-N.tsx` whose component draws that scene's
picture. The video around it is already there – the voice and the captions
(and a dark backdrop); the scene draws the picture. **How it looks is the
style skill's job** (the brief names which one); this skill is what every
style shares.

## The picture zone

- Stage "top" (default): the captions are drawn by the video at y 1130–1340.
  The picture zone is **x 130–900, y 250–1080** – the editor's "Safe zones →
  All platforms" box. TikTok, Reels and Shorts draw their own UI over the rest:
  a top bar over the first 250 px and a column of like/comment/share buttons
  down the right 180 px, so anything there – even a small step badge or the
  edge of a card – is covered on the phone. Centre the main object in that
  box (x ≈ 515). Nothing of yours below y 1090.
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

Never draw the spoken words as captions (the captions are there). Whether
you draw your own background is the style's choice: the "clear" style
leaves the video's backdrop as it is, the "depth" style paints its own.

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
  return <AbsoluteFill>{/* the main object centred in x 130–900, y 250–1080 */}</AbsoluteFill>;
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

## Sound

Each scene gets 0–2 sound effects on its key moments (the main move, the
payoff), named in your answer (`sounds`: the spoken word + the kind) – never
`<Audio>` in the code: the video lays them on the timeline from its library
so the creator can edit them. A calm scene has none.
