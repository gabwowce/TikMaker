import { z } from "zod";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { MONO, SCENE_COLORS, asset, field, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Backdrop, Camera, Headline, OUT, cardMotion, clampAll, usePop } from "./shared";

export const description =
  "On a light scene the creator's storyboard – eight pictures from the glowing bulb to the night city – lands as a big photo card while an orange frame walks over the pictures; then it shrinks and drops into a Claude Code prompt bar as an attached image, '[Image #1] the look I want'. A 'ChatGPT · free' badge pops on the picture when ChatGPT is said";

export const schema = z.object({
  storyboard: field.photo(
    "Reference picture",
    "The picture you gave Claude Code of the look you wanted (the storyboard sheet)",
  ),
  headline: field.text("Headline", "+ a *picture*"),
  badge: field.text("Badge on the picture", "ChatGPT · free"),
  badgeOn: field.word("Badge pops on", "ChatGPT"),
  prompt: field.text("Prompt text", "the look I want"),
  walkFrom: field.word("Frame starts walking on", "picture"),
  dropOn: field.word("Picture drops into Claude on", "Claude"),
});
type Params = z.infer<typeof schema>;

// The storyboard the creator gave: 4 pictures across, 2 down.
const STORYBOARD = "/assets/agent/project-1794220665352/storyboard.webp";
const COLS = 4;
const ROWS = 2;
const RATIO = 1750 / 1612;
const COLOR = SCENE_COLORS.orange;

// The Claude Code prompt bar the picture is dropped into.
const BAR = { left: 130, top: 905, width: 770, height: 130 };
const THUMB = 96;

export default function Scene3({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const heads = params.headline.split(" ").map((t, i) => ({ text: t, at: 3 + i * 4 }));

  const width = 610;
  const height = Math.round(width * RATIO);
  const top = 400;

  // The drop: the card shrinks into the prompt bar as an attachment.
  const dropAt = Math.min(wordFrame(words, params.dropOn, 40), durationInFrames - 30);
  const drop = interpolate(frame, [dropAt, dropAt + 16], [0, 1], { ...clampAll, easing: OUT });
  const scale = interpolate(drop, [0, 1], [1, THUMB / (width + 28)]);
  const fromX = 515;
  const fromY = top + (height + 28) / 2;
  const toX = BAR.left + 34 + THUMB / 2;
  const toY = BAR.top + BAR.height / 2;
  const dx = interpolate(drop, [0, 1], [0, toX - fromX]);
  const dy = interpolate(drop, [0, 1], [0, toY - fromY]);

  // Before the drop, an orange frame steps through the pictures in story order.
  const start = wordFrame(words, params.walkFrom, 6);
  const step = Math.max(3, (dropAt - start) / (COLS * ROWS));
  const index = Math.min(COLS * ROWS - 1, Math.max(0, Math.floor((frame - start) / step)));
  const settle = spring({ frame: frame - (start + index * step), fps, config: { damping: 14, stiffness: 220 } });
  const walking = interpolate(frame, [start - 4, start + 2, dropAt - 2, dropAt + 4], [0, 1, 1, 0], clampAll);
  const cellW = width / COLS;
  const cellH = height / ROWS;

  const bar = interpolate(frame, [dropAt - 8, dropAt + 4], [0, 1], { ...clampAll, easing: OUT });
  const typed = Math.max(0, Math.floor((frame - dropAt - 14) / 1.6));
  const promptText = params.prompt.slice(0, typed);
  const badgeAt = wordFrame(words, params.badgeOn, 50);
  const badge = usePop(badgeAt);
  const glow = interpolate(frame, [dropAt + 12, dropAt + 18, dropAt + 40], [0, 1, 0.4], clampAll);

  return (
    <AbsoluteFill>
      <Backdrop color={COLOR} light y={760} />
      <Camera duration={durationInFrames}>
        <Headline lines={[heads]} top={265} size={92} color={COLOR} light />

        {/* Claude Code's prompt bar */}
        <div
          style={{
            position: "absolute",
            ...BAR,
            borderRadius: 30,
            background: "#1c1c2c",
            border: `2px solid ${COLOR}`,
            boxShadow: `0 20px 50px rgba(20,30,60,0.25), 0 0 ${50 * glow}px ${COLOR}`,
            opacity: bar,
            transform: `translateY(${(1 - bar) * 60}px)`,
            display: "flex",
            alignItems: "center",
            paddingLeft: 34 + THUMB + 22,
            boxSizing: "border-box",
            fontFamily: MONO,
            fontSize: 34,
            color: "#e6e6f0",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ position: "absolute", left: 10, color: COLOR, fontSize: 30 }}>❯</span>
          <span style={{ color: "#c4a7ff" }}>[Image #1]</span>
          <span>&nbsp;{promptText}</span>
          {frame > dropAt + 14 && Math.floor(frame / 8) % 2 === 0 ? (
            <span style={{ width: 16, height: 38, background: "#e6e6f0", marginLeft: 4 }} />
          ) : null}
        </div>

        {/* the picture: big, then dropped into the bar */}
        <div
          style={{
            position: "absolute",
            left: 515 - width / 2 - 14,
            top,
            width: width + 28,
            height: height + 28,
            padding: 14,
            boxSizing: "border-box",
            background: "#ffffff",
            borderRadius: 30,
            boxShadow: "0 4px 12px rgba(20,30,60,0.08), 0 24px 60px rgba(20,30,60,0.18)",
            transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
            ...(drop === 0 ? cardMotion(frame, -6) : {}),
          }}
        >
          <div style={{ position: "relative", width, height, borderRadius: 18, overflow: "hidden" }}>
            <Img src={asset(params.storyboard || STORYBOARD)} style={{ width, height, display: "block" }} />
            {frame >= badgeAt - 3 && (
              <div
                style={{
                  position: "absolute",
                  right: 18,
                  top: 18,
                  zIndex: 2,
                  height: 64,
                  padding: "0 26px",
                  borderRadius: 32,
                  background: "#ffffff",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
                  display: "flex",
                  alignItems: "center",
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontWeight: 800,
                  fontSize: 30,
                  color: "#10a37f",
                  opacity: badge.opacity,
                  transform: `scale(${badge.scale})`,
                  transformOrigin: "right top",
                }}
              >
                {params.badge}
              </div>
            )}
            {Array.from({ length: COLS * ROWS }, (_, i) =>
              i === index ? null : (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: (i % COLS) * cellW,
                    top: Math.floor(i / COLS) * cellH,
                    width: cellW,
                    height: cellH,
                    background: "rgba(246,247,249,0.42)",
                    opacity: walking,
                  }}
                />
              ),
            )}
            <div
              style={{
                position: "absolute",
                left: (index % COLS) * cellW + 3,
                top: Math.floor(index / COLS) * cellH + 3,
                width: cellW - 6,
                height: cellH - 6,
                borderRadius: 12,
                border: `5px solid ${COLOR}`,
                boxShadow: `0 0 26px ${COLOR}aa, inset 0 0 18px ${COLOR}55`,
                boxSizing: "border-box",
                opacity: walking,
                transform: `scale(${0.92 + 0.08 * settle})`,
              }}
            />
          </div>
        </div>
      </Camera>
    </AbsoluteFill>
  );
}
