# TikMaker

This repository is a constrained video design system for producing 9:16 TikTok/Reels/Shorts videos with React + Remotion.

When creating videos, DO NOT design layouts from scratch.

Use existing:
- scenes (`src/video/scenes/`, listed in `src/registries/sceneRegistry.ts`)
- visual components (`src/video/visuals/`)
- backgrounds (`src/video/backgrounds/`, listed in `src/registries/backgroundRegistry.ts`)
- typography (`src/video/typography/tokens.ts`, `Text.tsx`)
- motion presets (`src/video/motion/`)
- sound effects (`src/registries/sfxRegistry.ts`)

A video project is primarily defined in `/projects/*.json` and validated against `src/schema/project.ts`.

Never hardcode inside individual scene implementations:
- font sizes — use `fontSizes` from `src/video/typography/tokens.ts`
- brand colors — use `colors` from the same file
- easing — use `src/video/motion/easing.ts`
- safe-area spacing — use `safeAreaPadding` from `src/video/typography/SafeArea.tsx`

ONE SCENE = ONE PRIMARY IDEA.

Prefer:
- one large visual over many small decorative visuals
- shorter text over smaller text

Use existing visual components before creating custom ones. A custom visual may be created when the story genuinely needs one, but it must use the existing design tokens and motion system.

Do not modify the global design system (`src/video/typography/tokens.ts`, `src/video/motion/*`, `src/video/backgrounds/*`) while completing a video unless explicitly requested.

## Workflow

1. Sync assets: `npm run assets:sync` (reads source paths from `.env.local`, copies into `public/assets` and `public/fonts`, regenerates `src/registries/assets.generated.ts`).
2. `npm run dev` opens the editor (scene library, visual library, background library, asset browser, Remotion Player preview, inspector, scene strip).
3. Build the project as data in `projects/*.json`, or via the editor (Save writes to localStorage, Export JSON downloads the file).
4. `npm run studio` opens Remotion Studio against the same composition for a render-accurate check.
5. `npm run render` renders the composition to MP4.

## Adding video content

Real videos are authored by **filling config**, not writing components:
1. Copy `projects/template-showcase.json` (or start a project in the editor) and swap in real copy/durations.
2. Pick scenes from `src/registries/sceneRegistry.ts` and visuals from `src/registries/visualTemplateRegistry.ts` (the same list the editor's Visuals tab renders) — every entry there is generic and reusable across videos.
3. Only add a new scene/visual component when a genuinely new *shape* is needed (not new content) — and it must consume `src/video/typography/tokens.ts`, `src/video/motion/*`, and `SafeArea` like every existing one.

## Component reuse — read before adding any component

The rule is not "avoid duplication" in the abstract. It is: **there is one place
each concept lives, and a second copy of it will drift.** Every entry below was
a real drift in this repo, not a hypothetical.

### The composition ladder — go down it in order

Before writing a component, check each rung. Only descend when the rung above
genuinely cannot express what you need.

1. **Project data** (`projects/*.json`). Most "new" things are new *content*,
   not a new shape. A different headline, asset, layout, colour or timing is
   always data.
2. **An existing preset.** `visualTemplateRegistry.ts` (the editor's Visuals
   tab), `sceneRegistry.ts`, `backgroundRegistry.ts`, `layoutPresets.ts`,
   `sfxRegistry.ts`. A preset is a named arrangement of existing parts — adding
   one is cheap and is usually the right answer to "can we have X but Y".
3. **A composition of existing visuals.** `flow`, `stack`, `transform`,
   `node-group` wrap other `VisualConfig`s. A "logo above a caption" is a
   `stack`, not a new component.
4. **A new leaf component.** Only when a genuinely new *shape* is needed. It
   must consume the design system (below) and register its size in
   `visualMetrics.ts`.

### Never write these a second time

| Concern | The one implementation | Never |
| --- | --- | --- |
| Scene scaffolding (background, safe-area column, blocks/visual/sfx layers) | `SceneFrame` (`src/video/scenes/SceneFrame.tsx`) | Re-assemble `AbsoluteFill` + `Background` + `safeAreaPadding` + `BlockLayer` + `VisualsLayer` + `SceneSfx` by hand |
| Stagger timing | `useSceneCues(motion)` → `cue(i)` | Inline `staggerDelay(i, motion?.stagger, sceneStartDelay(motion))` |
| A visual's in/out/drift/sfx | `AnimatedVisual` (`src/video/typography/AnimatedVisual.tsx`) | A second entrance/exit interpolation anywhere |
| Placing a visual in a scene | a `content.visuals[]` layer via `VisualsLayer` | A bespoke "this scene's own visual slot" |
| Entrance/exit curves | `motion/entrances.ts`, `motion/exits.ts` | Hand-rolled `interpolate` on opacity/transform |
| Continuous drift | `motion/kenBurns.ts` (incl. `float`) | A per-component `useCurrentFrame` wobble |
| Text styles | `typography/Text.tsx` + `tokens.ts` | Literal `fontSize`/`color`/`fontFamily` |
| Highlighting a word | `renderHighlighted` / `pillInlineStyle` | A colour change, or a second pill implementation |
| A file under `public/` | `assetUrl()` (`src/utils/assetUrl.ts`) | A raw `/assets/...` string — it 404s in a render |
| Visual size for auto-fit | `naturalVisualSize` (`visualMetrics.ts`) | A guessed box in a caller |
| Editor: picking an asset | `AssetSelect` (includes the Import… button) | A second file input or asset dropdown |
| Editor: a visual's motion fields | `VisualMotionEditor` | A per-call-site set of In/Out selects |
| Editor: one item in a list | `EntryCard` | A bespoke collapsible row |
| Loading a project | `parseProject()` (`utils/normalizeProject.ts`) | `videoProjectSchema.parse` on its own — it skips normalization |

### When a new component IS justified

A new **scene type** when the arrangement of TEXT is genuinely different (a
comparison's two columns, a steps list). Not for a different visual — that is a
layer. Build it on `SceneFrame`; it should be under ~60 lines, because the
frame owns everything shared.

A new **visual** when the shape cannot be composed from existing ones. It must:
consume `tokens.ts`; take no position/animation props (the layer owns those);
declare its size in `visualMetrics.ts`; and multiply that size by anything it
scales past its resting size (see `TRANSFORM_ZOOM`).

### Keep leaf modules leaf

`visualMetrics.ts`, `isFullBleed.ts`, `tokens.ts`, `easing.ts` are read while a
project is being *normalized at import time*, before any component mounts. They
must not import React components. `visualMetrics` once imported a constant from
`Transform.tsx`, which cycles back through `VisualRenderer` — harmless while it
was only read during render, but it made a binding land in the temporal dead
zone the moment normalization started reading it (`naturalVisualSize is not
defined`, and it would have differed between dev and a production build). If a
component and a leaf module need the same constant, it belongs in the leaf.

### Deleting is part of the job

When a mechanism is replaced, delete the old one in the same change. A dead
branch that "still works" is indistinguishable from a live one to the next
reader, and both get maintained. The primary-visual path (`scene.visual`,
`PositionedVisual`, `OrbitBackdrop`, `resolveScenePlacement`, `primarySource`)
survived for a while after layers replaced it and every one of those was a
false lead while debugging.

## Pacing, layout, and the dev vocabulary — read before authoring any scene

Three systems exist specifically to stop the failure modes that made early
videos unwatchable (cuts landing before anyone could read, visuals running off
frame, abstract clipart standing in for concrete instructions). Use them; don't
hand-tune around them.

**1. Length comes from content, not from taste.** Write `vo` (the voiceover
line) on every scene and LEAVE `durationSeconds` UNSET. `resolveSceneDuration`
(`src/utils/pacing.ts`) gives the scene whichever is longer — speaking the VO
at `VO_WORDS_PER_SECOND` plus a tail beat, or reading everything on screen —
with a hard floor so nothing is subliminal. Set `durationSeconds` explicitly
only for a deliberate flash frame; when you do, `pacingWarning` flags it in the
editor if it's too short for its own content. A scene's VO is also the honest
length signal in the other direction: if a scene wants 7 seconds, the VO is too
long for one frame — split it, don't shrink the duration.

**2. Composition comes from `layout`, not from coordinates.** Set `layout` to a
preset (`src/video/layout/layoutPresets.ts`): `visual-hero`, `visual-top`,
`visual-bottom`, `icon-corner-*`, `text-only`. Each owns a box the visual is
auto-scaled to fit (via `naturalVisualSize` in `visualMetrics.ts`), and declares
which band the text occupies so text and visual can't collide. This makes
overflow structurally impossible rather than something you catch by eye.
Layer presets are the starting point, not a cage: a layer carries an explicit
`x`/`y`/`scale`, and setting `scale` opts that layer out of auto-fit, with
`layerOverflowWarning` as the only remaining safety net (the editor shows it
under the Scale slider).
When a visual component's own hardcoded size changes, update its entry in
`visualMetrics.ts` or auto-fit starts lying.

**3. Dev content needs dev visuals.** For developer topics, prefer `terminal`,
`code-diff`, and `keycap` over props/checklists — "press ESC" as a keycap is an
instruction, the same words as a checklist row are just more body text. These
are code-like and CLIP rather than wrap: keep lines under `MAX_LINE_CHARS`
(`src/video/visuals/dev/devText.ts`, currently 35) or `overflowWarning` will
flag them. `projects/template-dev-visuals.json` (Templates → "Patikra: Dev
vizualai") is the smoke test — open it after touching any of these components.

**4. Side-safe margins are non-negotiable.** TikTok draws its own UI down both
edges, so visuals get the SAME 130px side margins as text — `SAFE_CONTENT_WIDTH`
(`layoutPresets.ts`) caps every preset's box, and `overflowWarning` measures
against the safe box rather than the raw canvas. Two rules follow for anyone
adding a visual component:
- **Wrapper visuals must measure their children.** `transform` and `stack` in
  `visualMetrics.ts` recurse via `naturalVisualSize`. A fixed guess there is a
  silent overflow: `transform` once returned a hardcoded 420x420 while wrapping
  820px-wide content, so auto-fit scaled it ~2x and pushed it off both edges.
- **Anything a component scales past its resting size must be in its declared
  natural size.** `Transform` zooms the "after" state by `TRANSFORM_ZOOM`, so
  the metrics multiply by it; without that the after-state crept 16px past the
  margin even though the before-state fit exactly. Same reasoning for a caption
  that can out-measure the thing it labels (see `Keycap`'s `maxWidth`).

**5a. Structure a how-to as pain → fix pairs.** Naming a feature is not
engaging; showing what goes wrong without it, then what changes with it, is.
Give each item TWO scenes — a PROBLEM scene (the broken state, no keys shown
yet) and a FIX scene (the keycap + the resulting UI) — with matching eyebrows
(`01 PROBLEM` / `01 FIX`) carrying the pairing. Three items treated this way
beats four named in passing; depth is what holds a viewer.

**5b. The label and the result belong in the SAME frame.** Use two layers:
headline top, `keycap` at y≈34, result visual at y≈64. Layers auto-fit via
`fitPositionedVisual` unless you set an explicit `scale`. Do not demote a
purpose-built visual to a text badge — there is no slot to run out of.

**5. Show the result, not the label.** For a "how to use X" video, the visual
should be the OUTCOME of the action: `claude-cli` (`visuals/dev/ClaudeCli.tsx`)
mocks the real TUI — prompt box, permission-mode line, and menu overlays — and
wrapping two of its states in a `transform` gives a literal before → after of
one keypress. Naming a shortcut on a keycap is weaker than showing the menu it
opens; use `keycap`/badges as the label ON TOP of a result visual, not instead
of one.

**Motion discipline.** Movement should mean something. One consistent slide
direction for the whole video reads as professional; a different direction every
cut reads as noise. Reserve `cut` for the opening frame and use one slide
elsewhere, unless a direction change is marking a real chapter break. The
`entrance: "none"` rule below still applies to every scene using a slide.

## Generating a full script (multi-scene video)

When asked to write a complete video's `projects/*.json` from a topic (not just edit one scene), follow this structure — it's the pattern validated across `projects/template-problem-payoff.json`, `template-curiosity-loop.json`, `vibe-coding-mvp-roadmap.json`, and `template-direction-demo.json`.

**Overall shape:** `hook-centered` (hook) → `hook-visual` (problem/pain) → optional `visual-explainer` (solution/agenda preview) → N **step-pairs** (see below, one pair per roadmap step / list item — do NOT use the `steps` scene type for anything with more than a couple items, it crams everything into one static frame) → `takeaway` (CTA). 4–8 top-level beats plus however many step-pairs the content actually needs; don't pad with filler steps to hit a round number.

**Step-pair pattern** — every "step N" gets exactly TWO scenes, not one:
1. **Title scene** (`hook-centered`): `content.eyebrow: "ŽINGSNIS 0N"`, a single `richHeadline` line (`size: "hero"`, `pill: true`) naming the step. This is also where the step's icon makes its FIRST appearance — see linking below.
2. **Explain scene** (`visual-explainer`): same `eyebrow` (repeats the step number — this is what makes the cut feel connected, not a random collage of frames), a `headline` sentence explaining it, one `highlights` word. If there's a real diagram/illustration for the step (tool-flow, checklist, flow, progress, etc.), add it as its own layer alongside the carried icon layer.

**Carrying the step icon across its own pair:** pick ONE prop/tool-logo that represents the step (e.g. `key` for "secrets", `link` for "API"). Give BOTH scenes of the pair a layer with that same asset and the same `link.groupId` (unique per step, e.g. `"step3-icon"`):
- Title scene: place it in the upper area away from the centered headline (e.g. `x: 66, y: 24` or `x: 34, y: 24` — alternate left/right per step for variety), `scale` large (~1.5–1.9), `entrance` set to a `zoomSettle*` direction for its cold-open appearance (it starts the chain, so nothing glides into it).
- Explain scene: push it into an actual corner (e.g. `x: 86, y: 14`, `x: 14, y: 82`), `scale` small (~0.4–0.6). No `entrance`/`exit` needed — the carry glide takes over.
- Do NOT reuse a `groupId` across more than one pair, and keep the members consecutive — one pair, one groupId, one icon.

**Motion rules — read this before setting `motion.transition`:**
- Cycle `motion.transition` through `slideLeft` → `slideDown` → `slideRight` → `slideUp` by scene INDEX (not per-pair) across the *entire* scene list, hook through CTA — real directional variety, not the same slide repeated. `template-direction-demo.json` is the reference for what each direction actually looks like if unsure.
- **Whenever `motion.transition` is a slide (anything but `cut`), set `motion.entrance: "none"` on that same scene.** This is not optional polish — omitting it silently falls back to `"fade"`, which layers an independent opacity fade UNDER the whole-scene slide and reads as the content vanishing mid-frame instead of sliding fully off. This bit us for real in this repo; don't reintroduce it.
- For the SAME reason, don't give a layer a `zoomSettle*`/`burstOut`/`fade`-family entrance/exit unless you deliberately want that element to animate independently of (i.e. NOT in lockstep with) the whole-scene slide. Default to `"none"` for both on scenes using a slide transition, UNLESS the layer is part of a carry (handled separately) or you have a specific reason to call out one element with its own motion.
- `motion.stagger`: 4 for title scenes (just eyebrow + one headline, wants to feel instant), 6 for explain scenes and everything else.

**Durations:** don't set them. Write `vo` per scene and let `resolveSceneDuration` decide (see the pacing section above). The numbers that used to live here — 1.6s titles, 3.0–3.8s explains — were guesses, and guessing is what produced cuts that landed before the voiceover finished.

For pure atmosphere on a scene with nothing else going on, two drifting corner props (`kenBurns: "float"`, parked near opposite corners) still work — but prefer a CARRIED real icon whenever the icon actually MEANS something (represents the step/topic), since a carried icon gives narrative continuity into the next scene and a decorative accent doesn't.

**Before handing off a generated script:** parse it with `parseProject` (or just open it via the editor's Templates/Import — either will surface a schema error immediately), and sanity-check every carry `groupId` appears on consecutive scenes with matching assets.

## Current scope

Scenes (`src/registries/sceneRegistry.ts`): hook-centered, hook-visual, visual-explainer, screen-demo, takeaway, comparison, steps. All seven are thin wrappers over `SceneFrame` — each one only declares its text elements, its text zone and its column gap; a scene component that is more than ~60 lines is doing something the frame should own.

Visual primitives (`src/registries/visualTemplateRegistry.ts` for the insertable presets; full type list in `src/schema/visual.ts`):
- assets: tool-logo, tool-flow, prop — all drawn as bare artwork at the requested size, with no plate/background behind them (the logo files are already tiles; a second container around them read as a bug)
- media/devices: image, recording (browser/phone/none frame), browser, phone
- data: stat-counter, checklist, pricing-card, app-mockup (list/stat/chart), progress
- diagrams: flow (labeled nodes + animated connector), node-group (orbit/radial/one-to-many), stack (staggered pile), transform (crossfade reveal)

Backgrounds: solid-dark, soft-grid, orange-glow, spotlight, perspective-data-grid, floating-glass-layers, dot-grid.
Motion: `motion.entrance` (none/fade/slideUp/slideDown/slideLeft/slideRight/scaleIn/pop/zoomSettleRight/zoomSettleLeft/zoomSettleTop/zoomSettleBottom) controls how badge/eyebrow/headline/visual/body come in, staggered by `motion.stagger` frames apart — it does NOT apply to Rich Headline lines or Blocks, which carry their own per-line/per-block `animation`. `motion.exit` (none/fade/slideUp/slideDown/slideLeft/slideRight/scaleOut/burstOut, optional — unset = hard cut) animates the whole scene's content out together in the last `motion.exitDuration` frames (default 18) before the scene ends; implemented in `src/video/motion/exits.ts` + `useSceneExitStyle` in `src/video/scenes/EnterOnCue.tsx`, applied by merging its style into each scene's content `AbsoluteFill`. `"none"` is a real preset (not just omitting the field) — it means "no independent animation, only whatever the parent transform carries it with"; see the script-generation section below for when to use it. `zoomSettleRight`/`Left`/`Top`/`Bottom` fly in from that side, overshoot past their resting scale, then settle (`src/video/motion/entrances.ts`); `burstOut` punches up in scale + rotates while fading (`src/video/motion/exits.ts`) — both are OPACITY-based, so never pair them with a scene that also needs "fully leaves the frame" behavior (use `"none"` there instead, see below).

**Slide distance** — every slide/zoomSettle animation takes an optional travel distance in px: `motion.entranceDistance`/`motion.exitDistance` for the scene's content group, and `entranceDistance`/`exitDistance` per layer (`visualEntranceDistance`/`visualExitDistance` on a `comparison` column's visual). Unset = the subtle built-in default (60px in, 70px out), which is deliberately small. At or past `FULL_TRAVEL_DISTANCE` (400px, `src/video/motion/entrances.ts`) the opacity fade is DROPPED — the same reasoning as `transitions.ts`, which never fades either: an element travelling far enough to leave the canvas should read as one continuous move, not as something dissolving a few pixels into it. Use ~1200px (`OFF_FRAME_DISTANCE`, the editor's "Off-frame" button) when you want an element to genuinely start or end outside the frame.

`motion.transition` is the cut INTO a scene: `cut` (hard, no animation), `push` (deprecated alias for `slideLeft`, kept for old projects), or `slideLeft`/`slideRight`/`slideUp`/`slideDown` — the incoming scene slides in from that side while the outgoing scene slides all the way out the opposite side, pure `translate` with **no opacity fade**, sized to 100% of the canvas so it travels genuinely off-screen (`src/video/motion/transitions.ts`). Consecutive scenes using any transition other than `cut` overlap in time by `SCENE_OVERLAP_FRAMES` (`src/utils/duration.ts`, currently 12 frames == `PUSH_FRAMES`) so the outgoing scene's slide-out and the incoming scene's slide-in play during the SAME absolute frames instead of leaving an empty gap — `computeSceneTimings` is the single source of truth for this and both `SceneRenderer` and `projectDurationInFrames` read it, never compute scene start frames independently.

`content.blocks` (optional, any scene type) is a freeform layer of independently positioned/styled/animated text or badge elements — `x`/`y` are percentages of the full 1080×1920 canvas (not the safe area), each block has its own `size` (px), `color` (hex), `letterSpacing`, `font`, `animation`+`splitBy`, and `delay`. Rendered by `src/video/typography/BlockLayer.tsx`.

`content.visuals` is **the** visual model: an ordered stack where the array index IS the z-index (first = bottom, last = on top). Every graphic in a scene is an entry — there is no separate "primary visual" slot any more. Each entry is `{id, visual, x, y, scale, entrance, exit, exitDuration, entranceDistance, exitDistance, delay, kenBurns, sfx, exitSfx, link}`, rendered by `src/video/typography/VisualsLayer.tsx`, and its in/out animation runs through `AnimatedVisual` (`src/video/typography/AnimatedVisual.tsx`) — do not duplicate that entrance/exit math anywhere else. `x`/`y` are percentages of the full 1080x1920 canvas and address the visual's CENTRE.

Full-bleed compositions (`node-group` with `layout: "orbit"`, and `corner-props`) are the one routing exception: `isFullBleedVisual` (`src/video/visuals/isFullBleed.ts`) gives them the whole frame and ignores their `x`/`y`/`scale`, because they draw their own geometry against the canvas. Their animation, sound and carry settings still apply normally.

**Legacy `scene.visual` and its `visualXxx` siblings still parse, but nothing renders them.** `parseProject` (`src/utils/normalizeProject.ts`) folds the primary visual into `content.visuals[0]` at load time, baking its `layout`/`visualPosition`/`visualScale` down to concrete `x`/`y`/`scale` (a scene with neither gets the `visual-bottom` preset, which is where the old inline flow put it). Old projects open unchanged and re-save in the new shape. Write new projects with layers directly.

`link: { groupId }` on a layer chains it to the immediately adjacent scene (previous and/or next in the project's `scenes` array, matched by the SAME `groupId`) so the SAME asset travels between each scene's layer pose (`x`/`y`/`scale`) across the cut — pure position+scale interpolation, no opacity fade — instead of exiting and a new one entering (`src/utils/visualLinks.ts` for the pose resolution, `src/video/typography/AnimatedVisual.tsx#resolveEntrance/resolveExit` for the glide math, wired in `SceneRenderer`). Requirements: each participating scene needs a layer with the SAME `visual` (same type + asset) and the same `groupId`, on CONSECUTIVE scenes. A chain can be any length, but a `groupId` appearing on only one scene is not a carry and is ignored. A carried layer's own `entrance`/`exit` apply only at the two ends of the chain (see the hoisting note below).

**`corner-props` is split automatically, not rendered as a composite.** It used to draw TWO props from one entry, so the pair shared one size, one entrance and no exit. `splitCornerProps` (`src/utils/normalizeProject.ts`) now turns each prop into an ordinary layer at load time — and when the preset is clicked in the Visuals tab — converting its pixel `size` to a `scale` and giving each the `float` Ken Burns preset, which is the old CornerFloat drift. Two layers, full standard controls, no special case. **Do not add per-asset arrays (`sizes[]`, `entrances[]`, …) to any composite visual**: if the pieces need individual control, they are layers.

**A linked chain is ONE mounted element, not one per scene.** `resolveHoistedLinkGroups` (`src/utils/visualLinks.ts`) collects every layer that declares a `link` and collapses a run of consecutive scenes sharing a `groupId` into a single `<Sequence>` spanning the whole run, rendered by `LinkedVisual` (`src/video/typography/LinkedVisual.tsx`); `SceneRenderer` then filters the matching `content.visuals[]` entry out of each member scene so it isn't drawn twice (`hoistedOwnership`). This is what makes a carried `recording` keep PLAYING across the cut instead of restarting from frame 0 and flashing black — inside a per-scene sequence the video element was unmounted and remounted at every boundary. It also means a chain can be any length: the pose walks through every keyframe (`poseAt`), gliding over `GLIDE_FRAMES` at each cut and holding in between. The chain's FIRST member supplies the entrance, distance, Ken Burns drift and entrance sfx; its LAST supplies the exit. The editor's carry buttons EXTEND the chain a scene is already in rather than minting a new `groupId` — minting one orphaned the earlier scenes, which showed up as a recording restarting partway down a run instead of playing through. A `groupId` that appears on only one scene is not hoisted (nothing to carry).

**The move belongs to ONE scene — the one the visual lands in.** The outgoing scene (the one with `linkTo`) does NOT animate at all: it holds its pose until the cut. The incoming scene (`linkFrom`) plays the whole travel in its first `LINK_BLEND_FRAMES`, starting from the previous scene's pose. Animating both sides was the original design and it read as a stutter — the viewer saw the move once as the first scene glided away and again as the second glided in, and with a slide `transition` the two copies travelled in OPPOSITE directions as their frames pushed past each other. For the same reason the editor's "Carry this visual into the next scene →" sets the next scene's `motion.transition` to `cut`: a slide translates the whole incoming frame, so the glide would be riding a frame that is itself moving. Keep the linked pair on `cut` unless you have a specific reason not to.

`kenBurns` (per layer) is continuous motion — `zoomIn`/`zoomOut`/`panLeft`/`panRight`/`panUp`/`panDown`, plus two cyclic presets driven by raw frame count rather than a clamped 0→1 progress (so the rhythm doesn't depend on scene length): `float` (drift/tilt/breathe around the resting spot, phase-seeded per layer id so two never move in lockstep) and `rotateCW`/`rotateCCW` (continuous spin around the layer's own center, ~10s per lap) — that runs for the visual's ENTIRE time on screen, layered on top of (not instead of) its `entrance`/`exit`, which only cover the first/last ~18 frames. Implemented in `src/video/motion/kenBurns.ts`, always linear (no spring/easing) so the drift reads as one continuous move. This is the standard way to make a mockup/screenshot feel alive instead of popping in and sitting frozen — reach for it on any layer that holds the screen for more than ~2s.

`kenBurnsSpeed` (per layer, alongside `kenBurns`) is a rate multiplier for the CYCLIC presets only (`float`/`rotateCW`/`rotateCCW`) — 1 = default pace, 2 = twice as fast, 0.5 = half. No effect on `zoomIn`/`panLeft`/etc, which are sized to the visual's own duration rather than a rate. The editor's Ken Burns picker shows a Speed slider only when the selected preset is one of the three cyclic ones.

In the editor, every one of these (blocks and visual layers) can be repositioned either via the Inspector's x/y sliders or by **dragging the marker directly on the Player preview** (`src/editor/BlockPositionOverlay.tsx`) — prefer keeping that overlay in sync with the schema if any of these shapes change.
**Every visual has the same in/out controls.** Each `content.visuals[]` layer and each `comparison` column's visual (`content.left`/`right`) take `entrance`/`exit` + `exitDuration` + `entranceDistance`/`exitDistance` + `kenBurns` + in/out sfx — on the side columns those are the `visual*`-prefixed fields on the side object (`visualEntrance`, `visualExitDistance`, `visualScale`, …), and a side visual defaults to `entrance: "none"` so it moves with its column exactly as before unless you give it its own. The editor renders one shared `VisualMotionEditor` for both, so there's no place where a visual is missing a control the other has; the distance slider only appears for presets that actually travel (slide*/zoomSettle*).

Scene content also supports: `badge`, `highlights` (words wrapped in a contrast pill box in the headline — never color, per design rule below), and — only on `comparison`/`steps` — `left`/`right`/`items`.

`content.richHeadline` (optional, `hook-centered`/`hook-visual`/`takeaway` only) is a stack of independently-styled lines — each with its own `size` (hero/headline/title/bodyLarge/body/label token), `font` (tanker/clash), optional `pill` box, and its own entrance `animation`/`splitBy` (word/letter/line) — for CapCut-style multi-size hook captions. When present it replaces the plain `headline` for that scene; see `showcase-hook-centered` in `projects/template-showcase.json` for a worked example. Word/letter-level animation reuses the same 4 entrance presets (fade/slideUp/scaleIn/pop) — do not add a separate animation registry for this.

Each line also takes its own `exit` (an `ExitPreset`) — unset means the line simply rides the scene's shared exit fade/slide like it always did (`SceneFrame`'s content column already animates out per `motion.exit`, so doing nothing here IS "use the scene's exit"); set means this ONE line gets an ADDITIONAL, independent exit motion layered on top of that shared one — same "layer a specific motion on top of the ambient one" pattern the old primary-visual exit used. Timing stays shared (`motion.exitDuration`/`exitDistance`); only the preset is per-line, via `ExitConfig` threaded through `AnimatedSplitText`/`AnimatedBox` (`src/video/typography/splitAnimate.tsx`). Because it's additive rather than a replacement, only override a line's exit when you deliberately want it to diverge from its neighbors — setting the SAME preset the scene already uses just compounds the curve for no visual gain.

Design rule: **highlighting a word is always a pill/box (light background, dark text), never a color change** — `src/video/typography/Text.tsx`'s `renderHighlighted` and `pillInlineStyle`/`pillBlockStyle` are the only places this should be implemented.

The `browser` frame (and `recording` with `frame: "browser"`) draws real browser chrome — macOS traffic lights, a tab strip with an active tab plus optional extra tabs, and an address bar with a lock. `url`, `title` and `tabs` are editable in the Inspector for both; the active tab falls back to the URL's domain. `visualMetrics` counts that chrome (690px tall, not 620) — if the chrome's height changes again, update it or auto-fit starts lying.

Known editor gap: the Inspector has full field editing for the "simple" visual types (stat-counter, checklist, pricing-card, app-mockup, progress, keycap, image, recording) and for `browser`/`phone` (URL + a Content picker that swaps the on-screen visual, including an image or a recording) — but only a read-only summary for the remaining nested ones (flow, node-group, stack, transform), which are configured by picking a preset from the Visuals tab or editing the project JSON directly.

The Scenes tab has **Your Scenes** above the blank scene types (`src/editor/state/savedScenesStore.ts`): a scene can be saved with a name and dropped into any project later, copy/visual/layers/animations intact. Inserting re-mints the scene's id plus every block and layer id, and strips each layer's `link` — a carry only means something as a run of adjacent scenes, so half of one would point at a group that isn't there.

The Inspector is split into three tabs — **Content** (copy, Rich Headline, Blocks, Voiceover), **Visuals** (Background + the Layers stack) and **Motion** (the scene's duration, entrance/exit, distance, stagger, transition and cue sounds). Per-element animation deliberately stays INSIDE each element's own card rather than moving to the Motion tab: a layer's In/Out belongs next to its position and asset, and Motion is for the scene as a whole.

The Inspector's **Layers** section (with a count in its title) is where every visual in the scene is configured — one card each, listed bottom layer first, with ↑/↓ to restack. Every card is the same `PositionedVisualEntryCard`: asset (+ Import…), type-specific fields, position, scale, In/Out, Ken Burns, delay, sound and carry. A full-bleed layer hides the position/scale sliders (they do nothing for it) and says so instead. The Inspector's header and tabs are pinned; only the section list scrolls.

Assets can be imported from the **Assets tab** or straight from any asset picker's **Import…** button (`AssetImportButton` inside `AssetSelect`), which uploads the file and switches that layer to it in one step. Both paths import stills and screen recordings (`.mp4`/`.mov`/`.webm`) — the dev-server upload API tags each entry with `kind` (`vite.config.ts`), and `customAssetToVisual` turns a video into a `recording` (browser frame, `fit: "cover"`) and a still into an `image`, everywhere an asset can be chosen. The Inspector's `recording` editor picks from the same imports instead of only accepting a hand-typed path, and previews the clip inline. Older manifest entries have no `kind` and fall back to the file extension (`assetKind` in `customAssetsStore.ts`).

The editor's Visuals tab renders a **real rendered still of each preset** (`src/editor/library/VisualThumb.tsx`, a Remotion `Thumbnail` of the actual component — so the preview can never drift from what the visual really looks like) and groups presets by `category` (`visualTemplateCategories`). A click always appends a new layer to the stack; on `comparison` scenes a second target appears for the left/right columns, which are genuinely column-scoped. Each layer card has **"Carry this layer into the next scene →"** (`linkLayerToNextScene` in `projectStore`), which copies the layer onto the next scene and wires both sides of the group in one click — the correct-by-construction version of what a glide needs (same asset, same groupId, a pose on both, adjacency).

Deferred to later phases (do not build unless asked): terminal/code-editor/chat window mockups, dot-grid/gradient-mesh backgrounds, QA contact-sheet renderer, text-overflow validation warnings, drag-and-drop scene reordering, nested-node Inspector editing for compound visuals.

## Rendering to MP4

The editor's **Render MP4** button (`src/editor/RenderButton.tsx` + the `render-api` plugin in `vite.config.ts`) runs the render from the UI: it POSTs the in-memory project to the dev server, which shells out to `remotion render`, reports progress parsed from Remotion's own output, and then shows the file's path on disk plus a download link. Renders land in `out/`.

From the terminal it's `npm run render:project -- projects/<file>.json out/<name>.mp4` (`scripts/render-project.ts`) — same composition, same props mechanism. **Save** only persists the project to the browser's local library; **Export JSON** downloads the file the CLI takes.

Every reference to a file in `public/` MUST go through `assetUrl` (`src/utils/assetUrl.ts`, wrapping Remotion's `staticFile`). A bare `/assets/...` string works in the editor — Vite serves `public/` at the web root — but in a render Remotion serves the BUNDLE root with `public/` one level inside it, so hardcoded absolute paths 404 and the render dies on the first missing font or sound. That was a real, total render failure in this repo; don't reintroduce a raw path.

## Sound

Sound cues are resolved automatically from `motion.entrance`/`motion.exit` (see `src/video/motion/sfxDefaults.ts`, editable from the editor's Sound tab), but the underlying category → use-case mapping is a real convention from short-form editing practice, not an arbitrary pairing — keep it when choosing an explicit override or a custom upload's group:

- **whoosh / swipe / paper-slide** (`transition` group) — motion and momentum: a slide/scale entrance, a scene cut, a swipe. Fast (<0.5s) whooshes suit quick cuts and snappy slides; slow sweeps (1–3s) suit a dramatic reveal or an establishing shot.
- **pop / click / snap** (`ui`/`impact` groups) — punctuating a single element appearing: a headline word, a stat, a checklist item ticking on. This is what `pop`'s `d-pop` default and the per-word typewriter cue on Blocks are for.
- **riser** (`reveal` group) — anticipation *before* a payoff, not the payoff itself: use on the beat leading into a reveal, not on the reveal frame.
- **ding / success / d-done, d-fix** (`success` group) — an achievement, a checkmark, a CTA landing. Reserve for the one or two moments in a video that are actually the payoff.

**Moderation is the most important rule, not sound choice.** A cue on every single scene entrance/exit reads as cluttered and amateurish; real short-form editors reserve audible sfx for their **3–5 most important beats per video** (the hook, one or two key reveals, the CTA) and leave everything else silent. In practice this means: don't treat "every scene gets an entrance whoosh" as the goal just because the system can auto-resolve one — actively set `motion.sfx`/`motion.exitSfx`/`visualSfx` to `"none"` on the scenes that aren't a real beat, and only let the automatic per-preset default play where the moment earns it. Per-word cues on Blocks are the one deliberate exception (they're one continuous typewriter effect, not repeated punctuation) — don't extend that "sound on every unit" pattern anywhere else.

**Timing**: a cue reads as sloppy if it doesn't land on the same frame as the visual event it's punctuating — `delay`/stagger values should put the sfx's transient on the same frame the element actually lands/appears, not before or after it.

Sources: [Epidemic Sound — TikTok sound effects](https://www.epidemicsound.com/tiktok/tik-tok-sound-effects/), [EseCut — sound effects that boost engagement](https://esecut.com/blog/sound-effects-that-boost-engagement), [MyInstantPlay — transition sound effects & video hooks](https://myinstantplay.com/blog/transition-sound-effects-and-video-hooks-complete-guide).
