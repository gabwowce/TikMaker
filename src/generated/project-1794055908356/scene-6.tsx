import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Bar,
  bounceIn,
  BulbIcon,
  CalendarIcon,
  cardStyle,
  CheckMark,
  clamp,
  GREY,
  GREY_HI,
  IconChip,
  LIGHT,
  ListIcon,
  popScale,
  prog,
  ScriptIcon,
  SearchIcon,
  Stage,
  StepPill,
} from "./shared";

export const description =
  "A job-description card with four duties – research, ideas, scripts, calendar – each row lighting orange and getting a check as it is named";

export const schema = z.object({
  step: field.number("Step number", 3, { min: 1, max: 9 }),
  cardOn: field.word("Card appears on", "write"),
  researchOn: field.word("Duty 1 on", "research"),
  ideasOn: field.word("Duty 2 on", "generate"),
  scriptsOn: field.word("Duty 3 on", "write"),
  calendarOn: field.word("Duty 4 on", "organize"),
});
type Params = z.infer<typeof schema>;

const CARD = { x: 140, y: 330, w: 800, h: 730 };
const HEAD = 110;
const ICONS = [SearchIcon, BulbIcon, ScriptIcon, CalendarIcon];
const WIDTHS = [0.62, 0.5, 0.56, 0.68];

export default function Scene6({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const cardAt = wordFrame(words, params.cardOn, 20) - 4;
  const at = [
    wordFrame(words, params.researchOn, 61) - 3,
    wordFrame(words, params.ideasOn, 106) - 3,
    wordFrame(words, params.scriptsOn, 148, 8) - 3,
    wordFrame(words, params.calendarOn, 185) - 3,
  ];

  const cardIn = popScale(frame, cardAt);
  const rowH = (CARD.h - HEAD - 20) / 4;
  const hotIdx = at.reduce((acc, a, i) => (frame >= a ? i : acc), -1);

  return (
    <AbsoluteFill>
      <StepPill n={params.step} frame={frame} />
      <Stage frame={frame} duration={durationInFrames}>
        <div
          style={{
            position: "absolute",
            left: CARD.x,
            top: CARD.y,
            width: CARD.w,
            height: CARD.h,
            ...cardStyle(CARD.w),
            background: "#1f1f26",
            scale: `${cardIn}`,
            opacity: prog(frame, cardAt, 6),
            translate: `0px ${(1 - prog(frame, cardAt, 12)) * 60}px`,
          }}
        >
          <div style={{ height: HEAD, display: "flex", alignItems: "center", gap: 22, padding: "0 44px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <ListIcon size={52} color={GREY_HI} />
            <Bar w={280} h={24} color={GREY_HI} />
          </div>
          {ICONS.map((Icon, i) => {
            const lit = prog(frame, at[i], 8);
            const hot = hotIdx === i ? 1 : 0;
            const done = frame >= at[i];
            const check = bounceIn(frame, at[i] + 4, 10);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 44,
                  right: 44,
                  top: HEAD + 10 + i * rowH,
                  height: rowH,
                  display: "flex",
                  alignItems: "center",
                  gap: 34,
                  opacity: interpolate(lit, [0, 1], [0.35, 1]),
                  borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none",
                }}
              >
                <IconChip size={112} hot={hot} style={{ scale: `${1 + interpolate(frame, [at[i], at[i] + 5, at[i] + 12], [0, 0.08, 0], clamp)}` }}>
                  <Icon size={64} color={hot ? c.bg : done ? LIGHT : GREY_HI} />
                </IconChip>
                <Bar w={(CARD.w - 88 - 112 - 34 - 34 - 70) * WIDTHS[i]} h={26} color={hot ? c.accent : done ? GREY_HI : GREY} />
                <div
                  style={{
                    marginLeft: "auto",
                    width: 70,
                    height: 70,
                    borderRadius: 18,
                    border: `4px solid ${done ? (hot ? c.accent : GREY_HI) : GREY}`,
                    background: done ? (hot ? c.accent : GREY_HI) : "transparent",
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {done ? (
                    <div style={{ scale: `${check}` }}>
                      <CheckMark size={50} color={hot ? c.bg : c.text} />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </Stage>
    </AbsoluteFill>
  );
}
