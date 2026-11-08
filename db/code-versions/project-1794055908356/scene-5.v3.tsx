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
  "A Claude Code terminal opens and an orange role line types into it; the line drops into a CLAUDE.md file that slides out below and gets a check, and every time the terminal restarts the line flies back up into it by itself";

export const schema = z.object({
  step: field.number("Step number", 2, { min: 1, max: 9 }),
  fileName: field.text("File name", "CLAUDE.md"),
  openOn: field.word("Terminal opens on", "open"),
  typeOn: field.word("Role typed from", "you"),
  doneOn: field.word("Role typed by", "strategist"),
  saveOn: field.word("Line drops into the file on", "save"),
  nameOn: field.word("File name lights up on", "md"),
  checkOn: field.word("File checked on", "permanent"),
  readsOn: field.word("First restart on", "reads"),
  lastOn: field.word("Last restart on", "reuse"),
  restarts: field.number("Restarts shown", 3, { min: 1, max: 4 }),
});
type Params = z.infer<typeof schema>;

const TERM = { x: 90, y: 318, w: 900, h: 300 };
const FILE = { x: 140, y: 690, w: 800, h: 370 };
const FILE_HEAD = 116;
const ROLE_W = 520;
const ROW_X = 88 + 28; // chip + gap, then the bar
// where the role bar sits inside the file and inside the terminal (canvas px)
const ROLE_IN_FILE = { x: FILE.x + 44 + ROW_X, y: FILE.y + FILE_HEAD + 26 + 44 };
const ROLE_IN_TERM = { x: TERM.x + 40 + ROW_X, y: TERM.y + 64 + 34 + 44 };

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
function RoleRow({ w, color, chipHot, barOn = 1 }: { w: number; color: string; chipHot: boolean; barOn?: number }) {
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
      <Bar w={Math.max(0, w)} h={34} color={color} style={{ opacity: barOn }} />
    </div>
  );
}

function Cursor({ left, top, on }: { left: number; top: number; on: boolean }) {
  const c = useBrand();
  if (!on) return null;
  return <div style={{ position: "absolute", left, top, width: 14, height: 44, background: c.text }} />;
}

export default function Scene5({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const openAt = wordFrame(words, params.openOn, 26) - 3;
  const typeAt = wordFrame(words, params.typeOn, 108) - 2;
  const typedBy = wordFrame(words, params.doneOn, 133) + 14;
  const saveAt = wordFrame(words, params.saveOn, 159) - 3;
  const nameAt = wordFrame(words, params.nameOn, 207) - 2;
  const checkAt = wordFrame(words, params.checkOn, 262) - 3;
  const readsAt = wordFrame(words, params.readsOn, 327) - 3;
  const lastAt = Math.max(readsAt, wordFrame(words, params.lastOn, 429) - 3);

  // 1) typed into the terminal
  const typed = interpolate(frame, [typeAt, typedBy], [0, 1], clamp);
  const typing = typed > 0 && typed < 1;

  // 2) on "save": the file slides out, the typed line drops down into it
  const fileSlide = prog(frame, saveAt, 14);
  const drop = interpolate(frame, [saveAt + 6, saveAt + 20], [0, 1], { ...clamp, easing: EASE_INOUT });
  const inFile = drop >= 1;

  // 3) restarts: the terminal blinks shut, reopens, and the line flies up from the file
  const n = params.restarts;
  const loads = Array.from({ length: n }, (_, i) => (n === 1 ? readsAt : mix(readsAt, lastAt, i / (n - 1))));
  const lastLoad = loads.reduce((acc, l) => (frame >= l ? l : acc), -1);
  const sinceLoad = lastLoad >= 0 ? frame - lastLoad : -1;
  const blink = lastLoad >= 0 ? interpolate(sinceLoad, [0, 3, 7], [1, 0.94, 1], clamp) : 1;
  const contentOn = lastLoad >= 0 ? interpolate(sinceLoad, [0, 2, 6], [1, 0, 1], clamp) : 1;
  const fly = lastLoad >= 0 ? interpolate(sinceLoad, [4, 16], [0, 1], { ...clamp, easing: EASE_INOUT }) : 0;
  const loaded = lastLoad >= 0 && fly >= 1;
  const loadsDone = loads[n - 1] + 26;

  // focus: terminal (open … save) → file (save … reads) → terminal (restarts) → file (end)
  const termFocus = frame < saveAt + 10 || (frame >= readsAt && frame < loadsDone) ? 1 : 0;
  const fileFocus = 1 - termFocus;
  const termDim = Math.min(1, Math.max(0, prog(frame, saveAt + 10, 10) - prog(frame, readsAt, 6) + prog(frame, loadsDone, 10)));
  const termOpacity = mix(1, 0.45, termDim);
  const fileOpacity = mix(0.5, 1, fileFocus);

  const termIn = popScale(frame, openAt, 0.85);
  const nameHot = prog(frame, nameAt, 6);
  const check = bounceIn(frame, checkAt, 10);
  const fileHot = fileFocus * (frame >= saveAt ? 1 : 0) * (frame >= checkAt + 20 && frame < readsAt ? 0.6 : 1);
  const fileGlow = hotGlow(c.accent, fileHot);
  const filePunch = 1 + interpolate(frame, [checkAt, checkAt + 5, checkAt + 12], [0, 0.025, 0], clamp);
  const termHot = termFocus * (frame >= openAt ? (frame >= readsAt ? 1 : 0.7) : 0);

  // what the terminal's role row shows
  const beforeSave = frame < saveAt + 6;
  const termRowW = beforeSave ? ROLE_W * typed : ROLE_W;
  const termRowShown = beforeSave ? typed > 0 : loaded;
  const termChipHot = beforeSave ? typed > 0 : loaded && termFocus > 0;

  // the moving bar: down into the file on save, up into the terminal on each restart
  let moving: { t: number; down: boolean } | null = null;
  if (drop > 0 && drop < 1) moving = { t: drop, down: true };
  else if (fly > 0 && fly < 1) moving = { t: fly, down: false };

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
            opacity: prog(frame, saveAt, 6) * fileOpacity,
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
            <RoleRow w={ROLE_W} color={c.accent} chipHot={inFile} barOn={inFile ? 1 : 0} />
            <div style={{ display: "flex", flexDirection: "column", gap: 22, paddingLeft: ROW_X, opacity: 0.6 }}>
              <Bar w={380} h={20} color={GREY} />
              <Bar w={260} h={20} color={GREY} />
            </div>
          </div>
          {/* permanent: a check on the file */}
          {frame >= checkAt ? (
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
            <div style={{ height: 88, opacity: termRowShown ? 1 : 0 }}>
              <RoleRow w={termRowW} color={c.accent} chipHot={termChipHot} />
            </div>
            <PromptLine typed={0} width={400} color={GREY_HI} frame={frame} cursor={!typing} style={{ paddingLeft: 8 }} />
          </div>
          <Cursor left={40 + ROW_X + ROLE_W * typed + 10} top={34 + 44 - 22} on={typing} />
        </Terminal>

        {/* the role line travelling between terminal and file */}
        {moving ? (
          <Bar
            w={ROLE_W}
            h={34}
            color={c.accent}
            style={{
              position: "absolute",
              left: moving.down ? mix(ROLE_IN_TERM.x, ROLE_IN_FILE.x, moving.t) : mix(ROLE_IN_FILE.x, ROLE_IN_TERM.x, moving.t),
              top: (moving.down ? mix(ROLE_IN_TERM.y, ROLE_IN_FILE.y, moving.t) : mix(ROLE_IN_FILE.y, ROLE_IN_TERM.y, moving.t)) - 17,
              boxShadow: `0 0 34px ${c.accent}99`,
            }}
          />
        ) : null}
      </Stage>
    </AbsoluteFill>
  );
}
