import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Badge,
  BADGE,
  bounceIn,
  ChatBubble,
  clamp,
  EASE_OUT,
  GREY,
  IconChip,
  LIGHT,
  ListIcon,
  mix,
  PersonIcon,
  Stage,
  WrenchIcon,
} from "./shared";

export const description =
  "The chat bubble turns into an employee ID badge; three icon chips snap on below it one by one – role, responsibilities, tools – each lighting orange as it is named";

export const schema = z.object({
  morphOn: field.word("Bubble becomes a badge on", "different"),
  roleOn: field.word("Role chip on", "role"),
  dutiesOn: field.word("Responsibilities chip on", "responsibilities"),
  toolsOn: field.word("Tools chip on", "tools"),
});
type Params = z.infer<typeof schema>;

const BUBBLE = { x: 90, y: 400, w: 640, h: 230 };
const CHIP = { size: 170, y: 870, xs: [270, 540, 810] };

export default function Scene3({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const morphAt = wordFrame(words, params.morphOn, 31) - 4;
  const chipAt = [
    wordFrame(words, params.roleOn, 59) - 3,
    wordFrame(words, params.dutiesOn, 78) - 3,
    wordFrame(words, params.toolsOn, 112) - 3,
  ];

  const m = interpolate(frame, [morphAt, morphAt + 16], [0, 1], { ...clamp, easing: EASE_OUT });
  const settle = interpolate(frame, [morphAt + 10, morphAt + 16, morphAt + 22], [1, 1.02, 1], clamp);

  // morph geometry: from the bubble's box to the badge's box
  const bCx = BUBBLE.x + BUBBLE.w / 2;
  const bCy = BUBBLE.y + BUBBLE.h / 2;
  const gCx = BADGE.x + BADGE.w / 2;
  const gCy = BADGE.y + BADGE.h / 2;
  const cx = mix(bCx, gCx, m);
  const cy = mix(bCy, gCy, m);
  const sx = mix(1, BADGE.w / BUBBLE.w, m);
  const sy = mix(1, BADGE.h / BUBBLE.h, m);

  const hotIdx = chipAt.reduce((acc, at, i) => (frame >= at ? i : acc), -1);
  const icons = [PersonIcon, ListIcon, WrenchIcon];

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        {/* the chat bubble, stretching into the badge and fading */}
        {m < 1 ? (
          <ChatBubble
            x={BUBBLE.x}
            y={BUBBLE.y}
            w={BUBBLE.w}
            h={BUBBLE.h}
            side="left"
            bars={[0.9, 0.75, 0.5]}
            style={{
              translate: `${cx - bCx}px ${cy - bCy}px`,
              scale: `${sx} ${sy}`,
              opacity: 1 - m,
            }}
          />
        ) : null}

        <Badge
          style={{
            translate: `${cx - gCx}px ${cy - gCy}px`,
            scale: `${mix(BUBBLE.w / BADGE.w, 1, m) * settle} ${mix(BUBBLE.h / BADGE.h, 1, m) * settle}`,
            opacity: m,
          }}
        />

        {/* the three chips snapping on */}
        {CHIP.xs.map((x, i) => {
          const s = bounceIn(frame, chipAt[i], 11);
          if (s <= 0.001) return null;
          const Icon = icons[i];
          const hot = hotIdx === i ? 1 : 0;
          const line = interpolate(frame, [chipAt[i], chipAt[i] + 8], [0, 1], clamp);
          const lineTop = BADGE.y + BADGE.h;
          return (
            <div key={i}>
              <div
                style={{
                  position: "absolute",
                  left: x - 4,
                  top: lineTop,
                  width: 8,
                  height: (CHIP.y - lineTop) * line,
                  borderRadius: 4,
                  background: hot ? c.accent : GREY,
                }}
              />
              <IconChip
                size={CHIP.size}
                hot={hot}
                style={{
                  position: "absolute",
                  left: x - CHIP.size / 2,
                  top: CHIP.y,
                  scale: `${s}`,
                  translate: `0px ${(1 - Math.min(1, s)) * -40}px`,
                }}
              >
                <Icon size={CHIP.size * 0.56} color={hot ? c.bg : LIGHT} />
              </IconChip>
            </div>
          );
        })}
      </Stage>
    </AbsoluteFill>
  );
}
