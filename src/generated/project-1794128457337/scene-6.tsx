import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  AgentPanel,
  Bar,
  Check,
  Chevron,
  GREY,
  LIGHT,
  MotionIcon,
  PanelCard,
  PictureIcon,
  Stage,
  WaveIcon,
  clamp,
  popScale,
  prog,
  pulse,
} from "./shared";

export const description =
  "The agent panel reaches Building: three folded cards – pictures, motion, voiceover – land one by one, then a row of video frames gets checked off one after another";

export const schema = z.object({
  frames: field.number("Frames it checks", 5, { min: 3, max: 6 }),
  picturesOn: field.word("Pictures card on", "pictures"),
  motionOn: field.word("Motion card on", "motion"),
  voiceOn: field.word("Voiceover card on", "voiceover"),
  checksOn: field.word("Frame checks start on", "checks"),
});
type Params = z.infer<typeof schema>;

const CARD_H = 90;
const CARD_GAP = 16;
const THUMB_H = 180;
const THUMB_W = Math.round((THUMB_H * 9) / 16);

export default function Scene6({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const at = [
    wordFrame(words, params.picturesOn, 60) - 3,
    wordFrame(words, params.motionOn, 83) - 3,
    wordFrame(words, params.voiceOn, 106) - 3,
  ];
  const checkAt = wordFrame(words, params.checksOn, 140) - 4;
  const n = params.frames;
  const per = Math.max(5, Math.min(9, (durationInFrames - 30 - checkAt) / n));
  const allChecked = checkAt + 6 + per * n;
  const done = 3 + prog(frame, allChecked, 8);
  const thumbsIn = prog(frame, checkAt - 6, 12);
  const icons = [PictureIcon, MotionIcon, WaveIcon];

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <AgentPanel frame={frame} done={done} active={done >= 4 ? 4 : 3}>
          {/* pictures, motion, voiceover – folded cards */}
          <div style={{ position: "absolute", left: 60, top: 30, display: "flex", flexDirection: "column", gap: CARD_GAP }}>
            {icons.map((Icon, i) => {
              const t = prog(frame, at[i], 12);
              // the newest card is the focus until the next one lands
              const next = i < 2 ? at[i + 1] : checkAt;
              const hot = t * (1 - prog(frame, next, 8)) * (0.75 + 0.25 * pulse(frame, 24));
              const dim = interpolate(thumbsIn, [0, 1], [1, 0.45]);
              return (
                <div key={i} style={{ opacity: t * dim, scale: `${popScale(frame, at[i])}`, translate: `0px ${(1 - t) * 30}px` }}>
                  <PanelCard
                    height={CARD_H}
                    hot={hot}
                    bars={[0.55 - i * 0.08]}
                    icon={<Icon size={38} color={hot > 0.5 ? c.bg : LIGHT} />}
                    right={<Chevron size={40} color={c.textSoft} />}
                  />
                </div>
              );
            })}
          </div>
          {/* the frames it checks */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 30 + 3 * CARD_H + 2 * CARD_GAP + 40,
              display: "flex",
              justifyContent: "center",
              gap: 26,
              opacity: thumbsIn,
              translate: `0px ${(1 - thumbsIn) * 30}px`,
            }}
          >
            {Array.from({ length: n }).map((_, i) => {
              const t0 = checkAt + 6 + i * per;
              const checked = prog(frame, t0, 6);
              const focus = interpolate(frame, [t0 - per, t0 - per + 3, t0, t0 + 4], [0, 1, 1, 0], clamp);
              return (
                <div
                  key={i}
                  style={{
                    position: "relative",
                    width: THUMB_W,
                    height: THUMB_H,
                    borderRadius: 14,
                    background: "#24262c",
                    border: focus > 0.05 ? `4px solid rgba(255,112,36,${focus})` : "1px solid rgba(255,255,255,0.1)",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    scale: `${1 + focus * 0.06}`,
                  }}
                >
                  <div style={{ width: THUMB_W * 0.55, height: THUMB_W * 0.55, borderRadius: 12, background: GREY }} />
                  <Bar w={THUMB_W * 0.6} h={10} color={GREY} />
                  <div
                    style={{
                      position: "absolute",
                      right: -16,
                      bottom: -16,
                      width: 46,
                      height: 46,
                      borderRadius: 23,
                      background: LIGHT,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      scale: `${checked}`,
                      boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
                    }}
                  >
                    <Check size={30} color={c.bg} t={checked} />
                  </div>
                </div>
              );
            })}
          </div>
        </AgentPanel>
      </Stage>
    </AbsoluteFill>
  );
}
