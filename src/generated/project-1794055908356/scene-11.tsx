import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Bar, bounceIn, cardStyle, clamp, GREY, GREY_HI, LIGHT, PersonIcon, popScale, prog, PromptLine, Stage, Terminal } from "./shared";

export const description =
  "A comment box pops up and types 'more AI employees!' with an orange send button, while a dimmed Claude Code terminal blinks behind it";

export const schema = z.object({
  comment: field.text("Comment typed", "more AI employees!"),
  boxOn: field.word("Comment box pops on", "comment"),
  sendOn: field.word("Send lights on", "claude"),
});
type Params = z.infer<typeof schema>;

const TERM = { x: 140, y: 250, w: 800, h: 330 };
const BOX = { x: 90, y: 650, w: 900, h: 220 };

export default function Scene11({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const boxAt = wordFrame(words, params.boxOn, 10) - 4;
  const sendAt = wordFrame(words, params.sendOn, 72) - 3;
  const typeEnd = Math.max(boxAt + 20, sendAt - 8);

  const boxIn = popScale(frame, boxAt, 0.85);
  const typed = interpolate(frame, [boxAt + 8, typeEnd], [0, 1], clamp);
  const shown = params.comment.slice(0, Math.round(params.comment.length * typed));
  const caret = typed < 1 || Math.floor(frame / 15) % 2 === 0;
  const send = bounceIn(frame, sendAt, 10);

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        {/* the terminal, dimmed, waiting */}
        <Terminal {...TERM} style={{ opacity: 0.4 * prog(frame, 0, 8) }}>
          <div style={{ position: "absolute", left: 40, top: 44, display: "flex", flexDirection: "column", gap: 30 }}>
            <Bar w={420} h={22} color={GREY_HI} />
            <Bar w={300} h={22} color={GREY} />
            <PromptLine typed={0} width={0} color={LIGHT} frame={frame} />
          </div>
        </Terminal>

        {/* the comment box */}
        <div
          style={{
            position: "absolute",
            left: BOX.x,
            top: BOX.y,
            width: BOX.w,
            height: BOX.h,
            ...cardStyle(BOX.w),
            background: "#24242c",
            borderRadius: 44,
            display: "flex",
            alignItems: "center",
            gap: 30,
            padding: "0 40px",
            scale: `${boxIn}`,
            opacity: prog(frame, boxAt, 6),
          }}
        >
          <div style={{ width: 100, height: 100, borderRadius: 50, background: "#34343d", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <PersonIcon size={64} color={GREY_HI} />
          </div>
          <div style={{ fontFamily: c.fontSemi, fontSize: 64, color: c.text, whiteSpace: "nowrap", display: "flex", alignItems: "center", paddingTop: 6 }}>
            {shown}
            <span style={{ display: "inline-block", width: 6, height: 64, marginLeft: 6, background: c.text, opacity: caret ? 0.9 : 0 }} />
          </div>
        </div>

        {/* send */}
        <div
          style={{
            position: "absolute",
            left: BOX.x + BOX.w - 150,
            top: BOX.y + BOX.h + 40,
            width: 150,
            height: 150,
            borderRadius: 75,
            background: c.accent,
            boxShadow: `0 20px 50px rgba(0,0,0,0.5), 0 0 60px ${c.accent}66`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            scale: `${send}`,
          }}
        >
          <svg width={80} height={80} viewBox="0 0 100 100">
            <path d="M14 50L86 16 66 86 50 58z" fill={c.bg} />
          </svg>
        </div>
      </Stage>
    </AbsoluteFill>
  );
}
