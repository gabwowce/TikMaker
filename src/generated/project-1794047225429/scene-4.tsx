import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Bar, bounceIn, cardStyle, CheckMark, clamp, EASE_IN, GREY, GREY_HI, lerpPt, prog, Rail, railPoint, Stage, Token } from "./shared";

export const description =
  "The token drops from the rail and unrolls into a script card; scene rows stack up one by one, the orange Approve button is pressed with a check and the card flies up to tick step 3";

export const schema = z.object({
  button: field.text("Button", "Approve"),
  rows: field.number("Script rows", 5, { min: 3, max: 6 }),
  rowsOn: field.word("Rows start on", "script"),
  approveOn: field.word("Approve pressed on", "Approve"),
});
type Params = z.infer<typeof schema>;

const CARD = { x: 170, y: 370, w: 740, h: 670 };
const ROW_H = 78;

export default function Scene4({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const n = Math.round(params.rows);
  const rowsAt = wordFrame(words, params.rowsOn, 33) - 2;
  const approveAt = wordFrame(words, params.approveOn, 86) - 2;

  // token: dot 2 → dot 3, then down; the card unrolls from it
  const slide = prog(frame, 0, 10);
  const drop = prog(frame, 10, 10, EASE_IN);
  const tokenP = lerpPt(lerpPt(railPoint(1), railPoint(2), slide), { x: 540, y: CARD.y + 40 }, drop);
  const unroll = prog(frame, 20, 14);
  const rowStep = Math.max(4, Math.min(7, (approveAt - 14 - rowsAt) / n));

  const btnHot = interpolate(frame, [approveAt - 10, approveAt - 4], [0, 1], clamp);
  const press = interpolate(frame, [approveAt, approveAt + 3, approveAt + 9], [1, 0.9, 1], clamp);
  const check = bounceIn(frame, approveAt + 3, 9);

  // the approved card clicks up into the rail
  const backAt = Math.min(approveAt + 14, durationInFrames - 18);
  const back = prog(frame, backAt, 11, EASE_IN);
  const tickAt = backAt + 11;
  const tick = prog(frame, tickAt, 7);
  const target = railPoint(2);
  const cx = CARD.x + CARD.w / 2;
  const cy = CARD.y + CARD.h / 2;

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <Rail morph={1} done={2} active={2} tick={tick} />

        {frame < 24 ? <Token p={tokenP} /> : null}

        {unroll > 0 ? (
          <div
            style={{
              position: "absolute",
              left: CARD.x,
              top: CARD.y,
              width: CARD.w,
              height: CARD.h * unroll,
              ...cardStyle(CARD.w),
              overflow: "hidden",
              opacity: 1 - back,
              translate: `${(target.x - cx) * back}px ${(target.y - cy) * back}px`,
              scale: `${1 - 0.9 * back}`,
            }}
          >
            {Array.from({ length: n }).map((_, i) => {
              const at = rowsAt + i * rowStep;
              const s = prog(frame, at, 9);
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: 50,
                    top: 46 + i * ROW_H,
                    display: "flex",
                    alignItems: "center",
                    gap: 26,
                    opacity: s,
                    translate: `0px ${(1 - s) * 30}px`,
                  }}
                >
                  <div style={{ width: 54, height: 54, borderRadius: 14, background: GREY_HI }} />
                  <Bar w={[420, 340, 470, 300, 390, 360][i % 6]} h={26} color={GREY} />
                </div>
              );
            })}
            {/* Approve */}
            <div
              style={{
                position: "absolute",
                left: (CARD.w - 480) / 2,
                top: CARD.h - 170,
                width: 480,
                height: 120,
                borderRadius: 30,
                background: btnHot > 0.5 ? c.accent : GREY_HI,
                opacity: interpolate(btnHot, [0, 1], [0.5, 1]),
                boxShadow: btnHot > 0.5 ? `0 0 50px ${c.accent}88` : undefined,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 18,
                scale: `${press}`,
              }}
            >
              {check > 0.01 ? (
                <div style={{ scale: `${check}`, marginLeft: -10 }}>
                  <CheckMark size={64} color={c.bg} stroke={0.2} />
                </div>
              ) : null}
              <span style={{ fontFamily: c.fontStrong, fontSize: 64 * c.widthFactor, color: btnHot > 0.5 ? c.bg : c.text, paddingTop: 6 }}>
                {params.button}
              </span>
            </div>
          </div>
        ) : null}
      </Stage>
    </AbsoluteFill>
  );
}
