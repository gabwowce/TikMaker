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

## Current scope

Scenes (`src/registries/sceneRegistry.ts`): hook-centered, hook-visual, visual-explainer, screen-demo, takeaway, comparison, steps.

Visual primitives (`src/registries/visualTemplateRegistry.ts` for the insertable presets; full type list in `src/schema/visual.ts`):
- assets: tool-logo, tool-flow, prop
- media/devices: image, recording (browser/phone/none frame), browser, phone
- data: stat-counter, checklist, pricing-card, app-mockup (list/stat/chart), progress
- diagrams: flow (labeled nodes + animated connector), node-group (orbit/radial/one-to-many), stack (staggered pile), transform (crossfade reveal)

Backgrounds: solid-dark, soft-grid, orange-glow, spotlight.
Motion: `motion.entrance` (fade/slideUp/slideDown/slideLeft/slideRight/scaleIn/pop) controls how badge/eyebrow/headline/visual/body come in, staggered by `motion.stagger` frames apart — it does NOT apply to Rich Headline lines or Blocks, which carry their own per-line/per-block `animation`. `motion.exit` (fade/slideUp/slideDown/slideLeft/slideRight/scaleOut, optional — unset = hard cut) animates the whole scene's content out together in the last `motion.exitDuration` frames (default 18) before the scene ends; implemented in `src/video/motion/exits.ts` + `useSceneExitStyle` in `src/video/scenes/EnterOnCue.tsx`, applied by merging its style into each scene's content `AbsoluteFill`. `motion.transition` (cut/push) is the cut between scenes, separate from a scene's own exit.

`content.blocks` (optional, any scene type) is a freeform layer of independently positioned/styled/animated text or badge elements — `x`/`y` are percentages of the full 1080×1920 canvas (not the safe area), each block has its own `size` (px), `color` (hex), `letterSpacing`, `font`, `animation`+`splitBy`, and `delay`. Rendered by `src/video/typography/BlockLayer.tsx`.

`content.visuals` (optional, any scene type) is the same idea as `content.blocks` but for images/icons instead of text — a freeform array of `{id, visual, x, y, scale, entrance, exit, exitDuration, delay}`, rendered by `src/video/typography/VisualsLayer.tsx` on top of the scene's own primary `visual`. Each entry has its own independent in/out animation via `AnimatedVisual` (`src/video/typography/AnimatedVisual.tsx`), which also backs `PositionedVisual` (the primary visual's optional custom position) — do not duplicate that entrance/exit math a third time.

The scene's own primary `visual` also supports `visualPosition` (`{x, y}`, opts out of the default centered flex layout) and independent `visualEntrance`/`visualExit`/`visualExitDuration` (fall back to `motion.entrance` / no-exit when unset) — so a video's main graphic never has to share the group's timing if it shouldn't.

In the editor, every one of these (blocks, positioned visuals, the primary visual's custom position) can be repositioned either via the Inspector's x/y sliders or by **dragging the marker directly on the Player preview** (`src/editor/BlockPositionOverlay.tsx`) — prefer keeping that overlay in sync with the schema if any of these shapes change.
Scene content also supports: `badge`, `highlights` (words wrapped in a contrast pill box in the headline — never color, per design rule below), and — only on `comparison`/`steps` — `left`/`right`/`items`.

`content.richHeadline` (optional, `hook-centered`/`hook-visual`/`takeaway` only) is a stack of independently-styled lines — each with its own `size` (hero/headline/title/bodyLarge/body/label token), `font` (tanker/clash), optional `pill` box, and its own entrance `animation`/`splitBy` (word/letter/line) — for CapCut-style multi-size hook captions. When present it replaces the plain `headline` for that scene; see `showcase-hook-centered` in `projects/template-showcase.json` for a worked example. Word/letter-level animation reuses the same 4 entrance presets (fade/slideUp/scaleIn/pop) — do not add a separate animation registry for this.

Design rule: **highlighting a word is always a pill/box (light background, dark text), never a color change** — `src/video/typography/Text.tsx`'s `renderHighlighted` and `pillInlineStyle`/`pillBlockStyle` are the only places this should be implemented.

Known editor gap: the Inspector has full field editing for the "simple" visual types (stat-counter, checklist, pricing-card, app-mockup, progress) but only a read-only summary for compound/nested ones (flow, node-group, stack, transform, browser, phone) — those are configured by picking a preset from the Visuals tab or editing the project JSON directly.

Deferred to later phases (do not build unless asked): terminal/code-editor/chat window mockups, dot-grid/gradient-mesh backgrounds, QA contact-sheet renderer, text-overflow validation warnings, recording focus-zoom system, drag-and-drop scene reordering, nested-node Inspector editing for compound visuals.
