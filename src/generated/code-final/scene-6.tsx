import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { cardStyle, clamp, EASE_BOUNCE, Headline, popScale, prog, SlotList, Terminal } from "./shared";

export const description =
  "The finished three-command list slides to the left as a comment bubble pops up on the right and a Follow button pulses under it";

export const schema = z.object({
  pill: field.text("Strip", "MORE TIPS"),
  headline: field.text("Headline (*word* – key word)", "Want *more* tips?"),
  comment: field.text("The comment", "more Claude Code tips pls!"),
  handle: field.text("Commenter", "@you"),
  likes: field.number("Likes on the comment", 1284, { min: 0 }),
  button: field.text("Button", "+ Follow"),
  commentOn: field.word("Comment pops on", "comment"),
  followOn: field.word("Follow pulses on", "follow"),
});
type Params = z.infer<typeof schema>;

const RIGHT = { x: 545, w: 445 };
const PREV = { x: 90, y: 632, w: 900, h: 432 };

export default function Scene6({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();

  const commentAt = wordFrame(words, params.commentOn, 19) - 3;
  const followAt = wordFrame(words, params.followOn, 122) - 3;
  const theseAt = wordFrame(words, "these", 103) - 3;

  const morph = prog(frame, 4, 18);
  const termOut = prog(frame, 0, 8);
  const bubble = popScale(frame, commentAt, 0.6);
  const bubbleIn = prog(frame, commentAt, 8);
  const typed = Math.max(0, Math.min(params.comment.length, Math.floor((frame - commentAt - 6) * 1.6)));
  const likes = Math.round(
    interpolate(frame, [commentAt + 10, durationInFrames], [params.likes * 0.6, params.likes], clamp),
  );
  const heart = prog(frame, theseAt, 8, EASE_BOUNCE);
  const btnIn = prog(frame, followAt, 10, EASE_BOUNCE);
  const beat = (frame - followAt) % 24;
  const pulse = frame >= followAt + 10 ? 1 + 0.06 * Math.max(0, Math.sin((beat / 24) * Math.PI)) : 1;
  const ring = frame >= followAt + 10 ? (beat / 24) : 0;
  const float = Math.sin(frame / 22) * 6;
  const push = interpolate(frame, [0, durationInFrames], [1, 1.03], clamp);

  return (
    <AbsoluteFill>
      <Headline pill={params.pill} text={params.headline} />

      {termOut < 1 ? (
        <Terminal rect={PREV} style={{ opacity: 1 - termOut, scale: `${1 - termOut * 0.1}` }}>
          <div />
        </Terminal>
      ) : null}

      <div style={{ position: "absolute", inset: 0, translate: `0px ${float}px`, scale: `${push}` }}>
        <SlotList from="compact" to="side" t={morph} fill={[1, 1, 1]} done />

        {/* the comment */}
        <div
          style={{
            position: "absolute",
            left: RIGHT.x,
            width: RIGHT.w,
            top: 430,
            height: 360,
            boxSizing: "border-box",
            padding: 32,
            background: "#1B1B21",
            display: "flex",
            flexDirection: "column",
            gap: 20,
            ...cardStyle(RIGHT.w),
            borderRadius: 34,
            opacity: bubbleIn,
            scale: `${bubble}`,
            transformOrigin: "20% 100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                background: c.accent,
                color: c.bg,
                fontFamily: c.fontStrong,
                fontSize: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                paddingTop: 4,
                boxSizing: "border-box",
              }}
            >
              {params.handle.replace("@", "").slice(0, 1).toUpperCase()}
            </div>
            <div style={{ fontFamily: c.fontUi, fontSize: 32, fontWeight: 700, color: c.textSoft }}>
              {params.handle}
            </div>
          </div>
          <div style={{ fontFamily: c.fontUi, fontSize: 40, lineHeight: 1.25, color: c.text, flex: 1 }}>
            {params.comment.slice(0, typed)}
            <span style={{ opacity: typed < params.comment.length && Math.floor(frame / 12) % 2 === 0 ? 1 : 0 }}>
              |
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg width={44} height={40} viewBox="0 0 24 22" style={{ scale: `${1 + heart * 0.2 * (1 - prog(frame, theseAt + 8, 8))}` }}>
              <path
                d="M12 21 C5 15 1 11.5 1 7 A5.5 5.5 0 0 1 12 4.5 A5.5 5.5 0 0 1 23 7 C23 11.5 19 15 12 21 Z"
                fill={heart > 0.5 ? c.accent : "none"}
                stroke={heart > 0.5 ? c.accent : c.textSoft}
                strokeWidth={2}
              />
            </svg>
            <div style={{ fontFamily: c.fontUi, fontSize: 30, color: c.textSoft }}>{likes.toLocaleString("en-US")}</div>
            <div style={{ marginLeft: "auto", fontFamily: c.fontUi, fontSize: 28, color: c.textSoft }}>Reply</div>
          </div>
        </div>

        {/* the follow button */}
        <div
          style={{
            position: "absolute",
            left: RIGHT.x,
            width: RIGHT.w,
            top: 850,
            height: 150,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 999,
              border: `4px solid ${c.accent}`,
              opacity: ring > 0 ? 1 - ring : 0,
              scale: `${1 + ring * 0.25}`,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 999,
              background: c.accent,
              color: c.bg,
              fontFamily: c.fontStrong,
              fontSize: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 8,
              boxSizing: "border-box",
              boxShadow: `0 0 40px ${c.accent}66, 0 24px 64px rgba(0,0,0,0.5)`,
              opacity: btnIn,
              scale: `${interpolate(btnIn, [0, 1], [0.6, 1]) * pulse}`,
            }}
          >
            {params.button}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
