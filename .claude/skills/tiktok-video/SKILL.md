---
name: tiktok-video
description: Plan and build a TikTok video in TikMaker — one problem per video, shown rather than written. Use when the user asks for a new video, the next video in a series, "sugeneruok video", or ideas for the next posts.
---

# Making a TikTok video in TikMaker

The standard is `content/scripts/vibe-trap-01-forms.md` and its project
`db/projects/vibe-trap-01-forms.json`. Read both before starting. Generic
listicles ("5 commands you need") were tried and rejected as shallow — don't
make them.

## What makes a video good enough to post

- **One problem per video**, with a real insight: WHY it happens (a mechanism
  the viewer didn't know), what it COSTS, one concrete FIX, and PROOF.
- **Show, don't write.** On-screen text is only the hook, the VO-synced
  captions (automatic) and the teaser at the end. Every VO phrase gets a
  visual that shows it.
- **Real pains** from the user's own experience beat generic advice. Ask
  if unsure what actually hurt; the forms/comboboxes pain is the model.

## Structure (~35–45 s)

hook: the pain, shown (0–3 s) → why it happens (reframe) → the mechanism →
the cost → the fix (pattern, then rule) → the fix in action → proof
(before/after, same view) → teaser for the next part + follow.
Series ("Vibe coding trap 1/3") — the teaser is the CTA.

## Who makes which shot

- **MOTION** — you build it in TikMaker from existing visuals: `claude-cli`,
  `terminal`, `code-diff`, `checkpoint`, `stack`, `grid`, `transform`,
  `stat-counter`, props/logos. Default for mechanism/cost/fix shots.
- **REC** — the user records it. Use it where showing the real thing is
  what convinces (the pain in a real app, the proof). Put a placeholder:
  `{ "type": "screen", "content": { "type": "checkpoint", "label": "REC R1 · …", "detail": "what to record", "state": "pending" } }`.
  The user swaps it with the layer's Import… button; position, scale,
  zoom keyframes and `highlight` layers on top survive the swap.
- **ASSET** — a prop/logo that doesn't exist (`src/registries/assets.generated.ts`).
  Name it; the user generates it and drops it into `props/`.
- Don't build mock apps or long HTML demos to avoid a recording — the user
  prefers recording over spending tokens on fakes.

## Steps

1. **Topic.** Mix: 50% `claude-code`, 25% `vibe-coding`, 25% AI news. For
   news, search the web for releases from the last 48 hours and pick one you
   can SHOW. Check `content/log.md` so nothing repeats. For anything on screen
   about Claude Code, verify it against the current docs (the
   `claude-code-guide` agent).
2. **Script** → `content/scripts/<slug>.md`: the insight in one sentence,
   then a table `# | time | VO | visual | REC/MOTION/ASSET`, then the exact
   recording list (what, how long, framing) and missing assets.
3. **Project** → `db/projects/<slug>.json`, following CLAUDE.md (every scene
   has `vo`, no `durationSeconds`; layers with explicit `scale` stay inside
   the 130px side margins; `hook-centered` with no headline for pure-visual
   scenes). Use `highlight` layers (they draw on at their own `delay`,
   scene frames) to point at the part of a recording that matters, and
   `keyframes` for a slow push-in on a recording. Keep visuals in the
   26–62% band: captions sit at y≈70.
4. **Check:** `npm run video:check -- db/projects/<slug>.json` — fix every ⚠.
   Then render a few stills (`npx remotion still TikTokVideo out.png
   --props=<{project}> --frame=N --scale=0.35`) and look at them.
5. **Log** a row in `content/log.md` (status `waiting for recordings` or
   `ready`) and hand off: the recording list, and "generate voiceover per
   scene in the editor — captions appear from it automatically".
