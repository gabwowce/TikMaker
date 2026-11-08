import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { bounceIn, CheckMark, clamp, popScale, prog, Sheet, Stage } from "./shared";

export const description =
  "The Google Sheet content calendar fills row by row with dates, ideas and scripts, the row being written in orange, until a big orange check stamps it done";

export const schema = z.object({
  rows: field.number("Calendar rows", 7, { min: 3, max: 9 }),
  fillOn: field.word("Rows start filling on", "your"),
  stampOn: field.word("Check stamps on", "scripts"),
});
type Params = z.infer<typeof schema>;

const SHEET = { x: 90, y: 250, w: 900, h: 760 };

export default function Scene9({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const fillAt = wordFrame(words, params.fillOn, 38) - 4;
  const stampAt = wordFrame(words, params.stampOn, 141) - 3;
  const span = Math.max(params.rows * 6, stampAt - 6 - fillAt);
  const per = span / params.rows;
  const rowStart = (i: number) => fillAt + i * per;
  const rowFill = (i: number) => prog(frame, rowStart(i), per + 4);
  const hot = frame < rowStart(params.rows - 1) + per + 4 ? Math.floor((frame - fillAt) / per) : -1;

  const sheetIn = popScale(frame, 0);
  const stamp = bounceIn(frame, stampAt, 10);
  const stampScale = interpolate(stamp, [0, 1], [2.2, 1]);

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <Sheet
          {...SHEET}
          rows={params.rows}
          fill={rowFill}
          hot={frame >= fillAt ? hot : -1}
          style={{ scale: `${sheetIn}`, opacity: prog(frame, 0, 6) * (1 - prog(frame, stampAt, 10) * 0.35) }}
        />
        {/* the done stamp */}
        <div
          style={{
            position: "absolute",
            left: 720,
            top: 780,
            width: 240,
            height: 240,
            borderRadius: 120,
            background: c.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 80px ${c.accent}66`,
            scale: `${stampScale}`,
            rotate: "-10deg",
            opacity: interpolate(stamp, [0, 0.25], [0, 1], clamp),
          }}
        >
          <CheckMark size={160} color={c.bg} stroke={0.18} />
        </div>
      </Stage>
    </AbsoluteFill>
  );
}
