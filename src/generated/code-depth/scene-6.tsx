import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, Logo, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Backdrop, Camera, CL, Dock, glass, Headline, HUE, ramp, usePop } from "./shared";

export const description =
  "The finished three-command dock shrinks up; a big glass comment bubble pops in, then an orange Follow button lands below it and pulses";

export const schema = z.object({
  title1: field.text("Headline 1", "More *tips?*"),
  title2: field.text("Headline 2", "*Follow* for more"),
  comment: field.text("Comment bubble text", "More tips like this!"),
  button: field.text("Button", "Follow"),
  commentOn: field.word("Comment pops on", "comment"),
  followOn: field.word("Follow button lands on", "follow"),
});
type Params = z.infer<typeof schema>;

function BubbleIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M4 5 H20 V16 H11 L6 20 V16 H4 Z" fill="#fff" stroke="#fff" strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

export default function Scene6({ words, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const pop = usePop();
  const commentAt = wordFrame(words, params.commentOn, 19);
  const moreAt = wordFrame(words, "more", 56);
  const followAt = wordFrame(words, params.followOn, 122);

  const dockShrink = ramp(frame, 4, 16);
  const bP = pop(frame, commentAt - 3);
  const back = ramp(frame, followAt - 4, 14); // bubble steps back when the button lands
  const fP = pop(frame, followAt - 2);
  const pulse = frame > followAt + 12 ? Math.sin((frame - followAt - 12) / 6) * 0.035 : 0;
  const ring = ((frame - followAt - 12) % 36) / 36;
  const by = Math.sin(frame / 14) * 8;

  return (
    <AbsoluteFill>
      <Backdrop hue={HUE.orange} from={HUE.violet} />
      <Camera punches={[commentAt, followAt]}>
        {/* the comment bubble */}
        <div
          style={{
            position: "absolute",
            left: 140,
            top: 610 - back * 120,
            width: 800,
            height: 300,
            perspective: 1200,
            opacity: Math.min(1, bP * 1.5) * (1 - back * 0.35),
            filter: back > 0.05 ? `blur(${back * 4}px)` : undefined,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              transform: `translateY(${by}px) scale(${(0.5 + 0.5 * bP) * (1 - back * 0.12)}) rotateY(-14deg) rotateX(8deg) rotateZ(${Math.sin(frame / 45) * 0.8}deg)`,
              transformOrigin: "20% 100%",
              display: "flex",
              alignItems: "center",
              gap: 30,
              padding: "0 44px",
              ...glass(800, { borderRadius: 60 }),
            }}
          >
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                flexShrink: 0,
                background: c.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 0 40px ${c.accent}88`,
              }}
            >
              <BubbleIcon size={66} />
            </div>
            <div style={{ fontFamily: c.fontStrong, fontSize: 60, lineHeight: 1.1, color: "#fff" }}>{params.comment}</div>
          </div>
        </div>
        {/* the follow button */}
        {frame >= followAt - 2 ? (
          <div
            style={{
              position: "absolute",
              left: 190,
              top: 860,
              width: 700,
              height: 170,
            }}
          >
            {frame > followAt + 12 ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 85,
                  border: `4px solid ${c.accent}`,
                  transform: `scale(${1 + ring * 0.25})`,
                  opacity: 0.7 * (1 - ring),
                }}
              />
            ) : null}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 85,
                background: c.accent,
                boxShadow: `0 0 70px ${c.accent}aa, 0 32px 80px rgba(0,0,0,0.5)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 26,
                transform: `translateY(${(1 - Math.min(1, fP)) * 120}px) scale(${(0.5 + 0.5 * fP) + pulse})`,
                opacity: Math.min(1, fP * 1.5),
                fontFamily: c.fontStrong,
                fontSize: 84,
                color: "#fff",
              }}
            >
              <div
                style={{
                  width: 104,
                  height: 104,
                  borderRadius: 52,
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Logo id="claude" size={70} />
              </div>
              + {params.button}
            </div>
          </div>
        ) : null}
      </Camera>
      <Dock hue={HUE.orange} filled={3} allDone scale={interpolate(dockShrink, [0, 1], [1, 0.72], CL)} dy={-10 * dockShrink} />
      <Headline
        top={340}
        lines={[
          { text: params.title1, at: moreAt },
          { text: params.title2, at: followAt },
        ]}
      />
    </AbsoluteFill>
  );
}
