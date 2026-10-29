# Notes on the knowledge-base draft

The judgement calls (grouping, names, scene order, purposes, slots, formula
wording) are in `proposal.json`. `npm run knowledge:draft` computes the rest
from docs/bd/analizes/ and writes `shared/` plus `build-report.md`, which lists
every scene it dropped and every formula it left out. These notes were written
with the first proposal; where they describe how a number was filled, the
script and the report are the current truth (see "How the fields were filled").

## Analyses that are in no template

Each of these has no 2 others with the same shape, so a template would rest
on fewer than 3 analyses:

- DEAlXN7rciM (facts, Messi vs Ronaldo trophies): a silent side-by-side
  comparison that adds items up to a climax. Not a ranking, not a fact list.
- yn2bjNiy4a0 (explainer, gasoline vs diesel, 6 s): one mechanism scene, no
  hook scene. Same idea as DEAlXN7rciM (a silent A-vs-B), but a different
  format. With a third such video, an "A vs B side by side" template would be
  possible.
- G92WG-qwFvQ (format "other", GTA water physics across years): the only
  analysis whose format is not an allowed word.
- SMdcwr1VgWQ (demo, 2 free iPad apps): the same shape as the facts template
  `app-list`, but the analysis labels it "demo". I did not move it into a facts
  template.
- fgJdRiPct60 (story, how a painkiller works, told by characters): the
  closest match is `analogy-explainer`, but that one is explainer format.

All five still feed the hook and title formulas.

## Words that did not fit

- format "other" (G92WG-qwFvQ): its hook formula `same-thing-across-years` and
  title formula `subject-evolution` are in proposal.json, but the script drops
  them because no allowed format can go in `fits` (an earlier draft guessed
  "facts"). Decide its format in C3 to bring them back.
- ctaType "other": left out of cta-formulas.json and of template ctaTypes:
  - XT4y1fGB6CE "Subscribe": reads like `follow`, but the analysis said
    "other", so I did not reclassify it.
  - XgM2_m2I6sE "Try CreateStudio today": a product call to action.
  - evXxJa0DsAA "Just send me a message and let's get started.": a direct
    message to hire a service.
  - vTVJJ06rcDg "GET IT ON Google Play": an app-store badge.
  The last three suggest that a "try / get the product" CTA word may be
  missing from the vocabulary.
- connection "other" (3 beats): its transition phrases were dropped.
- connection "none": no transition phrases exist, so it has no entry.
- `actsSummary` in the data still contains the role "other" (e.g.
  -7eQdRhsCpA) even though the beats themselves have an allowed role. I read
  the roles from `beats`, not from `actsSummary`.
- hookType `pov` and ctaType `next-part` never appear in the data, so no
  formula uses them.

## Titles

10 analyses have no `title` (only a `titleFormula`): Bd-wV1nGrd0,
BmezElWWNU0, EmxXYzX6iEs, FX8eD_qN_qU, GndFJU8kYeY, HTRuojtV0pw, LRoevZc_LJk,
MBAwGQTOOe4, evXxJa0DsAA, nELGzUrsQko. Examples must be real text, so these
produced no title formula. Some existing titles look like they were written
by the analysis rather than taken from the platform (e.g. "Artinals Protocol
Promo", "Sber App Promo"). They are kept, because they are in the data.

## How the fields were filled (and what to double-check)

- **Which scenes stay** (script): a scene stays when its role is in at least
  half of the template's analyses. The first draft kept every role any
  analysis used, which made 142 of 194 scenes optional; the dropped ones are
  listed in `build-report.md`. `hook` and `cta` are never dropped, only marked
  optional: the agent decides per video whether it needs them, and needs the
  template's scene to add one later without rebuilding the video. The
  proposal got a closing `cta` scene for `analogy-explainer` and `plot-recap`,
  which had none.
- **Scene `seconds`** (script) = p10 to p90 of that role's beats in THIS
  template's analyses, not across all 88, so a list item in a facts template
  and an item in a story no longer share one 1.1–11 s range.
- **Template `seconds`** (script) = shortest to longest duration of the videos
  it is based on. Some are wide because one long video stretches them:
  `plot-recap` 48 to 181 s (nELGzUrsQko) and `new-tool-news` 30 to 107 s
  (g3Mh8Hws-jo).
- **`optional`** (script): the role is missing from at least one of the
  template's analyses. When the same role appears in two acts of one template
  (e.g. setup in opening and in build), both get the same flag.
- **`repeatable`** (script): the role appears twice or more in at least half
  of the analyses that have it.
- **format "other"** (G92WG-qwFvQ): its hook and title formulas are dropped by
  the script, since no allowed format can be put in `fits`. Reclassifying the
  analysis's format would bring them back.
- **`hookTypes` / `ctaTypes`** of a template are exactly the types of its
  based-on analyses ("other" removed; "none" kept where a video had no CTA).
- **Act placement** is my judgement. The data does not always keep roles in
  the same act. For example, 0JZtdAtJiyk alternates build[item] and
  core[mechanism] three times; `tool-tips-keyword` shows this as core: item,
  then mechanism, both repeatable. Several videos open with `setup` instead
  of `hook` (GndFJU8kYeY, fjet5EE2iBI, ilDOvMsxMws, _yr-VNLW9nU), so some
  templates list both hook and setup in the opening act.
- **Connections** on a template scene are the most common `connectionToNext`
  for that role in its videos, picked by reading them rather than counted by
  a script.
- **Slots**: "fixed" = facts from the user's idea (tool name, numbers, steps,
  screen recordings, evidence); "creative" = wording the agent may propose
  (teasers, bridge lines, closing lines, CTA wording). A screen recording is
  fixed because it must show the real thing.
- **Hook examples** use the hook's voiceover when there is one, otherwise its
  on-screen text. Visual-first hooks have no words, so their examples are the
  on-screen labels (e.g. "MESSI RONALDO", "Пополняйте") and their formulas
  describe the picture.
- **Merged hooks** (true duplicates only): 7c-vPPWaRdw + vFVv_-gcW50,
  8Qxqi4hDTnk + PYV4cGkwwLk + ZbMXwVVBdmM, MYWpaNYAo0o + mytYzlemg-s,
  incL6fhurqk + xpTmAbqAuMY, A4gshIyrNNU + cBr5ea6LRNE ("In [year or era],
  [subject] [did something]"), DEAlXN7rciM + yn2bjNiy4a0,
  n8JpwbyxmHM + vTVJJ06rcDg. 0Mz2fqwCb-8 and J9yGsD4FZq4 have the same
  wording but different hook types (curiosity-gap vs shock-fact), so they are
  two entries.
- **Hindi videos** (x7iYFWYxmbQ, zIdkkPSldcs, Rthn9xKsr2M): their hook, CTA
  and title examples are kept in the original language (Hinglish or
  Devanagari), as they appear in the data.
- **Transition phrases** were picked from the data and checked against it
  word for word. Pure fragments that do not work as transitions were dropped
  ("by", "and", "or", "run", "about", "Liquidity", "These fibers"), as were
  plot-specific sentences ("Odysseus has to drag them", "Inhaled cocaine can
  reach"). A few Hinglish connectors (Lekin, Phir, Uske baad, Kyunki, Aur
  sabse khatarnak baat) were kept.
- `single-fact` has only optional scenes in its build and climax acts: its 3
  videos reach the fact in different ways (reveal vs payoff, with or without
  a mechanism). That is accurate, but it gives the agent little to rely on.
