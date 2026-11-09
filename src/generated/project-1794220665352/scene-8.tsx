import { z } from "zod";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { SCENE_COLORS, asset, field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Backdrop, CLIP_SRC, Camera, Clip, Headline, OUT, cardMotion, clampAll, glass, usePop } from "./shared";

export const description =
  "Over the glowing night city, a glass comment box types “3D” and sends it; a reply bubble pops under it promising the exact prompt and setup";

export const schema = z.object({
  clip: field.recording(
    "3D clip (background, last second)",
    "Your finished 12-s bulb→city clip (9:16 MP4). Used dimmed behind the comment: seconds 11.3–11.9, the glowing night city",
  ),
  headline: field.text("Headline", "Comment *“3D”*"),
  comment: field.text("Comment text", "3D"),
  reply: field.text("Reply", "Exact prompt + setup"),
  typeOn: field.word("Typed on", "3D"),
  sendOn: field.word("Sent on", "send"),
  replyOn: field.word("Reply on", "prompt"),
});
type Params = z.infer<typeof schema>;

const COLOR = SCENE_COLORS.orange;

export default function Scene8({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const typeAt = wordFrame(words, params.typeOn, 13);
  const sendAt = wordFrame(words, params.sendOn, 37);
  const replyAt = wordFrame(words, params.replyOn, 57);
  const heads = params.headline.split(" ").map((t, i) => ({ text: t, at: i === 0 ? 2 : typeAt }));

  const chars = Math.max(0, Math.min(params.comment.length, Math.floor((frame - typeAt) / 3) + 1));
  const typed = params.comment.slice(0, chars);
  const sent = frame >= sendAt;
  const sendFlash = interpolate(frame, [sendAt, sendAt + 3, sendAt + 16], [0, 1, 0], clampAll);
  const heart = usePop(sendAt);
  const reply = usePop(replyAt);
  const lift = interpolate(frame, [sendAt, sendAt + 12], [0, -30], { ...clampAll, easing: OUT });
  const caretOn = !sent && Math.floor(frame / 8) % 2 === 0;

  return (
    <AbsoluteFill style={{ background: "#070a12" }}>
      <AbsoluteFill style={{ filter: "brightness(0.5) saturate(1.15)", transform: "scale(1.04)" }}>
        <Clip src={params.clip || CLIP_SRC} from={11.3} rate={0.18} record="Your 3D clip, last second (night city)" />
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: 0.55, mixBlendMode: "screen" }}>
        <Backdrop color={COLOR} y={620} fromY={800} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(4,6,12,0.65) 0%, rgba(4,6,12,0.2) 45%, rgba(4,6,12,0) 60%)" }} />
      <Camera duration={durationInFrames} punchAt={[typeAt, sendAt]}>
        <Headline lines={[heads]} top={265} size={100} color={COLOR} shadow />

        {/* the comment box → the posted comment */}
        <div
          style={{
            position: "absolute",
            left: 130,
            top: 480,
            width: 770,
            height: 210,
            ...glass(770),
            borderRadius: 56,
            background: "rgba(12,14,22,0.62)",
            display: "flex",
            alignItems: "center",
            gap: 30,
            padding: "0 34px",
            boxSizing: "border-box",
            ...cardMotion(frame, -16),
            translate: `0px ${lift}px`,
            boxShadow: `0 8px 16px rgba(0,0,0,0.25), 0 32px 80px rgba(0,0,0,0.5), 0 0 ${20 + sendFlash * 80}px ${COLOR}${sent ? "aa" : "44"}`,
          }}
        >
          <div
            style={{
              width: 116,
              height: 116,
              flexShrink: 0,
              borderRadius: 58,
              background: `linear-gradient(135deg, ${COLOR}, #ffb36b)`,
              border: "4px solid rgba(255,255,255,0.85)",
              boxSizing: "border-box",
            }}
          />
          <div style={{ flex: 1, display: "flex", alignItems: "center", height: 130 }}>
            {typed ? (
              <span style={{ fontFamily: c.fontUi, fontWeight: 800, fontSize: 120, color: "#fff", letterSpacing: 2 }}>
                {typed}
              </span>
            ) : (
              <span style={{ fontFamily: c.fontUi, fontWeight: 600, fontSize: 48, color: "rgba(255,255,255,0.45)" }}>
                Add comment…
              </span>
            )}
            <div style={{ width: 8, height: typed ? 104 : 56, marginLeft: 10, borderRadius: 4, background: COLOR, opacity: caretOn ? 1 : 0 }} />
          </div>
          <div
            style={{
              width: 112,
              height: 112,
              flexShrink: 0,
              borderRadius: 56,
              background: sent ? "rgba(255,255,255,0.12)" : COLOR,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: !sent && chars === 0 ? 0.5 : 1,
            }}
          >
            {sent ? (
              <svg width={64} height={64} viewBox="0 0 48 48" style={{ transform: `scale(${heart.scale})` }}>
                <path
                  d="M24 41S6 30.5 6 17.5A9.5 9.5 0 0 1 24 13a9.5 9.5 0 0 1 18 4.5C42 30.5 24 41 24 41z"
                  fill="#ff3b5c"
                />
              </svg>
            ) : (
              <svg width={56} height={56} viewBox="0 0 48 48" fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M24 38V10M12 21l12-11 12 11" />
              </svg>
            )}
          </div>
        </div>

        {/* the reply */}
        <div
          style={{
            position: "absolute",
            left: 250,
            top: 730,
            width: 650,
            height: 140,
            ...glass(650),
            borderRadius: 70,
            background: "rgba(255,255,255,0.92)",
            display: "flex",
            alignItems: "center",
            gap: 24,
            padding: "0 34px",
            boxSizing: "border-box",
            opacity: reply.opacity,
            transform: `scale(${reply.scale})`,
            transformOrigin: "20% 0%",
          }}
        >
          <Img src={asset("/assets/agent/project-1794220665352/claude.svg")} style={{ width: 64, height: 64 }} />
          <span style={{ fontFamily: c.fontUi, fontWeight: 800, fontSize: 46, color: "#1b1d22", whiteSpace: "nowrap" }}>
            {params.reply}
          </span>
        </div>
      </Camera>
    </AbsoluteFill>
  );
}
