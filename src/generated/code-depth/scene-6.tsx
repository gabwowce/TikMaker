import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, MONO, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Background,
  Camera,
  clamp,
  COL,
  COMMANDS,
  Dock,
  EASE,
  glass,
  Headline,
  LIGHT_SOFT,
  LIGHT_TEXT,
  pop,
  prog,
  typed,
} from "./shared";

export const description =
  "Light scene: the finished three-command list shrinks to the side, a comment bubble pops up and types a request, and a big orange Follow button pulses";

export const schema = z.object({
  headline: field.text("Headline (*word* – key word)", "Want *more* tips?"),
  comment: field.text("The comment", "more Claude Code tips pls 🙏"),
  user: field.text("Commenter name", "@vibe.coder"),
  button: field.text("Button", "+ Follow"),
  commentOn: field.word("Comment pops on", "comment"),
  followOn: field.word("Follow pulses on", "follow"),
});
type Params = z.infer<typeof schema>;

const ORANGE = COL.orange;

export default function Scene6({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const commentAt = wordFrame(words, params.commentOn, 19) - 4;
  const followAt = wordFrame(words, params.followOn, 122) - 3;
  const headAt = wordFrame(words, "want", 47) - 6;

  // the list moves aside
  const aside = interpolate(frame, [commentAt, commentAt + 18], [0, 1], { ...clamp, easing: EASE });
  const bubble = Math.min(pop(frame, commentAt + 4, 13, 170), 1.06);
  const followIn = Math.min(pop(frame, followAt - 2, 11, 190), 1.1);
  const pulse = frame > followAt ? 1 + Math.max(0, Math.sin((frame - followAt) / 6)) * 0.05 : 1;
  const ripple = ((frame - followAt) % 30) / 30;
  const float = Math.sin(frame / 14) * 7;

  return (
    <AbsoluteFill>
      <Background color={ORANGE} light y={560} />
      <Camera duration={durationInFrames} punchAt={followAt}>
        <Headline line1={params.headline} color={ORANGE} light start={headAt} size={96} top={214} />

        {/* the finished list – big at first, then aside */}
        <div
          style={{
            position: "absolute",
            left: 540 - 380,
            top: 390,
            width: 760,
            padding: 26,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            ...glass(true, 48),
            // it shrinks down into the dock at the bottom
            translate: `0px ${aside * 480 + float * (1 - aside)}px`,
            scale: `${1 - aside * 0.6}`,
            transform: `perspective(1200px) rotateX(${aside * 30}deg)`,
            opacity: 1 - prog(frame, commentAt + 8, 8),
          }}
        >
          {COMMANDS.map((cmd, i) => (
            <div
              key={i}
              style={{
                height: 112,
                borderRadius: 30,
                background: `${cmd.color}18`,
                display: "flex",
                alignItems: "center",
                gap: 24,
                padding: "0 26px",
              }}
            >
              <div style={{ width: 70, height: 70, borderRadius: 20, background: cmd.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <cmd.Icon size={44} color="#fff" />
              </div>
              <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 54, color: LIGHT_TEXT }}>{cmd.label}</div>
              <div style={{ flex: 1 }} />
              <div style={{ fontFamily: c.fontUi, fontWeight: 800, fontSize: 44, color: cmd.color }}>✓</div>
            </div>
          ))}
        </div>

        {/* the comment bubble */}
        <div
          style={{
            position: "absolute",
            left: 90,
            top: 400,
            width: 900,
            boxSizing: "border-box",
            padding: "34px 38px",
            ...glass(true, 44),
            display: "flex",
            gap: 26,
            opacity: Math.min(1, bubble * 1.5),
            scale: `${interpolate(bubble, [0, 1], [0.6, 1])}`,
            transformOrigin: "10% 100%",
            translate: `0px ${float * 0.6}px`,
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              flexShrink: 0,
              background: `linear-gradient(135deg, #ffb37f, ${ORANGE})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: c.fontUi,
              fontWeight: 800,
              fontSize: 44,
              color: "#fff",
            }}
          >
            V
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
            <div style={{ fontFamily: c.fontUi, fontWeight: 700, fontSize: 32, color: LIGHT_SOFT }}>{params.user}</div>
            <div style={{ fontFamily: c.fontUi, fontWeight: 700, fontSize: 54, color: LIGHT_TEXT, lineHeight: 1.2, minHeight: 130 }}>
              {typed(params.comment, frame, commentAt + 12, 1.1)}
              <span style={{ color: ORANGE, opacity: Math.floor(frame / 8) % 2 ? 0.2 : 1 }}>|</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: ORANGE, fontFamily: c.fontUi, fontWeight: 800 }}>
            <div style={{ fontSize: 46, scale: `${interpolate(frame, [commentAt + 40, commentAt + 44, commentAt + 52], [1, 1.3, 1], clamp)}` }}>♥</div>
            <div style={{ fontSize: 26, color: LIGHT_SOFT }}>{frame > commentAt + 40 ? 128 : 127}</div>
          </div>
        </div>

        <Dock
          light
          fill={[1, 1, 1]}
          show={[0, 1, 2].map((i) => Math.min(pop(frame, commentAt + 10 + i * 2, 13, 180), 1.06))}
        />

        {/* the follow button */}
        <div
          style={{
            position: "absolute",
            left: 540 - 270,
            top: 780,
            width: 540,
            height: 150,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 75,
              border: `5px solid ${ORANGE}`,
              opacity: frame > followAt ? (1 - ripple) * 0.6 : 0,
              scale: `${1 + ripple * 0.3}`,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 75,
              background: `linear-gradient(180deg, #ff8a4a, ${ORANGE})`,
              boxShadow: `0 20px 50px rgba(255,112,36,0.45), 0 0 ${prog(frame, followAt, 10) * 60}px ${ORANGE}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: c.fontUi,
              fontWeight: 800,
              fontSize: 68,
              color: "#fff",
              opacity: Math.min(1, followIn * 1.5),
              scale: `${interpolate(followIn, [0, 1], [0.5, 1]) * pulse}`,
            }}
          >
            {params.button}
          </div>
        </div>
      </Camera>
    </AbsoluteFill>
  );
}
