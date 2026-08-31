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

1. Assets sync themselves. `props/`, `ai/`, `sfx/` and `fonts/` (paths overridable in `.env.local`) are the SOURCE of every prop, tool logo and sound; nothing reads them directly. `syncAssets` (`scripts/syncAssets.ts`) copies them into `public/` and regenerates `src/registries/assets.generated.ts`, which is what `propRegistry`/`toolRegistry`/`sfxRegistry` import and therefore what the editor's Visuals and Assets tabs list. The `asset-sync` plugin in `vite.config.ts` runs it when the dev server starts and again whenever one of those folders changes, so a file dropped into `props/` shows up in the running editor without a reload. `npm run assets:sync` runs the same function once, for a build or a cold checkout.

   Note it copies but never deletes: removing a file from `props/` drops it from the manifest (so it vanishes from the editor) while the copy under `public/assets/props/` stays, which is what keeps an older project that still references it from breaking.
2. `npm run dev` opens the editor. It has two modes, switched at the far left of the header: **Storyboard** (write the script as beats — see the next section) and **Scenes** (scene library, visual library, background library, asset browser, Remotion Player preview, inspector, scene strip).
3. Build the project as data in `projects/*.json`, or via the editor (Save writes to localStorage, Export JSON downloads the file).
4. `npm run studio` opens Remotion Studio against the same composition for a render-accurate check.
5. `npm run render` renders the composition to MP4.

## Storyboard — the script layer, kept in its own file

Before a project is a project it is a SCRIPT, and the script lives in its own
shape: `storyboards/*.json`, validated by `src/schema/storyboard.ts`, edited in
the editor's **Storyboard** mode (the toggle at the far left of the header).
The authoring rules for that file live in `storyboards/README.md` — read it
before writing a storyboard by hand.
Nothing about it is shared with `projects/*.json` — different schema, different
localStorage key (`tikmaker.storyboards`), different id space.

**Why it's split.** A beat says WHAT this moment has to do (say this line, show
this thing, for about this long); a scene says how it is drawn (layout, layers,
motion, sfx). Merged, every wording change drags a pile of animation fields
through the diff and every restack of layers looks like a script edit. Split,
the script can be finished — and argued about — before a single visual exists.

A **beat** is `{id, role, purpose, voiceover, onScreenText, visualPlaceholder,
durationSeconds, notes}`. `role` is the only field with mechanical meaning: it
is a closed enum (`hook`, `problem`, `solution`, `reveal`, `step`, `demo`,
`proof`, `payoff`, `cta`) and `beatRoleRegistry` maps each one to the scene type
it generates plus the default `purpose` it starts with. `visualPlaceholder` is
deliberately PROSE, not a `VisualConfig`: at storyboard time you know what has
to be shown long before you know which component shows it.

**The crossing is one-way and happens once.** `storyboardToProject`
(`src/utils/storyboardToProject.ts`), behind the **Generate Scenes** button,
turns each beat into one placeholder scene — role's scene type, `onScreenText`
as the headline, the role as the eyebrow, `voiceover` as `scene.vo`, and
`visualPlaceholder`+`notes` as `scene.notes` (an author-only field, never
rendered, surfaced in the Inspector's Content tab so the description of what the
frame needs stays attached to the frame that needs it). It opens a NEW project
rather than merging into the open one — regenerating over hand-edited scenes
would silently discard the design work the handoff existed to enable. A
storyboard is never regenerated FROM a project.

Generation stays deliberately literal — it carries copy and pacing across and
nothing else. It does follow the house motion rules (transitions cycled by scene
index, `entrance: "none"` under every slide, `sfx: "none"` so the 3-5 beats that
earn a cue stay a choice), because those are rules rather than design decisions.
Picking layouts, visuals and layers is the editing pass that follows, and a
generator guessing at them produces work to undo, not a starting point.

**Durations are advisory.** A beat's `durationSeconds` is a plan typed weeks
before the line was recorded, so a generated scene leaves `durationSeconds`
UNSET whenever the beat has a voiceover and lets `resolveSceneDuration` pace it
from the VO (see the pacing section). A beat with a duration and no voiceover
has nothing to derive from, so that number is the only signal there is and it
gets used. The same fallback drives the storyboard's own running total, which is
compared against `targetDuration` in the header so an overrun is visible while
writing rather than after rendering.

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
- media/devices: image, recording (none/plain/browser/phone frame), browser, screen, phone

**Frames, and which claim each one makes.** `BrowserMockup`'s tab strip and address bar assert "this came from a website" — true for a web app, false for a terminal, a desktop app, or a photo, where it reads as a costume. `frame: "plain"` (and its wrapper twin, the `screen` visual type, which is to `browser` what a plain card is to a window) is that same rounded, shadowed card with the chrome removed: same width, same shadow, same border, so switching between them changes what the media SAYS without moving it in the layout. `frame: "none"` is different again — a raw rectangle with no card at all, for footage that should sit flat against the background. `ScreenFrame` takes an `aspect` (16:9 / 16:10 / 4:3 / 1:1 / 9:16, default 16:10) because a phone screenshot or a square crop otherwise letterboxes inside its own card; portrait ratios are sized by height so they can't overflow the 1920 canvas. Its pixel sizes live in `src/video/visuals/devices/screenFrameSize.ts`, a React-free leaf module, for the same reason `visualMetrics` is one — the auto-layout measures that box while a project is being normalized at import time, and reaching through the component would drag the whole `VisualRenderer` graph into that path.
- data: stat-counter, checklist, pricing-card, app-mockup (list/stat/chart), progress
- diagrams: flow (labeled nodes + animated connector), node-group (orbit/radial/one-to-many), stack (staggered pile), transform (crossfade reveal)

Backgrounds: solid-dark, soft-grid, orange-glow, spotlight, perspective-data-grid, floating-glass-layers, dot-grid.
Motion: `motion.entrance` (none/fade/slideUp/slideDown/slideLeft/slideRight/scaleIn/pop/zoomSettleRight/zoomSettleLeft/zoomSettleTop/zoomSettleBottom/zoomIn/blurIn/spinIn/flipIn/bounceIn/dropIn/rollIn) controls how badge/eyebrow/headline/visual/body come in, staggered by `motion.stagger` frames apart — it does NOT apply to Rich Headline lines or Blocks, which carry their own per-line/per-block `animation`. `motion.exit` (none/fade/slideUp/slideDown/slideLeft/slideRight/scaleOut/burstOut/zoomOut/blurOut/spinOut/flipOut/dropOut/rollOut, optional — unset = hard cut) animates the whole scene's content out together in the last `motion.exitDuration` frames (default 18) before the scene ends; implemented in `src/video/motion/exits.ts` + `useSceneExitStyle` in `src/video/scenes/EnterOnCue.tsx`, applied by merging its style into each scene's content `AbsoluteFill`. `"none"` is a real preset (not just omitting the field) — it means "no independent animation, only whatever the parent transform carries it with"; see the script-generation section below for when to use it. `zoomSettleRight`/`Left`/`Top`/`Bottom` fly in from that side, overshoot past their resting scale, then settle (`src/video/motion/entrances.ts`); `burstOut` punches up in scale + rotates while fading (`src/video/motion/exits.ts`) — both are OPACITY-based, so never pair them with a scene that also needs "fully leaves the frame" behavior (use `"none"` there instead, see below).

**A slide starts (or ends) OUTSIDE the frame.** With no explicit distance, every
`slide*` in and out travels `offFrameTravel(axis)` (`src/video/motion/entrances.ts`)
— the real canvas dimension plus a margin, per axis, so the element clears the
frame from any resting position and the caller never has to work out "how far is
far enough". That is past `FULL_TRAVEL_DISTANCE`, so these slides carry no
opacity fade either: the move IS the animation, exactly as `transitions.ts` has
always treated the whole-scene slide. The old 60px entrance default made an
element materialise a thumb's width from where it lands, which read as a pop
followed by a twitch. `dropIn`/`dropOut`/`rollIn`/`rollOut` use the same basis.

**Exits accelerate away; entrances decelerate in.** `standardEasing` is an
aggressive ease-OUT — right for an arrival, wrong for a departure, and exits
were using it. It covers ~60% of the travel in the first fifth of the window, so
an element bolted off-frame almost immediately and the rest of its OUT duration
was spent invisible; lengthening the duration changed nothing you could see,
which reads as "the time slider does nothing". `exitEasing`
(`src/video/motion/easing.ts`) is the mirror curve, and `exits.ts` uses it.

**What the IN/OUT duration means.** It is how long the animation runs, anchored
to the OBJECT's own window rather than the scene's: an IN occupies its first N
frames (from `delay`), an OUT its last N (ending at `exitAt`). So "1s OUT" on a
3s visual animates across that whole final second. The editor's slider is capped
by that window rather than a flat 2s, so a long move is expressible on a long
clip.

**"auto" is not "off".** An unset entrance falls back to a real preset —
`scaleIn` for a visual layer, `pop` for text, `fade` for scene content — so
clearing one and watching the object keep animating is a fallback, not a bug.
The explicit `none` preset is what turns an entrance off, and the editor labels
the two cards `auto · <preset>` and `be efekto` so the difference is visible at
the point of choosing. Unset EXIT really is no exit, so there both mean the
same.

**Keyframes: a layer's pose over time.** `keyframes: [{id, frame, x?, y?,
scale?}]` on a `content.visuals[]` entry (schema in `scene.ts`, math in
`src/video/layout/visualKeyframes.ts`, a React-free leaf like `visualMetrics`)
makes a layer follow a path instead of holding one pose. Frames are
SCENE-relative — the same clock as `delay` and `exitAt`.

It is a SUPERSET of the single pose, not a replacement: any field a keyframe
omits falls back to the entry's own `x`/`y`/`scale`, so adding one keyframe
changes nothing until a second one gives it somewhere to go (`hasKeyframePath`
is "two or more" for exactly that reason). Entrance, exit and Ken Burns still
apply ON TOP — they are relative transforms, and what keyframes move is the
resting pose they animate around, which is why none of the three fight over the
same property. Each segment is eased (`standardEasing`, the same curve a linked
visual's glide uses), and the first/last keyframe are held outside the path
rather than extrapolated.

`VisualsLayer` renders one `VisualLayerEntry` component per layer instead of an
inline `.map` body, because reading the pose now needs `useCurrentFrame()`.

In the editor: diamonds on the layer's timeline row (drag to retime), and a
Keyframes section in the object panel's Basic tab. **Once a layer has a path,
the position/scale sliders edit the keyframe under the playhead** — creating one
there if that frame has none — because writing to the base pose would shift the
whole path, which is never what moving one point means. A layer with no
keyframes edits its base pose exactly as before. `addVisualKeyframe` captures
the pose the layer currently HOLDS (via `poseAtFrame`), so pressing the button
never makes the layer jump.

**A layer's scale must not scale its own animation.** `VisualsLayer` passes each
layer's fit scale to `AnimatedVisual` as `ownScale` rather than putting
`scale(...)` on the positioning wrapper. A transform on the parent scales the
child's whole coordinate system, so a layer at `scale: 2.8` turned a 1280px exit
slide into 3584px on screen: the visual cleared the frame in about three frames
and lengthening the OUT duration only extended how long it sat invisible
off-screen — which reads exactly like "the duration slider does nothing".
`AnimatedVisual` composes `<enter> <kenBurns> <exit> scale(ownScale)`, and a
translate written to the LEFT of a scale is not multiplied by it, so travel
distances stay canvas pixels.

**Off-frame distance is computed per layer, not guessed.** With no explicit
`entranceDistance`/`exitDistance`, `VisualsLayer` measures the real distance from
that layer's centre (its `x`/`y`) plus half its rendered size (`naturalVisualSize`
x fit) to the edge it is travelling towards. `offFrameTravel` in `entrances.ts` is
the fallback for callers that only know the axis (scene content, text). Getting
this right is what makes the duration meaningful: over the whole window the
element travels from its place to just past the edge, instead of leaving in the
first few frames and waiting out the rest.

**Slide distance** — every slide/zoomSettle animation takes an optional travel distance in px: `motion.entranceDistance`/`motion.exitDistance` for the scene's content group, and `entranceDistance`/`exitDistance` per layer (`visualEntranceDistance`/`visualExitDistance` on a `comparison` column's visual). Unset = the subtle built-in default (60px in, 70px out), which is deliberately small. At or past `FULL_TRAVEL_DISTANCE` (400px, `src/video/motion/entrances.ts`) the opacity fade is DROPPED — the same reasoning as `transitions.ts`, which never fades either: an element travelling far enough to leave the canvas should read as one continuous move, not as something dissolving a few pixels into it. Use ~1200px (`OFF_FRAME_DISTANCE`, the editor's "Off-frame" button) when you want an element to genuinely start or end outside the frame.

`motion.transition` is the cut INTO a scene: `cut` (hard, no animation), `push` (deprecated alias for `slideLeft`, kept for old projects), or `slideLeft`/`slideRight`/`slideUp`/`slideDown` — the incoming scene slides in from that side while the outgoing scene slides all the way out the opposite side, pure `translate` with **no opacity fade**, sized to 100% of the canvas so it travels genuinely off-screen (`src/video/motion/transitions.ts`). Consecutive scenes using any transition other than `cut` overlap in time by `SCENE_OVERLAP_FRAMES` (`src/utils/duration.ts`, currently 12 frames == `PUSH_FRAMES`) so the outgoing scene's slide-out and the incoming scene's slide-in play during the SAME absolute frames instead of leaving an empty gap — `computeSceneTimings` is the single source of truth for this and both `SceneRenderer` and `projectDurationInFrames` read it, never compute scene start frames independently.

`content.blocks` (optional, any scene type) is a freeform layer of independently positioned/styled/animated text or badge elements — `x`/`y` are percentages of the full 1080×1920 canvas (not the safe area), each block has its own `size` (px), `color` (hex), `letterSpacing`, `font`, `animation`+`splitBy`, and `delay`. Rendered by `src/video/typography/BlockLayer.tsx`.

`content.visuals` is **the** visual model: an ordered stack where the array index IS the z-index (first = bottom, last = on top). Every graphic in a scene is an entry — there is no separate "primary visual" slot any more. Each entry is `{id, visual, x, y, scale, entrance, exit, exitDuration, entranceDistance, exitDistance, delay, kenBurns, sfx, exitSfx, link}`, rendered by `src/video/typography/VisualsLayer.tsx`, and its in/out animation runs through `AnimatedVisual` (`src/video/typography/AnimatedVisual.tsx`) — do not duplicate that entrance/exit math anywhere else. `x`/`y` are percentages of the full 1080x1920 canvas and address the visual's CENTRE.

Full-bleed compositions (`node-group` with `layout: "orbit"`, and `corner-props`) are the one routing exception: `isFullBleedVisual` (`src/video/visuals/isFullBleed.ts`) gives them the whole frame and ignores their `x`/`y`/`scale`, because they draw their own geometry against the canvas. Their animation, sound and carry settings still apply normally.

**Legacy `scene.visual` and its `visualXxx` siblings still parse, but nothing renders them.** `parseProject` (`src/utils/normalizeProject.ts`) folds the primary visual into `content.visuals[0]` at load time, baking its `layout`/`visualPosition`/`visualScale` down to concrete `x`/`y`/`scale` (a scene with neither gets the `visual-bottom` preset, which is where the old inline flow put it). Old projects open unchanged and re-save in the new shape. Write new projects with layers directly.

`link: { groupId }` on a layer chains it to the immediately adjacent scene (previous and/or next in the project's `scenes` array, matched by the SAME `groupId`) so the SAME asset travels between each scene's layer pose (`x`/`y`/`scale`) across the cut — pure position+scale interpolation, no opacity fade — instead of exiting and a new one entering (`src/utils/visualLinks.ts` for the pose resolution, `src/video/typography/AnimatedVisual.tsx#resolveEntrance/resolveExit` for the glide math, wired in `SceneRenderer`). Requirements: each participating scene needs a layer with the SAME `visual` (same type + asset) and the same `groupId`, on CONSECUTIVE scenes. A chain can be any length, but a `groupId` appearing on only one scene is not a carry and is ignored. A carried layer's own `entrance`/`exit` apply only at the two ends of the chain (see the hoisting note below).

**`corner-props` is split automatically, not rendered as a composite.** It used to draw TWO props from one entry, so the pair shared one size, one entrance and no exit. `splitCornerProps` (`src/utils/normalizeProject.ts`) now turns each prop into an ordinary layer at load time — and when the preset is clicked in the Visuals tab — converting its pixel `size` to a `scale` and giving each the `float` Ken Burns preset, which is the old CornerFloat drift. Two layers, full standard controls, no special case. **Do not add per-asset arrays (`sizes[]`, `entrances[]`, …) to any composite visual**: if the pieces need individual control, they are layers.

**A linked chain is ONE mounted element, not one per scene.** `resolveHoistedLinkGroups` (`src/utils/visualLinks.ts`) collects every layer that declares a `link` and collapses a run of consecutive scenes sharing a `groupId` into a single `<Sequence>` spanning the whole run, rendered by `LinkedVisual` (`src/video/typography/LinkedVisual.tsx`); `SceneRenderer` then filters the matching `content.visuals[]` entry out of each member scene so it isn't drawn twice (`hoistedOwnership`). This is what makes a carried `recording` keep PLAYING across the cut instead of restarting from frame 0 and flashing black — inside a per-scene sequence the video element was unmounted and remounted at every boundary. It also means a chain can be any length: the pose walks through every keyframe (`poseAt`), gliding over `GLIDE_FRAMES` at each cut and holding in between — each hop's `link.glideLead`/`glideDuration` (read from the scene being arrived at) can start that move before the cut and resize it, which is how a carry overlaps the outgoing scene's text exit instead of waiting for it. The chain's FIRST member supplies the entrance, distance, Ken Burns drift and entrance sfx; its LAST supplies the exit. The editor's carry buttons EXTEND the chain a scene is already in rather than minting a new `groupId` — minting one orphaned the earlier scenes, which showed up as a recording restarting partway down a run instead of playing through. A `groupId` that appears on only one scene is not hoisted (nothing to carry).

**The move belongs to ONE scene — the one the visual lands in.** The outgoing scene (the one with `linkTo`) does NOT animate at all: it holds its pose until the cut. The incoming scene (`linkFrom`) plays the whole travel in its first `LINK_BLEND_FRAMES`, starting from the previous scene's pose. Animating both sides was the original design and it read as a stutter — the viewer saw the move once as the first scene glided away and again as the second glided in, and with a slide `transition` the two copies travelled in OPPOSITE directions as their frames pushed past each other. For the same reason the editor's "Carry this visual into the next scene →" sets the next scene's `motion.transition` to `cut`: a slide translates the whole incoming frame, so the glide would be riding a frame that is itself moving. Keep the linked pair on `cut` unless you have a specific reason not to.

`kenBurns` (per layer) is continuous motion — `zoomIn`/`zoomOut`/`panLeft`/`panRight`/`panUp`/`panDown`, plus two cyclic presets driven by raw frame count rather than a clamped 0→1 progress (so the rhythm doesn't depend on scene length): `float` (drift/tilt/breathe around the resting spot, phase-seeded per layer id so two never move in lockstep) and `rotateCW`/`rotateCCW` (continuous spin around the layer's own center, ~10s per lap) — that runs for the visual's ENTIRE time on screen, layered on top of (not instead of) its `entrance`/`exit`, which only cover the first/last ~18 frames. Implemented in `src/video/motion/kenBurns.ts`, always linear (no spring/easing) so the drift reads as one continuous move. This is the standard way to make a mockup/screenshot feel alive instead of popping in and sitting frozen — reach for it on any layer that holds the screen for more than ~2s.

`kenBurnsSpeed` (per layer, alongside `kenBurns`) is a rate multiplier for the CYCLIC presets only (`float`/`rotateCW`/`rotateCCW`) — 1 = default pace, 2 = twice as fast, 0.5 = half. No effect on `zoomIn`/`panLeft`/etc, which are sized to the visual's own duration rather than a rate. The editor's Ken Burns picker shows a Speed slider only when the selected preset is one of the three cyclic ones.

In the editor, every one of these (blocks, visual layers, the rich-headline stack and any line freed from it) can be repositioned either via the Inspector's x/y sliders or by **dragging the marker directly on the Player preview** (`src/editor/BlockPositionOverlay.tsx`) — prefer keeping that overlay in sync with the schema if any of these shapes change.
**Every visual has the same in/out controls.** Each `content.visuals[]` layer and each `comparison` column's visual (`content.left`/`right`) take `entrance`/`exit` + `entranceDuration`/`exitDuration` + `entranceDistance`/`exitDistance` + `kenBurns` + in/out sfx — on the side columns those are the `visual*`-prefixed fields on the side object (`visualEntrance`, `visualExitDistance`, `visualScale`, …), and a side visual defaults to `entrance: "none"` so it moves with its column exactly as before unless you give it its own. The editor renders one shared `VisualMotionEditor` for both, so there's no place where a visual is missing a control the other has; the distance slider only appears for presets that actually travel (slide*/zoomSettle*).

**Why `entranceDuration` arrived late.** `exitStyle` is one `interpolate` over an explicit `[duration - exitDuration, duration]` window, so `exitDuration` was always a real knob. Every entrance preset EXCEPT `fade` is a spring, and a spring has no duration — its pace comes from damping/stiffness/mass — so `enter`'s `durationInFrames` was read by the `fade` branch alone and there was no matching field anywhere in the schema. Remotion's `spring()` accepts a `durationInFrames` that stretches or squashes the whole curve to fit, and passing it through makes the knob mean the same thing for all of them. It is threaded through `AnimatedVisual` and `EnterOnCue` and appears as `entranceDuration` on a layer, `visualEntranceDuration` on a comparison column, and `motion.entranceDuration` on a scene. **Unset stays unset on purpose**: `fade` keeps its 18-frame default and every spring keeps its natural pace, so no existing project changed.

Scene content also supports: `badge`, `highlights` (words wrapped in a contrast pill box in the headline — never color, per design rule below), and — only on `comparison`/`steps` — `left`/`right`/`items`.

`content.richHeadline` (optional, `hook-centered`/`hook-visual`/`takeaway` only) is a stack of independently-styled lines — each with its own `size` (hero/headline/title/bodyLarge/body/label token), `font` (tanker/clash), optional `pill` box, and its own entrance `animation`/`splitBy` (word/letter/line) — for CapCut-style multi-size hook captions. When present it replaces the plain `headline` for that scene; see `showcase-hook-centered` in `projects/template-showcase.json` for a worked example. Word/letter-level animation reuses the same 4 entrance presets (fade/slideUp/scaleIn/pop) — do not add a separate animation registry for this. A line also takes a `color` hex (same field and picker as `Block.color`); unset keeps the token default it would otherwise get — dark inside a `pill`, `colors.textPrimary` outside one — so a pill never needs a manual color to stay legible. That field is line-level styling and NOT a way around the pill rule below: recoloring a whole line for a deliberate look is fine, recoloring one to emphasize it is what `pill` is for. `sizePx` is the same kind of escape hatch for size — a raw px override of the `size` token, exactly as `Block.size` already is, because a hook caption is a typographic composition and the six tokens are rungs on a ladder rather than every size a line might want. Both are authored project DATA; scene components still read `fontSizes`/`colors` and must not hardcode either.

**Placing the headline.** `content.richHeadlineX`/`richHeadlineY` position the WHOLE stack as percentages of the 1080x1920 canvas addressing its centre — the same convention (and the same drag-on-preview overlay) as a Block's x/y. Both unset leaves the stack in the scene's flex column, centred in whatever band the `layout` preset's `textZone` gives it; setting either lifts it out, which is how consecutive scenes stop all putting their headline on the same line. Leaving X unset keeps the stack spanning the safe-area column, which is the right default for a headline — an X pins it to a point instead. A LINE's own `x`/`y` is the different move: both set pulls that ONE line out of the stack to its own spot (requiring both keeps "positioned" unambiguous), while the stack controls move the stack and keep it a stack. Either way the entrance clock still walks every line in author order, so freeing one line never retimes its neighbours — and because array order IS both the stack order and the entrance order, the Inspector's per-line up/down arrows move a line in both at once. Positioning lives in `RichHeadline` itself, not in the three scene components, and free lines render as SIBLINGS of the stack so their percentages always address the canvas rather than being re-resolved against a positioned stack.

Each line also takes its own `exit` (an `ExitPreset`) — unset means the line simply rides the scene's shared exit fade/slide like it always did (`SceneFrame`'s content column already animates out per `motion.exit`, so doing nothing here IS "use the scene's exit"); set means this ONE line gets an ADDITIONAL, independent exit motion layered on top of that shared one — same "layer a specific motion on top of the ambient one" pattern the old primary-visual exit used. Alongside the preset a line takes its own `exitDuration`, `exitDistance` and `exitDelay`, all falling back to the scene's `motion.*` when unset and all meaningful ONLY next to a `line.exit` — without a preset of its own the line has no separate window to size or shift, so honoring them alone would compound with the shared column exit rather than retime it. It all travels as one `ExitConfig` threaded through `AnimatedSplitText`/`AnimatedBox` (`src/video/typography/splitAnimate.tsx`). Because it's additive rather than a replacement, only override a line's exit when you deliberately want it to diverge from its neighbors — setting the SAME preset the scene already uses just compounds the curve for no visual gain.

**Syncing text exits with a carried visual.** By default the two beats are adjacent but never overlap: a line's exit occupies the last `exitDuration` frames and FINISHES on the cut, while a linked visual's glide STARTS on the cut and runs into the next scene — so the text is gone before the visual has moved, which reads as dead air (obvious on a chain that holds one icon across a title/explain pair). Two knobs close the gap from opposite sides: `richHeadline[].exitDelay` (signed frames, implemented in `splitAnimate` by pretending the scene is that much longer so `exitStyle` keeps its single "exit is anchored to the end" rule) pushes the text LATER, up to and past the cut; `link.glideLead` pulls the visual's move EARLIER, before the cut. `link.glideDuration` sizes that move. Glide timing is read from the ARRIVING member of the chain — the later scene — so each hop can be timed on its own; setting it on the first scene of a chain does nothing.

Design rule: **highlighting a word is always a pill/box (light background, dark text), never a color change** — `src/video/typography/Text.tsx`'s `renderHighlighted` and `pillInlineStyle`/`pillBlockStyle` are the only places this should be implemented.

The `browser` frame (and `recording` with `frame: "browser"`) draws real browser chrome — macOS traffic lights, a tab strip with an active tab plus optional extra tabs, and an address bar with a lock. `url`, `title` and `tabs` are editable in the Inspector for both; the active tab falls back to the URL's domain. `visualMetrics` counts that chrome (690px tall, not 620) — if the chrome's height changes again, update it or auto-fit starts lying.

Known editor gap: the Inspector has full field editing for the "simple" visual types (stat-counter, checklist, pricing-card, app-mockup, progress, keycap, image, recording) and for `browser`/`phone` (URL + a Content picker that swaps the on-screen visual, including an image or a recording) — but only a read-only summary for the remaining nested ones (flow, node-group, stack, transform), which are configured by picking a preset from the Visuals tab or editing the project JSON directly.

**Three ways to keep what you made**, because "Save" alone conflated them. `Save` writes the project back to its own library entry. `Save As…` (`saveProjectAs` in `projectStore`) mints a FRESH project id and keeps editing that copy, so branching a variant no longer overwrites the video it came from — the library is keyed by project id, which is exactly why reusing the old one would clobber it. `Save as Template…` (`src/editor/state/savedTemplatesStore.ts`) copies the whole project into the Templates tab as a reusable starting point and leaves the project you're editing alone; picking one opens it as a new project with a fresh id. The Templates tab shows **Tavo šablonai** above the built-in `scriptTemplates`, the same shape as Your Scenes below. Unlike `instantiateSavedScene`, a template does NOT re-mint scene/block/layer ids: those only have to be unique within a project, and a template produces a whole project rather than being inserted into one.

The Scenes tab has **Your Scenes** above the blank scene types (`src/editor/state/savedScenesStore.ts`): a scene can be saved with a name and dropped into any project later, copy/visual/layers/animations intact. Inserting re-mints the scene's id plus every block and layer id, and strips each layer's `link` — a carry only means something as a run of adjacent scenes, so half of one would point at a group that isn't there.

**Split timing is one number, resolved in one place.** A text element's
`splitBy` (word/letter/line) decides the unit and `splitDuration` how long the
whole animation takes, START TO FINISH: set 0.3s and the sentence goes from
nothing to fully on screen in 0.3s.

`splitTiming` (`splitAnimate.tsx`) scales BOTH halves of the effect with it —
the gap between units and each unit's own entrance, the latter taking
`UNIT_ENTRANCE_SHARE` of the total. Scaling only the gaps makes the words
overlap while each one still takes as long as it did, which reads as "the
setting does nothing"; budgeting the entrance a fixed number of frames instead
is worse still, because a short total then has nothing left to stagger with and
every word lands at once — the cascade you were speeding up disappears. As a
share, the words still arrive one after another at any speed.

Four things have to agree on the resulting numbers — the renderer, the per-unit
sfx cues, the next line's delay in the stack, and both timelines' automatic
positions — which is why `splitTiming`/`splitSpan` are exported rather than each
call site multiplying a constant by a unit count. Unset keeps the fixed per-unit
stagger, so nothing already authored changed.

The wiring is worth checking when this looks broken: `splitDuration` reaching
`RichHeadline`'s stack clock but NOT its `AnimatedSplitText` made the control
retime the OTHER lines while leaving the one you were editing untouched.

**The timeline is a view over the schema, not a component library.** Every clip
edits one named field (`delay`, `exitAt`, a keyframe's `frame`), and every row
is derived from `content.visuals`/`blocks`/`richHeadline`/`items` plus the
resolved sfx cues. Dropping in a third-party timeline (react-timeline-editor,
Twick, openvideodev) means translating that model into theirs and back on every
edit, and the ones that are full editors bring their own renderer alongside
Remotion. The behaviours worth having from CapCut — snapping, lane packing, a
visible selection, a resizable panel — are each a small amount of code against
the model we already have.

- **Selection lives in the store** (`selectedObjectId` beside `selectedSceneId`
  and `playheadFrame`), not in a `window` CustomEvent passed between the
  timeline and the Editor. That event existed only to move an id across the
  tree; with the id in the store the timeline can also DRAW the selection, which
  it could not do before — the selected clip takes the accent border, a heavier
  fill and a glow. `selectScene` clears it, since an object id addresses an
  element inside the scene that was open.
- **Every object owns its lane, and nothing re-derives it.** Each object takes
  an optional `lane`; `SceneTimeline` materializes the packed starting layout
  into the scene ONCE (one write, one undo entry), and from then on a clip moves
  when you move it and never otherwise. The previous version packed lanes from
  scratch on every render, so moving one clip re-packed the others — and
  dragging a clip sideways changed its own start time, which changed the
  packing, which threw the clip you were holding into a different row mid-drag.
  Clips jumping on their own is what an auto-layout looks like from the outside.
  Trailing empty lanes are dropped; an empty lane BETWEEN two others is kept,
  because closing the gap would shift everything below it.
- **Lanes pack, but a pin wins.** Each object takes an optional `lane` (on the
  layer, block, rich-headline line and step item): drag a clip up or down and it
  is pinned there, overlap or not, because that is the author saying "this one
  lives here". Everything unpinned is auto-packed into the first lane with room
  (`LANE_GAP_FRAMES` of clearance), so a scene with a dozen elements is a few
  lanes of clips rather than a dozen near-empty stripes. Packing stays within a
  kind, so the timeline still reads top-to-bottom as text, visuals, sound, and a
  vertical drag only moves a clip between lanes OF ITS OWN KIND. Empty lanes are
  dropped, so the indices you drag against are always 0..n-1 with no gaps.

  `lane` is PRESENTATION ONLY — it changes nothing in the render, and for a
  visual it is **not** z-order: that stays the `content.visuals[]` array index,
  edited with the Layers arrows. Keeping the two apart is deliberate; making a
  lane drag also restack the layers would be a second way to say "which is on
  top", and the two would drift.
- **The panel is resizable** from its top edge, persisted in
  `tikmaker.timelineHeight`. How much vertical space a timeline deserves depends
  on the scene, which is not something to hardcode at 250px.

**Copy, paste and asset-swap also happen in one place.**
`src/editor/timeline/objectClipboard.ts` holds the clipboard (module-level, NOT
in the project store — it is session state, and putting it there would push it
onto the undo stack). `Ctrl+C` / `Ctrl+V` / `Ctrl+D`, the right-click menu and
any button all call the same functions, with the same guard as Delete (never
while the caret is in a field, where the browser's own copy/paste is what you
want). A paste lands at the playhead with the original's length preserved,
re-mints every id (including keyframe ids) and drops `link` — a carry only means
something as a run of ADJACENT scenes sharing a groupId, so half of one pasted
elsewhere points at a group that isn't there.

`replaceVisualAsset` swaps ONLY `entry.visual`. Position, scale, effects,
keyframes, timing and sound all live on the entry, so they survive by
construction — which is the point: tune one element, then try a different image
in it. The right-click menu (`TimelineContextMenu`) reuses the Inspector's own
`buildAssetOptions`, so the swap list and the Inspector's pickers can't drift.

**Snapping.** Dragging on the preview snaps to the canvas centre, the safe-area
edges and every other element's centre; dragging a timeline clip snaps to the
scene's ends, the playhead and every other clip's start and end. Both magnets
are ~7px wide, converted from pixels so they feel the same at any zoom or
preview size, and the preview draws a guide line on the axis it caught — a snap
you can't see is indistinguishable from a drag that jumped. Landing on 50.0 with
a mouse is a coin flip; without the magnet you end up at 49.7 and the frame
reads as crooked without it being obvious why.

**Positions are clamped on load, not rejected.** `x`/`y` are 0-100 percentages,
and one value outside that range failed the whole `videoProjectSchema.parse` —
which the project library reads as "corrupt entry" and silently drops the ENTIRE
video. `clampPositions` in `parseProject` pulls them back in range first, so one
element nudged off the top edge costs you that element's position, not the
project. It happened for real: `VisualLibrary`'s new-layer fan marched each
addition 12% higher (`50 - n * 12`) until the sixth landed at `y: -10`, centred
above the frame where it could not be seen. The fan now wraps.

**Deleting a timeline object happens in one place.** `confirmDeleteTimelineObject`
(`src/editor/timeline/deleteTimelineObject.ts`) parses the selection id, names
the object for the prompt, asks, and removes it. Both the object panel's
**Pašalinti · <name>** button and the **Delete** key call exactly that — two
implementations of "what does deleting a checklist row do" is how one of them
ends up deleting the whole visual instead. The key is Delete only (never
Backspace, which is what you press to fix a typo) and never fires while the
caret is in an input/textarea/contenteditable. That guard is also why the object
panel's fields no longer `autoFocus`: with focus stolen on open, the shortcut
could never reach the handler.

Scrollbars and native controls are themed by the app's ONE global stylesheet,
`src/editor/GlobalStyles.tsx` — it reads `editorColors`, so there is no second
set of hex values to drift from the theme. Everything else in the editor is
inline styles; a scrollbar has no element to attach one to, which is the whole
reason that file exists.

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
