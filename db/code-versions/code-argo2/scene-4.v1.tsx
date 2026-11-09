import { z } from "zod";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { asset, field, RecordingSlot, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { clamp, Cursor, EASE_OUT, popScale, prog, Progress, Stage, STILL } from "./shared";

export const description =
  "Three real hook cards from TikMaker's agent panel appear one after another under the step bar; the cursor clicks the middle one, it lights orange and the others dim";

export const schema = z.object({
  hooks: field.recording(
    "The hooks card (optional)",
    "TikMaker agent panel with the three hooks to pick from: hover the three, click the second one – the panel only, 3 s",
  ),
  writesOn: field.word("Hooks appear on", "writes"),
  pickOn: field.word("Hook clicked on", "pick"),
  picked: field.number("Hook that gets picked", 2, { min: 1, max: 3 }),
});
type Params = z.infer<typeof schema>;

// The hooks still: 670 x 753. The marks give each hook's text; its card is
// that box plus the card's padding (x 0.039–0.960, 0.206 tall).
const ROW_W = 740;
const IMG_W = ROW_W / 0.921;
const IMG_H = (IMG_W * 753) / 670;
const ROW_X = 0.039;
const ROW_YS = [0.1645, 0.392, 0.6194].map((y) => y - 0.0235);
const ROW_H = 0.206 * IMG_H;
const LEFT = 145;
const TOPS = [418, 418 + ROW_H + 30, 418 + 2 * (ROW_H + 30)];

export default function Scene4({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const writesAt = wordFrame(words, params.writesOn, 22) - 3;
  const pickAt = wordFrame(words, params.pickOn, 59) - 2;
  const picked = Math.max(0, Math.min(2, Math.round(params.picked) - 1));

  if (params.hooks)
    return (
      <AbsoluteFill>
        <Progress done={[1, 1, 0, 0, 0]} active={2} frame={frame} />
        <RecordingSlot src={params.hooks} record="" width={740} height={560} style={{ position: "absolute", left: LEFT, top: 420 }} />
      </AbsoluteFill>
    );

  const chosen = prog(frame, pickAt, 8);
  const tx = LEFT + ROW_W / 2 + 40;
  const ty = TOPS[picked] + ROW_H / 2;
  const cur = interpolate(frame, [pickAt - 16, pickAt - 1], [0, 1], { ...clamp, easing: EASE_OUT });

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <Progress done={[1, 1, 0, 0, 0]} active={2} frame={frame} />
        {TOPS.map((top, i) => {
          const at = writesAt + i * 6;
          const inP = prog(frame, at, 11);
          const isPicked = i === picked;
          const op = inP * (isPicked ? 1 : interpolate(chosen, [0, 1], [1, 0.35]));
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: LEFT,
                top: top + (1 - inP) * 40,
                width: ROW_W,
                height: ROW_H,
                borderRadius: 18,
                overflow: "hidden",
                opacity: op,
                scale: `${(frame >= at ? popScale(frame, at) : 0.94) * (isPicked ? 1 + 0.03 * chosen : 1)}`,
                boxShadow: `0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)${isPicked && chosen > 0 ? `, 0 0 ${50 * chosen}px ${c.accent}77` : ""}`,
              }}
            >
              <Img
                src={asset(STILL.hooks)}
                style={{ position: "absolute", left: -ROW_X * IMG_W, top: -ROW_YS[i] * IMG_H, width: IMG_W, height: IMG_H }}
              />
              {isPicked && (
                <div style={{ position: "absolute", inset: 0, borderRadius: 18, border: `5px solid ${c.accent}`, opacity: chosen }} />
              )}
            </div>
          );
        })}
        <Cursor x={interpolate(cur, [0, 1], [tx + 200, tx])} y={interpolate(cur, [0, 1], [ty + 260, ty])} frame={frame} clickAt={pickAt} opacity={cur} />
      </Stage>
    </AbsoluteFill>
  );
}
