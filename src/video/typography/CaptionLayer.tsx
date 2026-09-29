import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { VideoProject } from "../../schema/project";
import { captionTimeline } from "../../utils/captions";
import { enter } from "../motion/entrances";
import { Pill } from "./Text";
import { colors, fontSizes, safeArea } from "./tokens";

// Just above TikTok's bottom UI (the caption/description band), so it
// never sits under the app's own text.
export const DEFAULT_CAPTION_Y = 70;

// Word-by-word captions over the whole video, drawn from the voiceover's own
// timings. The word being spoken is the pill; the chunk arrives with a pop so
// each new phrase reads as a beat rather than a text swap.
export function CaptionLayer({ project }: { project: VideoProject }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (project.captions?.enabled === false) return null;
  const chunk = captionTimeline(project, fps).find((c) => frame >= c.from && frame < c.to);
  if (!chunk) return null;
  const y = project.captions?.y ?? DEFAULT_CAPTION_Y;
  // The word most recently STARTED stays the pill through the gap after it,
  // so the box moves word to word instead of blinking off between them.
  const activeIndex = chunk.words.reduce((last, w, i) => (frame >= w.from ? i : last), 0);
  return (
    <AbsoluteFill className="pointer-events-none">
      <div
        className="absolute flex justify-center [font-family:Tanker-Regular] uppercase text-center"
        style={{
          left: safeArea.left,
          right: safeArea.right,
          top: `${y}%`,
          transform: "translateY(-50%)",
          fontSize: fontSizes.title,
          lineHeight: 1.05,
          color: colors.textPrimary,
          textShadow: "0 4px 24px rgba(0,0,0,0.85)",
          ...enter("pop", { frame, fps, delay: chunk.from }),
        }}
      >
        <span>
          {chunk.words.map((word, i) => {
            const active = i === activeIndex;
            return (
              <span key={i} style={{ opacity: i <= activeIndex ? 1 : 0.55 }}>
                {i > 0 ? " " : null}
                {active ? <Pill>{word.text}</Pill> : word.text}
              </span>
            );
          })}
        </span>
      </div>
    </AbsoluteFill>
  );
}
