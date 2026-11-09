import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, Logo, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Bar,
  BOARD,
  bounceIn,
  CARD_BG,
  cardShadow,
  clamp,
  DrawPath,
  GREY,
  INK,
  mixHex,
  prog,
  pulse,
  Stage,
} from "./shared";

export const description =
  "One big SKILL.md file opens to show a few grey lines, shrinks to the corner and an arrow carries it into Claude, which draws three scene cards one after another";

export const schema = z.object({
  fileName: field.text("File name", "SKILL.md"),
  openOn: field.word("File opens on", "markdown"),
  claudeOn: field.word("Goes into Claude on", "claude"),
  drawsOn: field.word("First scene drawn on", "draws"),
  everyOn: field.word("Second scene on", "every"),
  sceneOn: field.word("Third scene on", "scene"),
  anyoneOn: field.word("File lights up on", "anyone"),
});
type Params = z.infer<typeof schema>;

const FILE_W = 420;
const FILE_H = 520;
const BIG = { cx: 515, cy: 650, s: 1 };
const SMALL = { cx: 265, cy: 445, s: 0.48 };
const CLAUDE = { cx: 720, cy: 445, size: 220 };
const ROW_Y = 790;
const MINI_W = 210;
const MINI_H = 250;
const MINI_X = [150, 410, 670];

function MiniScene({ kind, t }: { kind: number; t: number }) {
  const c = useBrand();
  const light = kind === 2;
  return (
    <div
      style={{
        width: MINI_W,
        height: MINI_H,
        borderRadius: 22,
        background: light ? BOARD : CARD_BG,
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: cardShadow,
        position: "relative",
        overflow: "hidden",
        scale: `${interpolate(t, [0, 0.6, 1], [0.6, 1.03, 1])}`,
        opacity: interpolate(t, [0, 0.25], [0, 1], clamp),
      }}
    >
      {kind === 0 ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 18 }}>
          <Bar w={150} h={34} color={c.text} />
          <Bar w={120} h={34} color={c.accent} />
        </div>
      ) : kind === 1 ? (
        <div style={{ position: "absolute", left: 26, right: 26, top: 60, height: 110, borderRadius: 14, border: "6px solid #0d0e11", background: "#2a2c32", boxShadow: "0 10px 24px rgba(0,0,0,0.5)" }}>
          <div style={{ position: "absolute", right: 14, bottom: 14, width: 54, height: 22, borderRadius: 11, background: c.accent }} />
          <div style={{ position: "absolute", left: 14, top: 14 }}><Bar w={70} h={12} color={GREY} /></div>
        </div>
      ) : (
        <svg width={MINI_W} height={MINI_H} style={{ position: "absolute", left: 0, top: 0 }}>
          <rect x={60} y={108} width={90} height={34} rx={17} fill="#c9ccd3" />
          <DrawPath d="M 44 124 C 50 86, 160 84, 166 122 C 172 160, 60 168, 46 136" t={1} color={c.accent} width={7} />
          <DrawPath d="M 40 200 q 14 -10 28 0 t 28 0 t 28 0 t 28 0" t={1} color={INK} width={5} />
        </svg>
      )}
    </div>
  );
}

export default function Scene6({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const openAt = wordFrame(words, params.openOn, 103) - 4;
  const claudeAt = wordFrame(words, params.claudeOn, 154) - 4;
  const drawAts = [
    wordFrame(words, params.drawsOn, 185),
    wordFrame(words, params.everyOn, 197),
    wordFrame(words, params.sceneOn, 206),
  ].map((f) => f - 3);
  const anyoneAt = wordFrame(words, params.anyoneOn, 228) - 3;

  const open = prog(frame, openAt, 14);
  const move = prog(frame, claudeAt, 18);
  const cx = interpolate(move, [0, 1], [BIG.cx, SMALL.cx]);
  const cy = interpolate(move, [0, 1], [BIG.cy, SMALL.cy]);
  const s = interpolate(move, [0, 1], [BIG.s, SMALL.s]);
  const claudeIn = bounceIn(frame, claudeAt + 8, 12);
  const arrow = prog(frame, claudeAt + 10, 12);
  const lit = prog(frame, anyoneAt, 10) * (0.6 + 0.4 * pulse(frame, 30));
  const claudeHot = interpolate(frame, [drawAts[0] - 4, drawAts[0], anyoneAt, anyoneAt + 8], [0, 1, 1, 0], clamp);

  const fileBars = [0.8, 0.55, 0.7, 0.45, 0.62, 0.5];

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        {/* arrow from the file into Claude */}
        <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
          <DrawPath d={`M ${SMALL.cx + 130} ${SMALL.cy} L ${CLAUDE.cx - CLAUDE.size / 2 - 40} ${CLAUDE.cy}`} t={arrow} color={c.accent} width={12} />
          <DrawPath
            d={`M ${CLAUDE.cx - CLAUDE.size / 2 - 62} ${CLAUDE.cy - 24} L ${CLAUDE.cx - CLAUDE.size / 2 - 38} ${CLAUDE.cy} L ${CLAUDE.cx - CLAUDE.size / 2 - 62} ${CLAUDE.cy + 24}`}
            t={prog(frame, claudeAt + 20, 4)}
            color={c.accent}
            width={12}
          />
          {/* lines from Claude to each scene it draws */}
          {MINI_X.map((x, i) => (
            <DrawPath
              key={i}
              d={`M ${CLAUDE.cx} ${CLAUDE.cy + CLAUDE.size / 2 + 14} L ${x + MINI_W / 2} ${ROW_Y - 24}`}
              t={prog(frame, drawAts[i] - 6, 8)}
              color={GREY}
              width={6}
            />
          ))}
        </svg>

        {/* the file */}
        <div
          style={{
            position: "absolute",
            left: cx - FILE_W / 2,
            top: cy - FILE_H / 2,
            width: FILE_W,
            height: FILE_H,
            scale: `${s}`,
            borderRadius: 30,
            background: CARD_BG,
            border: `${lit > 0.02 ? 4 : 1}px solid ${lit > 0.02 ? `rgba(255,112,36,${lit})` : "rgba(255,255,255,0.12)"}`,
            boxShadow: `${cardShadow}${lit > 0.02 ? `, 0 0 ${80 * lit}px ${c.accent}66` : ""}`,
            boxSizing: "border-box",
            padding: "44px 40px",
          }}
        >
          <div style={{ fontFamily: c.fontStrong, fontSize: 64 * c.widthFactor, color: c.accent, whiteSpace: "nowrap" }}>{params.fileName}</div>
          <div style={{ marginTop: 44, display: "flex", flexDirection: "column", gap: 30 }}>
            {fileBars.map((f, i) => {
              const t = interpolate(open, [i * 0.1, i * 0.1 + 0.5], [0, 1], clamp);
              return <Bar key={i} w={(FILE_W - 80) * f * t} h={22} color={mixHex(GREY, "#555963", i === 0 ? 1 : 0)} style={{ opacity: t }} />;
            })}
          </div>
        </div>

        {/* Claude */}
        <div
          style={{
            position: "absolute",
            left: CLAUDE.cx - CLAUDE.size / 2,
            top: CLAUDE.cy - CLAUDE.size / 2,
            width: CLAUDE.size,
            height: CLAUDE.size,
            borderRadius: CLAUDE.size / 2,
            background: CARD_BG,
            border: claudeHot > 0.5 ? `4px solid ${c.accent}` : "1px solid rgba(255,255,255,0.12)",
            boxShadow: `${cardShadow}, 0 0 ${60 * claudeHot}px ${c.accent}44`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            scale: `${claudeIn}`,
            opacity: interpolate(claudeIn, [0, 0.2], [0, 1], clamp),
          }}
        >
          <Logo id="claude" size={130} />
        </div>

        {/* the scenes it draws */}
        {MINI_X.map((x, i) => (
          <div key={i} style={{ position: "absolute", left: x, top: ROW_Y }}>
            <MiniScene kind={i} t={prog(frame, drawAts[i], 11)} />
          </div>
        ))}
      </Stage>
    </AbsoluteFill>
  );
}
