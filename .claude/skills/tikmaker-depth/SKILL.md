---
name: tikmaker-depth
description: TikMaker visual style "depth" – 2.5D glass cards tilted in perspective, spring physics, a persistent dock, word-pop headlines, a camera that never stops, and a background that changes colour from scene to scene. Use with tikmaker-scene (the scene file contract) and the official Remotion skill.
---

# TikMaker style: depth

This skill is the LOOK. How a scene file is written (zone, brand kit,
fields, sound, technical) is in `.claude/skills/tikmaker-scene/SKILL.md`.

The feel: high production value from **continuous micro-motion, tactile
spring physics and deep 2.5D layering**. Nothing ever rests completely –
cards float, tilt in perspective, the camera slowly pushes in, and scenes
hand over with a push or a zoom-through instead of a hard cut. Each scene
has **its own background colour**, so the video moves through moods.

Examples (Read them before writing):
- frames: `.claude/skills/tikmaker-depth/references/*.jpg` / `*.png`
- two frame-by-frame analyses of the videos this style comes from, with
  numbers for every animation: `references/analysis-*.json` – when a value
  below is not enough, take it from there.

## Still clear at a glance

Depth is not detail. A TikTok viewer gives a scene 1–2 seconds:
- **One focal card per moment**, big: ~78 % of the frame width (840 px).
  Other things are smaller, blurred behind it, or floating satellites.
- **Max 5 words of headline** on screen; inside cards, UI is big and simple
  – a few large controls, bars for secondary text, never logs or code
  listings to read. One real word or number is the point of the card.
- A change every ~1.5 s (a headline swap, a tilt, a counter, a dock step,
  a camera punch) – but always ONE thing changing at a time.

## The four planes (back to front)

1. **Background – yours, per scene.** Paint it as the first layer of the
   scene (an `AbsoluteFill` behind everything), covering the video's
   backdrop: a deep near-black base with ONE soft radial gradient orb in the
   scene's colour, drifting sideways ±80 px over ~150 frames and breathing
   (opacity 0.35 ↔ 0.55); optional micro-particles drifting up ~12 px/s.
   **Every scene gets its own hue**, chosen for its mood and kept in the
   same family of saturation/darkness: e.g. warm orange (the brand accent –
   the hook, the payoff), violet (an idea, a plan), teal (it works, saved),
   deep blue (a tool, a system), red-magenta (a problem, a cost). Neighbouring
   scenes differ; the first and the last may share a colour (bookends).
   Over a scene's first ~12 frames the orb cross-fades from the previous
   scene's colour, so the change feels like light, not a cut.
2. **Mid-ground context** (optional): a bigger window or grid behind the
   focal card, blurred (`filter: blur(18–24px)`) and dimmed – it says "where
   we are" without competing.
3. **Foreground focal card**: tilted in 3D – a parent with
   `perspective: 1200px`, the card `rotateY(-16…18deg) rotateX(6…10deg)
   translateZ(60…120px)`; it flattens to ~0° when it becomes the centre of
   attention. Glass: `rgba(255,255,255,0.06–0.12)` fill,
   `backdropFilter: blur(18px)`, 1.5 px border `rgba(255,255,255,0.15)` with
   a lighter top edge, radius ≈ 7 % of the card width, shadows
   `0 8px 16px rgba(0,0,0,0.2), 0 32px 80px rgba(0,0,0,0.5)`.
4. **Screen overlay**: the headline at the top of the zone and, when the
   video counts steps or tools, a **persistent floating dock** (a glass pill
   bar with the 3–5 items' icons; the active one lit in the scene's colour
   with a soft glow, moving on with a spring at each new chapter). Put the
   dock in `shared.tsx` and draw it in every scene at the same place so it
   reads as one object across cuts.

## Motion vocabulary (30 fps)

- **Cards enter** from below (~28 % of the height) with the tilt revealing:
  scale 0.78 → 1.03 → 1.0 over 16 frames, `Easing.bezier(0.16, 1, 0.3, 1)`.
  Several cards: a fanned deck, 3-frame stagger, ±4–6° rotation each.
- **Pills / icons** pop: scale 0.5 → 1.08 → 1.0 in ~13 frames with
  `spring({ damping: 12, stiffness: 180 })`, opacity in 8 frames; icons in a
  row stagger 2 frames.
- **Headline**: word by word, each from scale 0.9, y +22 px, opacity 0 →
  overshoot 1.04 → 1.0 in 12 frames, 3-frame stagger, landing 1–2 frames
  before the word is said; the key word in the accent colour with a +4 %
  scale punch. Exit: up 18 px and fade in 8 frames.
- **Counters**: roll from start to target over 22–26 frames, fast then
  slowing (`Easing.out(Easing.cubic)`), digits in a fixed-width mask
  (`fontVariantNumeric: "tabular-nums"`), the icon next to it pulses +12 %
  as the number lands.
- **Lists**: rows cascade with a 4-frame offset, each sliding from x −40 px,
  its status icon popping 1.25 → 1.0 on the row's 8th frame.
- **Diagrams**: lines draw on with `strokeDashoffset` over 14–18 frames;
  each node blooms 0 → 1.06 → 1 as the line reaches it.
- **Idle, always**: every settled card floats `translateY(sin(frame/14)*8px)`
  and `rotateZ(±0.8deg)` on a slow period; nothing frozen longer than ~1 s.
- **Camera**: wrap the scene's content (not the background) in a container
  that pushes in 1.00 → 1.04 over the scene; on the key word a 2-frame punch
  +3 % that eases back over 8 frames.
- **Scene hand-over**: the scene's first ~12 frames continue the motion of
  the previous one – a push (content arrives from the right, as if the old
  one went left) between items of a list, a zoom-through (scale from ~1.4
  and blur 8 → 0) when diving into a detail, or a shared element (the same
  card/dock in the same place) when the topic continues.

## Sound

Sound marks the physical moments: a whoosh on a card's big move, a pop on
an icon/pill pop, a tick on a dock step, a count on a counter, success when
a number lands. 0–2 per scene (see tikmaker-scene, Sound).

## Do not

- No flat, motionless cards; no hard cuts as the default.
- No tiny UI text, no code listings, no logs – bars and one big word.
- No more than one focal card fully sharp at a time.
- No new packages: CSS 3D (`perspective`, `rotateX/Y`, `translateZ`),
  `filter: blur`, `backdropFilter` and Remotion's `spring` / `interpolate`
  are enough.
