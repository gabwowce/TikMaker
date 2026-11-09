import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, RecordingSlot, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Bar, cardStyle, clamp, Cursor, EASE_OUT, GREY, mix, popScale, prog, Progress, Stage } from "./shared";

export const description =
  "Three grey hook cards land one by one under the step bar; the cursor clicks the middle one, it turns orange, grows wide and shows one hook in big type while the others dim";

export const schema = z.object({
  hooks: field.recording(
    "The hooks card (optional)",
    "TikMaker agent panel with the three hooks to pick from: hover the three, click the second one – the panel only, 3 s",
  ),
  hook: field.text("The picked hook", "Re-cloned the whole repo?"),
  writesOn: field.word("Hooks appear on", "writes"),
  pickOn: field.word("Hook clicked on", "pick"),
  picked: field.number("Hook that gets picked", 2, { min: 1, max: 3 }),
});
type Params = z.infer<typeof schema>;

// Three cards under the step bar; the picked one grows to the full safe width.
const CX = 515;
const W0 = 680;
const W1 = 760;
const H0 = 150;
const H1 = 220;
const GAP = 60;
const TOP0 = 430;
const CENTERS = [0, 1, 2].map((i) => TOP0 + i * (H0 + GAP) + H0 / 2);

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
        <RecordingSlot src={params.hooks} record="" width={740} height={560} style={{ position: "absolute", left: 145, top: 420 }} />
      </AbsoluteFill>
    );

  const chosen = prog(frame, pickAt, 12);
  const textIn = prog(frame, pickAt + 4, 10);
  const tx = CX + 150;
  const ty = CENTERS[picked];
  const cur = interpolate(frame, [pickAt - 16, pickAt - 1], [0, 1], { ...clamp, easing: EASE_OUT });
  const curOut = interpolate(frame, [pickAt + 8, pickAt + 16], [1, 0], clamp);

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <Progress done={[1, 1, 0, 0, 0]} active={2} frame={frame} />
        {CENTERS.map((cy, i) => {
          const at = writesAt + i * 8;
          const inP = prog(frame, at, 12);
          const isPicked = i === picked;
          const w = isPicked ? mix(W0, W1, chosen) : W0;
          const h = isPicked ? mix(H0, H1, chosen) : H0;
          // The neighbours make room and dim.
          const away = isPicked ? 0 : Math.sign(i - picked) * 20 * chosen;
          const scale = (frame >= at ? popScale(frame, at) : 0.94) * (isPicked ? 1 : mix(1, 0.92, chosen));
          const op = inP * (isPicked ? 1 : mix(1, 0.35, chosen));
          const top = cy + away - h / 2 + (1 - inP) * 40;
          return (
            <div
              key={i}
              style={{
                ...cardStyle(w),
                position: "absolute",
                left: CX - w / 2,
                top,
                width: w,
                height: h,
                opacity: op,
                scale: `${scale}`,
                background: isPicked && chosen > 0 ? `color-mix(in srgb, ${c.accent} ${chosen * 100}%, #1c1e23)` : "#1c1e23",
                boxShadow: `0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)${isPicked && chosen > 0 ? `, 0 0 ${70 * chosen}px ${c.accent}66` : ""}`,
              }}
            >
              {/* the hook as grey bars (fades out on the picked card) */}
              <div
                style={{
                  position: "absolute",
                  left: 44,
                  top: H0 / 2 - 37,
                  display: "flex",
                  flexDirection: "column",
                  gap: 26,
                  opacity: isPicked ? 1 - chosen : 1,
                }}
              >
                <Bar w={W0 * [0.74, 0.8, 0.68][i]} h={24} color={GREY} />
                <Bar w={W0 * [0.46, 0.38, 0.52][i]} h={24} color={GREY} />
              </div>
              {isPicked && textIn > 0 && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    padding: "0 48px",
                    display: "flex",
                    alignItems: "center",
                    fontFamily: c.fontStrong,
                    fontSize: 58,
                    lineHeight: 1.12,
                    color: "#fff",
                    opacity: textIn,
                    translate: `0px ${(1 - textIn) * 14}px`,
                  }}
                >
                  {params.hook}
                </div>
              )}
            </div>
          );
        })}
        <Cursor
          x={interpolate(cur, [0, 1], [tx + 200, tx])}
          y={interpolate(cur, [0, 1], [ty + 260, ty])}
          frame={frame}
          clickAt={pickAt}
          opacity={cur * curOut}
        />
      </Stage>
    </AbsoluteFill>
  );
}
