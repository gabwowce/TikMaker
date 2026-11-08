import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, MONO, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Bar,
  bounceIn,
  cardStyle,
  CARD_BG,
  CheckMark,
  clamp,
  EASE_INOUT,
  GREY,
  GREY_HI,
  hotGlow,
  LIGHT,
  mix,
  popScale,
  prog,
  PromptLine,
  RobotIcon,
  Stage,
  StepPill,
  Terminal,
} from "./shared";

export const description =
  "A Claude Code terminal opens, a CLAUDE.md file slides out under it and an orange role line types into it; every time the terminal restarts the line flies up into it by itself, and the file gets a check";

export const schema = z.object({
  step: field.number("Step number", 2, { min: 1, max: 9 }),
  fileName: field.text("File name", "CLAUDE.md"),
  openOn: field.word("Terminal opens on", "open"),
  fileOn: field.word("File slides out on", "save"),
  typeOn: field.word("Role typed from", "you"),
  doneOn: field.word("Role typed by", "strategist"),
  readsOn: field.word("Terminal reads the file on", "reads"),
  restarts: field.number("Restarts shown", 3, { min: 1, max: 4 }),
  onceOn: field.word("File checked on", "once"),
});
type Params = z.infer<typeof schema>;

const TERM = { x: 90, y: 318, w: 900, h: 300 };
const FILE = { x: 140, y: 690, w: 800, h: 370 };
const FILE_HEAD = 116;
const ROLE_W = 520;
// where the role bar sits inside the file and inside the terminal (canvas px)
const ROLE_IN_FILE = { x: FILE.x + 44 + 88 + 28, y: FILE.y + FILE_HEAD + 70 };
const ROLE_IN_TERM = { x: TERM.x + 40 + 88 + 28, y: TERM.y + 64 + 34 + 44 };

function FileIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
      <path d="M24 6h36l22 22v62a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6V12a6 6 0 0 1 6-6z" fill={color} />
      <path d="M60 6v16a6 6 0 0 0 6 6h16" fill="rgba(0,0,0,0.25)" />
      <rect x="32" y="48" width="36" height="7" rx="3.5" fill={CARD_BG} />
      <rect x="32" y="64" width="24" height="7" rx="3.5" fill={CARD_BG} />
    </svg>
  );
}

// The robot chip + orange bar: "you are my content strategist"
function RoleRow({ w, color, chipHot }: { w: number; color: string; chipHot: boolean }) {
  const c = useBrand();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: 24,
          background: chipHot ? c.accent : "#2c2c34",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <RobotIcon size={60} color={chipHot ? c.bg : LIGHT} />
      </div>
      <Bar w={Math.max(0, w)} h={34} color={color} />
    </div>
  );
}

export default function Scene5({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const openAt = wordFrame(words, params.openOn, 26) - 3;
  const fileAt = wordFrame(words, params.fileOn, 60) - 3;
  const nameAt = wordFrame(words, "md", 98) - 2;
  const typeAt = wordFrame(words, params.typeOn, 157) - 2;
  const typedBy = wordFrame(words, params.doneOn, 181) + 12;
  const readsAt = wordFrame(words, params.readsOn, 227) - 3;
  const onceAt = wordFrame(words, params.onceOn, 312) - 3;

  // the terminal restarts `restarts` times, each time loading the role from the file
  const gap = 26;
  const loads = Array.from({ length: params.restarts }, (_, i) => readsAt + i * gap);
  const lastLoad = loads.reduce((acc, l) => (frame >= l ? l : acc), -1);
  const sinceLoad = lastLoad >= 0 ? frame - lastLoad : -1;
  // a restart: the terminal blinks shut and reopens, then the line flies up
  const blink = lastLoad >= 0 ? interpolate(sinceLoad, [0, 3, 7], [1, 0.94, 1], clamp) : 1;
  const contentOn = lastLoad >= 0 ? interpolate(sinceLoad, [0, 2, 6], [1, 0, 1], clamp) : 1;
  const fly = lastLoad >= 0 ? interpolate(sinceLoad, [4, 16], [0, 1], { ...clamp, easing: EASE_INOUT }) : 0;
  const loaded = lastLoad >= 0 && fly >= 1;

  // focus: terminal (open) → file (save … strategist) → terminal (reads) → file (once)
  const termFocus = frame < fileAt ? 1 : frame >= readsAt && frame < onceAt ? 1 : 0;
  const fileFocus = frame >= fileAt && frame < readsAt ? 1 : frame >= onceAt ? 1 : 0;
  const termOpacity = interpolate(termFocus, [0, 1], [0.45, 1]);
  const fileOpacity = interpolate(fileFocus, [0, 1], [0.5, 1]);

  const termIn = popScale(frame, openAt, 0.85);
  const fileSlide = prog(frame, fileAt, 14);
  const nameHot = prog(frame, nameAt, 6);
  const typed = interpolate(frame, [typeAt, typedBy], [0, 1], clamp);
  const typing = typed > 0 && typed < 1;
  const check = bounceIn(frame, onceAt, 10);
  const fileHot = fileFocus * (frame >= onceAt ? 1 - prog(frame, onceAt + 20, 16) * 0.6 : typing || nameHot > 0 ? 1 : 0.5);
  const fileGlow = hotGlow(c.accent, fileHot * (frame >= nameAt ? 1 : 0));
  const filePunch = 1 + interpolate(frame, [onceAt, onceAt + 5, onceAt + 12], [0, 0.025, 0], clamp);

  const termHot = termFocus * (frame >= readsAt ? 1 - prog(frame, loads[loads.length - 1] + 24, 16) * 0.5 : frame < fileAt && frame >= openAt ? 0.6 : 0);

  return (
    <AbsoluteFill>
      <StepPill n={params.step} frame={frame} />
      <Stage frame={frame} duration={durationInFrames}>
        {/* the CLAUDE.md file – slides out from under the terminal */}
        <div
          style={{
            position: "absolute",
            left: FILE.x,
            top: FILE.y,
            width: FILE.w,
            height: FILE.h,
            ...cardStyle(FILE.w),
            background: "#1f1f26",
            overflow: "hidden",
            boxShadow: `0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)${fileGlow ? `, ${fileGlow}` : ""}`,
            opacity: prog(frame, fileAt, 6) * fileOpacity,
            translate: `0px ${(1 - fileSlide) * -260}px`,
            scale: `${filePunch}`,
          }}
        >
          <div
            style={{
              height: FILE_HEAD,
              display: "flex",
              alignItems: "center",
              gap: 24,
              padding: "0 44px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <FileIcon size={64} color={nameHot > 0.5 ? c.accent : LIGHT} />
            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 64, lineHeight: 1, color: c.text }}>{params.fileName}</span>
          </div>
          <div style={{ position: "absolute", left: 44, top: FILE_HEAD + 26, display: "flex", flexDirection: "column", gap: 40 }}>
            <RoleRow w={ROLE_W * typed} color={c.accent} chipHot={typed > 0} />
            <div style={{ display: "flex", flexDirection: "column", gap: 22, paddingLeft: 116, opacity: 0.6 }}>
              <Bar w={380} h={20} color={GREY} />
              <Bar w={260} h={20} color={GREY} />
            </div>
          </div>
          {/* typing cursor */}
          {typing ? (
            <div
              style={{
                position: "absolute",
                left: 44 + 88 + 28 + ROLE_W * typed + 10,
                top: FILE_HEAD + 70 - 22,
                width: 14,
                height: 44,
                background: c.text,
              }}
            />
          ) : null}
          {/* saved: a check on the file */}
          {frame >= onceAt ? (
            <div
              style={{
                position: "absolute",
                right: 40,
                top: (FILE_HEAD - 76) / 2,
                width: 76,
                height: 76,
                borderRadius: 38,
                background: c.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                scale: `${check}`,
              }}
            >
              <CheckMark size={52} color={c.bg} />
            </div>
          ) : null}
        </div>

        {/* the Claude Code terminal */}
        <Terminal
          {...TERM}
          hot={termHot}
          style={{ scale: `${termIn * blink}`, opacity: prog(frame, openAt, 6) * termOpacity }}
        >
          <div style={{ position: "absolute", left: 40, top: 34, display: "flex", flexDirection: "column", gap: 34, opacity: contentOn }}>
            <div style={{ height: 88, opacity: loaded ? 1 : 0 }}>
              <RoleRow w={ROLE_W} color={c.accent} chipHot={loaded && termFocus > 0} />
            </div>
            <PromptLine typed={0} width={400} color={GREY_HI} frame={frame} style={{ paddingLeft: 8 }} />
          </div>
        </Terminal>

        {/* the role line travelling from the file up into the terminal */}
        {fly > 0 && fly < 1 ? (
          <Bar
            w={ROLE_W}
            h={34}
            color={c.accent}
            style={{
              position: "absolute",
              left: mix(ROLE_IN_FILE.x, ROLE_IN_TERM.x, fly),
              top: mix(ROLE_IN_FILE.y, ROLE_IN_TERM.y, fly) - 17,
              boxShadow: `0 0 34px ${c.accent}99`,
            }}
          />
        ) : null}
      </Stage>
    </AbsoluteFill>
  );
}
