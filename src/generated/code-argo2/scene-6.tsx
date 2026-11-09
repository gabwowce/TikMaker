import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Bar, bounceIn, cardStyle, CheckIcon, clamp, GREY, Icon, popScale, prog, Progress, Stage } from "./shared";

export const description =
  "The step bar moves to Building; three folded cards – pictures, motion, voiceover – land one by one, then an orange lens sweeps a strip of the video's frames and checks each one";

export const schema = z.object({
  picturesOn: field.word("Pictures card on", "pictures"),
  motionOn: field.word("Motion card on", "motion"),
  voiceOn: field.word("Voiceover card on", "voiceover"),
  checksOn: field.word("Frame check starts on", "checks"),
  frames: field.number("Frames checked", 5, { min: 3, max: 5 }),
});
type Params = z.infer<typeof schema>;

const CARD_W = 680;
const CARD_H = 96;
const CARD_X = 175;
const CARD_TOPS = [420, 546, 672];
const KINDS = ["image", "motion", "mic"] as const;

export default function Scene6({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const buildsAt = wordFrame(words, "builds", 20) - 3;
  const cardAts = [
    wordFrame(words, params.picturesOn, 60) - 3,
    wordFrame(words, params.motionOn, 83) - 3,
    wordFrame(words, params.voiceOn, 106) - 3,
  ];
  const checksAt = wordFrame(words, params.checksOn, 140) - 3;
  const n = Math.round(params.frames);

  const building = prog(frame, buildsAt, 10);
  const checkPhase = prog(frame, checksAt - 8, 10);
  const sweepLen = 40;
  const sweep = interpolate(frame, [checksAt, checksAt + sweepLen], [0, 1], clamp);
  const finished = prog(frame, Math.min(checksAt + sweepLen + 6, durationInFrames - 14), 10);

  // the strip of frames
  const fw = 108;
  const fh = 192;
  const fgap = 22;
  const stripW = n * fw + (n - 1) * fgap;
  const stripX = 515 - stripW / 2;
  const stripY = 830;
  const lensX = stripX + fw / 2 + sweep * (stripW - fw);
  const stripIn = prog(frame, checksAt - 10, 12);

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <Progress done={[1, 1, 1, finished, 0]} active={building > 0.5 ? (finished > 0.5 ? 4 : 3) : 2} frame={frame} />
        {CARD_TOPS.map((top, i) => {
          const at = cardAts[i];
          const p = prog(frame, at, 11);
          const ok = bounceIn(frame, at + 10);
          const hot = interpolate(frame, [at, at + 4, (cardAts[i + 1] ?? checksAt) - 2, (cardAts[i + 1] ?? checksAt) + 4], [0, 1, 1, 0], clamp);
          return (
            <div
              key={i}
              style={{
                ...cardStyle(CARD_W),
                position: "absolute",
                left: CARD_X,
                top: top + (1 - p) * 40,
                width: CARD_W,
                height: CARD_H,
                opacity: p * interpolate(checkPhase, [0, 1], [1, 0.4]),
                scale: `${frame >= at ? popScale(frame, at) : 0.94}`,
                display: "flex",
                alignItems: "center",
                gap: 24,
                padding: "0 30px",
                border: `${hot > 0.5 ? 3 : 1}px solid ${hot > 0.5 ? c.accent : "rgba(255,255,255,0.12)"}`,
              }}
            >
              <div style={{ fontSize: 26, color: c.textSoft, width: 18 }}>▸</div>
              <div style={{ width: 62, height: 62, borderRadius: 16, background: hot > 0.5 ? c.accent : GREY, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon kind={KINDS[i]} size={40} color="#fff" />
              </div>
              <Bar w={[300, 270, 320][i]} h={22} color="#5a5e66" />
              <div style={{ flex: 1 }} />
              <div style={{ scale: `${ok}`, width: 48, height: 48, borderRadius: "50%", background: GREY, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckIcon size={32} />
              </div>
            </div>
          );
        })}
        {/* the strip of the video's frames, checked one by one */}
        {Array.from({ length: n }).map((_, i) => {
          const x = stripX + i * (fw + fgap);
          const passAt = checksAt + (i / Math.max(1, n - 1)) * sweepLen;
          const tick = bounceIn(frame, passAt);
          return (
            <div key={i} style={{ position: "absolute", left: x, top: stripY + (1 - stripIn) * 30, width: fw, height: fh, opacity: stripIn }}>
              <div style={{ ...cardStyle(fw), width: fw, height: fh, borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 44, gap: 16 }}>
                <div style={{ width: 46, height: 40, borderRadius: 10, background: "#565a63" }} />
                <Bar w={64} h={12} />
                <Bar w={44} h={12} />
              </div>
              {tick > 0 && (
                <div style={{ position: "absolute", right: -14, top: -14, width: 44, height: 44, borderRadius: "50%", background: c.accent, display: "flex", alignItems: "center", justifyContent: "center", scale: `${tick}`, boxShadow: "0 6px 14px rgba(0,0,0,0.5)" }}>
                  <CheckIcon size={30} />
                </div>
              )}
            </div>
          );
        })}
        {/* the lens */}
        {frame >= checksAt - 6 && (
          <div
            style={{
              position: "absolute",
              left: lensX - 78,
              top: stripY + fh / 2 - 78,
              width: 156,
              height: 156,
              borderRadius: "50%",
              border: `8px solid ${c.accent}`,
              background: `radial-gradient(closest-side, ${c.accent}22, transparent)`,
              boxShadow: `0 0 40px ${c.accent}66`,
              opacity: prog(frame, checksAt - 6, 6) * (1 - prog(frame, checksAt + sweepLen + 4, 8)),
              boxSizing: "border-box",
            }}
          />
        )}
      </Stage>
    </AbsoluteFill>
  );
}
