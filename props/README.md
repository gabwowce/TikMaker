# Props

3D objects that orbit behind the type. Each shot gets the object that matches
what is actually being said — a wallet under "earn nothing", a clock under
"tonight" — instead of the same decoration everywhere.

## Where they go

Drop the PNGs straight into this folder using the exact filenames below.
Nothing else needs to change: `content.ts` refers to them by name.

## Shared rules

- **PNG with real transparency**, 1200 × 1200
- Object fills **~80%** of the frame, centred
- **One object per file.** No text, no logos, no background
- **No baked shadow** — shadows and glow are added in code so they track the motion
- **Light objects only.** Anything dark disappears against `#1C1C1C`
- **Light from the upper left in every single file**, or the set will look borrowed
  from three different places

## Palette

Mostly white, light grey and chrome. Only three objects carry the orange
accent (`#FF7A2F`): `target`, `pricetag`, `clock`. Keeping the rest neutral is
what stops the frame turning into a toy box.

## The prompt

Paste this and swap the bracket:

```
3D rendered [OBJECT], isolated on transparent background, soft studio lighting
from upper left, glossy white and light grey materials, subtle chrome edges,
no shadow, no text, centered, product render style, high detail, square 1:1
```

## The thirteen

| file | `[OBJECT]` | used on |
|---|---|---|
| `coin.png` | a single thick coin standing on edge, brushed silver with a warm bronze rim | hook, "pay you", "name one price" |
| `wallet.png` | an open empty wallet, pale grey leather | "and earn nothing" |
| `question.png` | a bold question mark symbol, glossy white | "which tool is best?" |
| `uturn.png` | a thick U-turn arrow curving back on itself, glossy white | "and work back" |
| `pin.png` | a map location pin, glossy white with a chrome base | "find who already pays" |
| `shop.png` | a small shop storefront with an awning, white and light grey | "find who already pays" |
| `target.png` | a target board with one dart in the bullseye, white rings, **orange** centre | "pick one small job" |
| `document.png` | a single sheet of paper with faint printed lines, softly curled corner | "make one free sample" |
| `pen.png` | a slim fountain pen, white body with chrome trim | "make one free sample" |
| `plane.png` | a folded paper plane, crisp white paper | "send it to ten people" |
| `envelope.png` | a closed envelope, white paper with a chrome seal | "send it to ten people" |
| `pricetag.png` | a price tag with a string loop, **orange** tag, chrome eyelet | "name one price" |
| `clock.png` | a round alarm clock with two bells, white face, **orange** hands | "tonight, 20 minutes" |

## Not used on the step bodies

Steps 1–5 already carry a full-screen visual (checklist, funnel, document,
message thread, offer card). Those shots stay clean — a second moving object
there is noise, not decoration.
