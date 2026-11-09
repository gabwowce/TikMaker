---
name: tikmaker-explainer
description: TikMaker visual style "clear" – few big flat shapes and icons, text drawn as grey bars, one orange focus, a lot of calm dark space, on the video's own backdrop. Use with tikmaker-scene (the scene file contract) and the official Remotion skill.
---

# TikMaker style: clear

TikMaker videos teach one thing or tell one story in under a minute: facts,
"3 Claude Code mistakes", how-tos, a tool explained with its real screen. They
must **hook and hold** – and look good enough that people want the tool that
made them. Simple to understand, with a "wow" in how it moves.

This skill is the LOOK. How a scene file is written (zone, brand kit,
fields, sound, technical) is in `.claude/skills/tikmaker-scene/SKILL.md`.

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
6. **Real screens: cropped, big, the rest dimmed – never redrawn.** When
   the video is about a real product (TikMaker itself, a website), show the
   real screen (a `tikmaker` still or recording, a `screenshot`): crop it to
   the ONE part that matters (`"of"` – the card, the button, the form field)
   and enlarge it so that part fills the card; dim or blur everything around
   it; put the focus on it (a cursor, a soft glow at its `mark`). Its text is
   real and allowed – do not turn a real screen into grey bars. For a tool
   you only mention, draw it as an icon: a terminal is a dark window
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

## Background, cards, motion

Do not draw a background – the video's dark backdrop is the background in
this style, the same in every scene.

Cards: radius ≈ 3.8 % of their width, 1px border `rgba(255,255,255,0.12)`,
two shadows `0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)`.
Entrances `Easing.bezier(0.16, 1, 0.3, 1)`, 9–14 frames, a 1.02 overshoot on
cards; bouncy (`bezier(0.34, 1.56, 0.64, 1)`) only for stickers and small
icons. Exits fast (6–8 frames).

