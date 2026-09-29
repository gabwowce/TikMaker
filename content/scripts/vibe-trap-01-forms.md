# Vibe coding trap 1/3: every form is a different app

**Main idea:** consistency is not about style. It is about architecture. AI
doesn't forget your design; it never saw it.

**Who is it for:** people who have built at least one app with AI and felt
"why does this screen look different again".

Legend: **REC** = you record it · **MOTION** = I build it in TikMaker ·
**ASSET** = a missing asset you generate.

| # | Time | VO (English) | Visual | Source |
|---|---|---|---|---|
| 1 | 0–3 s | Your AI-built app has five different versions of the same form. | 2x2 grid of real forms, each with a different combobox+input combo. The mismatched parts get highlighted one by one. Hook text: **SAME FORM. 5 VERSIONS.** | REC (screenshots OK) + MOTION highlights |
| 2 | 3–8 s | It's not that the AI forgets your design. It never saw it. | Claude CLI: the prompt comes in and reads `NewProjectForm.tsx`. The `components/forms/` folder next to it stays greyed out as "not read". | MOTION |
| 3 | 8–13 s | So every prompt, it rebuilds the form from scratch, from the average of the internet. | Three code snippets appear one after another: three different Combobox implementations (library A, library B, a hand-written `<select>`). | MOTION |
| 4 | 13–19 s | That's the real cost: fix a bug in one form, and four others still have it. | Five form cards: one turns green "fixed", four stay red with a bug. | MOTION |
| 5a | 19–23 s | So build the pattern once: one form field, one combobox, one dialog. | A `components/forms/` folder with three files appears. | MOTION |
| 5b | 23–27 s | And write it down in CLAUDE.md, so Claude never builds a second one. | Your real CLAUDE.md, the "Never write these a second time" table; a slow scroll with a zoom on one row. | REC |
| 6 | 26–32 s | Already have a mess? Ask Claude to move every form onto the shared combobox. | Claude Code runs that prompt: a mock is already built; a real recording is optional. | MOTION (REC optional) |
| 7 | 32–38 s | Now change one file, and every form in the app changes with it. | THE MAIN SHOT: you change the shared FormField style, and all forms update in the grid. | REC |
| 8 | 38–41 s | Trap two: the AI moves faster than you can test. Follow so you don't miss it. | Short text + teaser for #2. | MOTION |

On-screen text: only the hook (#1), captions throughout, and the teaser (#8).

## What you record

- **R1** (#1): 4–5 forms from one project where comboboxes, inputs and
  dialogs look different. Screenshots are enough. If TikMaker's editor had
  this problem before the Mantine migration (commit `332376b`), those old
  screens are the most honest material you could have: "my own app had it".
- **R2** (#5): your CLAUDE.md, the "Never write these a second time" table,
  ~5 s scroll.
- **R3** (#6, optional): Claude Code running the unify prompt, 10–15 s. The video works without it (there's a mock).
- **R4** (#7): the edit of the shared component, then 2–4 forms after it.
  Ideally a split screen: code on the left, forms on the right.

## Status

Built in `db/projects/vibe-trap-01-forms.json` (~43 s). Captions, the highlight
boxes and the grid work. What's missing:
1. Recordings R1, R2, R4 (and R3 if you want it). Select the layer, press
   Import… in its card, and the recording or screenshot replaces the placeholder.
   After importing screenshots in the hook, move each orange box onto the
   mismatched part (drag on the preview).
2. Generate the voiceover for each scene (Content tab → Generate voiceover).
   The captions appear automatically.
3. `npm run video:check -- db/projects/vibe-trap-01-forms.json` → Render MP4.
