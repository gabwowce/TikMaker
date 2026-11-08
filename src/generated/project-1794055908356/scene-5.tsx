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
  Stage,
  StepPill,
  Terminal,
} from "./shared";

export const description =
  "A Claude Code terminal opens and 'You are my content strategist' types out in it; the line drops into a CLAUDE.md file that slides out below and gets a check, and every time the terminal restarts the line flies back up into it by itself";

export const schema = z.object({
  step: field.number("Step number", 2, { min: 1, max: 9 }),
  roleText: field.text("Role line", "You are my content strategist"),
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

const TERM = { x: 100, y: 310, w: 880, h: 330 };
const FILE = { x: 140, y: 700, w: 800, h: 360 };
const FILE_HEAD = 116;
const GUTTER = 56; // the ">" before the typed line in the terminal
const TEXT_MAX_W = 700; // the role text must fit this width in both places
const LINE_H = 1.2;
// top-left of the role text inside the terminal and inside the file (canvas px)
const ROLE_IN_TERM = { x: TERM.x + 40 + GUTTER, y: TERM.y + 64 + 34 };
const ROLE_IN_FILE = { x: FILE.x + 44, y: FILE.y + FILE_HEAD + 30 };

// Split the role line into two lines as evenly as possible.
function splitLines(text: string): string[] {
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return [text.trim()];
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ").length;
    const b = words.slice(i).join(" ").length;
    const diff = Math.max(a, b);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

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

// The role line as real text, `shown` characters of it typed, with an optional cursor after them.
function RoleText({
  lines,
  fontSize,
  shown,
  cursor = false,
  color,
}: {
  lines: string[];
  fontSize: number;
  shown: number;
  cursor?: boolean;
  color: string;
}) {
  const c = useBrand();
  let left = shown;
  let cursorDrawn = false;
  return (
    <div style={{ fontFamily: MONO, fontWeight: 700, fontSize, lineHeight: LINE_H, color, whiteSpace: "pre" }}>
      {lines.map((line, i) => {
        const n = Math.max(0, Math.min(line.length, left));
        left -= line.length + 1; // +1 for the space the line break ate
        const here = cursor && !cursorDrawn && (n < line.length || i === lines.length - 1);
        if (here) cursorDrawn = true;
        return (
          <div key={i} style={{ height: fontSize * LINE_H, display: "flex", alignItems: "center" }}>
            <span>{line.slice(0, n)}</span>
            {here ? <span style={{ display: "inline-block", width: fontSize * 0.24, height: fontSize * 0.95, marginLeft: 6, background: c.text }} /> : null}
          </div>
        );
      })}
    </div>
  );
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

  const lines = splitLines(params.roleText);
  const totalChars = lines.join(" ").length;
  const longest = Math.max(...lines.map((l) => l.length), 1);
  // monospace: ~0.6 em per character
  const fontSize = Math.min(60, Math.floor(TEXT_MAX_W / (longest * 0.6)));

  // 1) typed into the terminal, character by character
  const typed = interpolate(frame, [typeAt, typedBy], [0, 1], clamp);
  const typedChars = Math.round(typed * totalChars);
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

  // what the terminal shows on its role line
  const beforeSave = frame < saveAt + 6;
  const termChars = beforeSave ? typedChars : loaded ? totalChars : 0;
  const termRowShown = beforeSave ? typed > 0 : loaded;

  // the moving line: down into the file on save, up into the terminal on each restart
  let moving: { t: number; down: boolean } | null = null;
  if (drop > 0 && drop < 1) moving = { t: drop, down: true };
  else if (fly > 0 && fly < 1) moving = { t: fly, down: false };
  const textH = fontSize * LINE_H * lines.length;

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
          <div style={{ position: "absolute", left: 44, top: FILE_HEAD + 30, display: "flex", flexDirection: "column", gap: 34 }}>
            <div style={{ height: textH, opacity: inFile ? 1 : 0 }}>
              <RoleText lines={lines} fontSize={fontSize} shown={totalChars} color={c.accent} />
            </div>
            <Bar w={420} h={20} color={GREY} style={{ opacity: 0.6 }} />
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
          <div style={{ position: "absolute", left: 40, top: 34, display: "flex", flexDirection: "column", gap: 30, opacity: contentOn }}>
            <div style={{ display: "flex", height: textH, opacity: termRowShown ? 1 : 0 }}>
              <div
                style={{
                  width: GUTTER,
                  flexShrink: 0,
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize,
                  lineHeight: LINE_H,
                  color: c.accent,
                }}
              >
                {">"}
              </div>
              <RoleText lines={lines} fontSize={fontSize} shown={termChars} cursor={typing} color={c.accent} />
            </div>
            <PromptLine typed={0} width={400} color={GREY_HI} frame={frame} cursor={!typing} style={{ paddingLeft: 8 }} />
          </div>
        </Terminal>

        {/* the role line travelling between terminal and file */}
        {moving ? (
          <div
            style={{
              position: "absolute",
              left: moving.down ? mix(ROLE_IN_TERM.x, ROLE_IN_FILE.x, moving.t) : mix(ROLE_IN_FILE.x, ROLE_IN_TERM.x, moving.t),
              top: moving.down ? mix(ROLE_IN_TERM.y, ROLE_IN_FILE.y, moving.t) : mix(ROLE_IN_FILE.y, ROLE_IN_TERM.y, moving.t),
              textShadow: `0 0 30px ${c.accent}aa`,
            }}
          >
            <RoleText lines={lines} fontSize={fontSize} shown={totalChars} color={c.accent} />
          </div>
        ) : null}
      </Stage>
    </AbsoluteFill>
  );
}
