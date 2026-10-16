# Build in public 1: I stopped letting AI design my videos

**Main idea:** AI makes bad videos not because it has bad taste, but because
it is allowed to place every pixel. Take that away (let it fill in a form of
tested scenes instead) and quality stops depending on luck.

**Who is it for:** people who make content (or want to) and people who build
with AI. The same lesson as trap 1/3, applied to video: consistency is
architecture, not style.

**What it tests:** does anyone want the tool itself? Count comments like
"what app is this?", "can I use it?", and replies to the CTA.

Legend: **REC** = you record it · **MOTION** = I build it in TikMaker ·
**ASSET** = a missing asset you generate.

| # | Time | VO (English) | Visual | Source |
|---|---|---|---|---|
| 1 | 0–3 s | Every video on this account is made with AI. The first ones looked like this. | One of your early broken renders: a headline cut off by TikTok's side buttons, a cut that lands mid-sentence. Hook text: **MADE WITH AI. AT FIRST: THIS.** | REC R1 |
| 2 | 3–8 s | The AI's taste wasn't the problem. I let it place every pixel. | `code-diff`: a scene component full of hardcoded `fontSize: 73`, `top: 1412`, `duration: 2.1`. Each number gets a highlight. | MOTION |
| 3 | 8–13 s | It doesn't know TikTok covers the edges, or how long you need to read a line. | The same broken frame from #1, now with the TikTok side UI zones highlighted in orange and the text sitting under them. | REC R1 + MOTION highlights |
| 4 | 13–18 s | So every video was a brand-new design, and every one needed fixing by hand. | `grid` of 4 early frames, each broken in a different way (overflow, tiny text, clashing layouts, wrong timing). | REC R2 (screenshots OK) |
| 5a | 18–22 s | So I stopped letting it design. Now it just fills in a form. | `transform`: the messy component from #2 turns into a short project JSON (`"type": "hook-centered"`, `"vo": "..."`, `"layout": "visual-top"`). | MOTION |
| 5b | 22–27 s | Scenes, margins and timing are built once. A scene is as long as its voiceover. | Editor recording: you switch a scene's layout preset and the visual re-fits inside the safe margins; then you edit the VO line and the scene's length changes on the timeline. | REC R3 |
| 6 | 27–33 s | I give Claude a topic, it writes the scenes, and I only record what it can't show. | Claude CLI mock: the prompt "make a video about forms in AI apps", then the project file appearing. Then the editor's Player playing that project. | MOTION + REC R4 |
| 7 | 33–38 s | Same topic, before and after. | THE MAIN SHOT: `transform` (or split) of the same frame: early broken version vs the current TikMaker version. | REC R1 + REC R5 |
| 8 | 38–43 s | Want to make your own videos with it? Comment "video". Next: how the AI writes the script. | Short text + teaser for #2. | MOTION |

On-screen text: only the hook (#1), captions throughout, and the teaser (#8).

## What you record

- **R1** (#1, #3, #7): ONE early render that is clearly broken: text under
  the side buttons, or a cut before you can read. 3–4 s. If you have no old
  render, re-create it quickly: ask Claude for a plain Remotion scene with no
  design system and render one frame.
- **R2** (#4): 4 screenshots of early frames, each broken in a different way.
  Screenshots are enough.
- **R3** (#5b): the editor, ~5 s: change `layout` (e.g. visual-bottom →
  visual-top) and the visual re-fits; then edit the VO and the scene length
  moves on the timeline. Zoom in on the timeline if it is small.
- **R4** (#6): the editor's Player playing a finished project, 3–4 s.
- **R5** (#7): the same frame as R1, but from the current TikMaker version of
  that video. Must be framed exactly like R1 so the before/after lines up.

## Before posting, decide

- **The CTA.** "Comment 'video'" only works if you reply to those comments
  (with the waitlist link, or a DM). If you don't have a waitlist page yet,
  set one up first, even a simple form.
- **Is "made with AI" true for this account?** The hook claims it. If some
  videos were edited by hand, say "built with AI" instead.

## Status

Script only. Next step: build `db/projects/bip-01-ai-fills-a-form.json`.
