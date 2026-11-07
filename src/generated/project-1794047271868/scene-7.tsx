import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Bar,
  CheckMark,
  DARK,
  EASE_INOUT,
  GREY,
  GREY_HI,
  LIGHT,
  Pipeline,
  Stage,
  TOP_Y,
  alpha,
  bounce,
  cardStyle,
  clamp,
  mix,
  popScale,
  prog,
} from "./shared";

export const description =
  "Under the lit scenes station a code window turns out four vertical frames one by one, then a check stamps onto each frame in turn";

export const schema = z.object({
  frames: field.number("Frames", 4, { min: 3, max: 4 }),
  drawOn: field.word("Frames start on", "draws"),
  drawnBy: field.word("Frames done by", "code"),
  checkOn: field.word("Checks start on", "checks"),
});
type Params = z.infer<typeof schema>;

const WIN = { x: 250, y: 450, w: 580, h: 230 };
const FW = 170;
const FH = 302;
const FGAP = 40;
const FY = 750;

// One vertical frame: a flat shape, a bar, a caption pill.
function MiniFrame({ k, hot }: { k: number; hot: number }) {
  const c = useBrand();
  const shape = k % 3;
  return (
    <div
      style={{
        width: FW,
        height: FH,
        borderRadius: 22,
        background: "#23232a",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.35), 0 18px 40px rgba(0,0,0,0.45)",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: FW * 0.27,
          top: FH * 0.18,
          width: FW * 0.46,
          height: shape === 2 ? FW * 0.32 : FW * 0.46,
          borderRadius: shape === 0 ? FW : FW * 0.1,
          background: GREY_HI,
        }}
      />
      <Bar w={FW * 0.6} h={14} color={GREY} style={{ position: "absolute", left: FW * 0.2, top: FH * 0.55 }} />
      <div style={{ position: "absolute", left: FW * 0.15, top: FH * 0.7, width: FW * 0.7, height: 26, borderRadius: 7, background: c.text, opacity: 0.7 }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 22, border: `4px solid ${alpha(c.accent, hot)}`, opacity: hot > 0.01 ? 1 : 0 }} />
    </div>
  );
}

export default function Scene7({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const n = Math.min(4, Math.max(3, Math.round(params.frames)));
  const drawAt = wordFrame(words, params.drawOn, 9) - 2;
  const drawnBy = Math.max(drawAt + n * 5, wordFrame(words, params.drawnBy, 38));
  const step = (drawnBy - drawAt) / n;
  const checkAt = Math.max(drawnBy + 6, wordFrame(words, params.checkOn, 52) - 2);
  const checkStep = Math.max(4, Math.min(7, (durationInFrames - 12 - checkAt) / n));
  const total = n * FW + (n - 1) * FGAP;
  const winDim = interpolate(frame, [checkAt - 4, checkAt + 4], [1, 0.4], clamp);
  const writing = frame >= drawAt && frame < drawnBy;
  const row = Math.max(0, Math.floor((frame - drawAt) / step)) % 4;

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <Pipeline y={TOP_Y} active={3} hot={interpolate(frame, [checkAt - 4, checkAt + 4], [1, 0.35], clamp)} />

        {/* the code window */}
        <div
          style={{
            position: "absolute",
            left: WIN.x,
            top: WIN.y,
            width: WIN.w,
            height: WIN.h,
            ...cardStyle(WIN.w),
            scale: `${popScale(frame, 0)}`,
            opacity: prog(frame, 0, 6) * winDim,
            padding: "36px 44px",
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          {[0.7, 0.9, 0.55, 0.8].map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", paddingLeft: i === 1 || i === 2 ? 50 : 0 }}>
              <Bar
                w={(WIN.w - 140) * f}
                h={18}
                color={writing && i === row ? c.accent : GREY_HI}
                style={{ boxShadow: writing && i === row ? `0 0 18px ${alpha(c.accent, 0.5)}` : undefined }}
              />
            </div>
          ))}
        </div>

        {Array.from({ length: n }, (_, i) => {
          const at = drawAt + i * step;
          const t = interpolate(frame, [at, at + 11], [0, 1], { ...clamp, easing: EASE_INOUT });
          if (t <= 0) return null;
          const tx = (1080 - total) / 2 + i * (FW + FGAP);
          const fromX = WIN.x + WIN.w / 2 - FW / 2;
          const fromY = WIN.y + WIN.h / 2 - FH / 2;
          const x = mix(fromX, tx, t);
          const y = mix(fromY, FY, t);
          const ck = checkAt + i * checkStep;
          const stamp = bounce(frame, ck, 9);
          const isNewest = frame >= ck && (i === n - 1 || frame < ck + checkStep);
          return (
            <div key={i} style={{ position: "absolute", left: x, top: y, scale: `${mix(0.4, 1, t)}`, opacity: Math.min(1, t * 2) }}>
              <MiniFrame k={i} hot={isNewest ? stamp : 0} />
              {frame >= ck ? (
                <div
                  style={{
                    position: "absolute",
                    left: FW / 2 - 42,
                    top: FH / 2 - 42,
                    width: 84,
                    height: 84,
                    borderRadius: 42,
                    background: isNewest ? c.accent : LIGHT,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    scale: `${interpolate(stamp, [0, 1], [1.8, 1])}`,
                    opacity: Math.min(1, stamp * 2),
                    boxShadow: isNewest ? `0 0 34px ${alpha(c.accent, 0.6)}` : "0 8px 20px rgba(0,0,0,0.45)",
                  }}
                >
                  <CheckMark size={54} color={DARK} stroke={0.18} />
                </div>
              ) : null}
            </div>
          );
        })}
      </Stage>
    </AbsoluteFill>
  );
}
