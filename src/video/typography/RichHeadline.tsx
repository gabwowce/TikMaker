import { Audio, Sequence, useVideoConfig } from "remotion";
import { getSfx } from "../../registries/sfxRegistry";
import type { RichHeadlineLine, Scene } from "../../schema/scene";
import { timelineLayerZIndex } from "../layout/layerOrder";
import { SAFE_CONTENT_WIDTH } from "../layout/layoutPresets";
import { resolveTextEntranceSfx, SFX_VOLUME } from "../motion/sfxDefaults";
import { staggerDelay } from "../scenes/EnterOnCue";
import {
  AnimatedBox,
  AnimatedSplitText,
  splitSpan,
  splitText,
  splitTiming,
  type ExitConfig,
} from "./splitAnimate";
import { fontFamilyFor, textTransformFor } from "./textStyle";
import { colors, fontSizes, safeArea } from "./tokens";

const CUE_WINDOW_FRAMES = 30;
type RichHeadlineLineRowProps = {
  line: RichHeadlineLine;
  baseDelay: number;
  exit: ExitConfig;
};
function RichHeadlineLineRow({
  line,
  baseDelay,
  exit,
}: RichHeadlineLineRowProps) {
  const splitBy = line.splitBy ?? "word";
  const font = fontFamilyFor(line.font, "tanker");
  const resolvedPreset = line.exit ?? exit.preset;
  const resolvedExit: ExitConfig | undefined =
    resolvedPreset || line.exitAt !== undefined
      ? {
          ...exit,
          preset: resolvedPreset ?? "fade",
          durationInFrames: line.exitAt ?? exit.durationInFrames,
          exitDistance: line.exitDistance ?? exit.exitDistance,
          exitDuration: line.exitDuration ?? exit.exitDuration,
          exitDelay: line.exitDelay,
        }
      : undefined;
  const content = (
    <div
      className="[line-height:0.95] text-center"
      style={{
        fontFamily: font,
        fontSize: line.sizePx ?? fontSizes[line.size],
        color:
          line.color ?? (line.pill ? colors.background : colors.textPrimary),
        letterSpacing: line.letterSpacing,
        textTransform: textTransformFor(line.textCase, "upper"),
      }}
    >
      <AnimatedSplitText
        text={line.text}
        splitBy={splitBy}
        baseDelay={baseDelay}
        preset={line.animation}
        entranceDuration={line.entranceDuration}
        splitDuration={line.splitDuration}
        highlights={line.highlights}
        exit={resolvedExit}
      />
    </div>
  );
  if (line.pill) {
    return (
      <AnimatedBox
        delay={baseDelay}
        preset={line.animation}
        entranceDuration={line.splitDuration ?? line.entranceDuration}
        exit={resolvedExit}
        className="inline-block bg-brand-text text-brand-bg p-[0.12em_0.35em] rounded-[10px] [line-height:0.95]"
      >
        {content}
      </AnimatedBox>
    );
  }
  return content;
}
type RichHeadlineLineSfxProps = {
  line: RichHeadlineLine;
  baseDelay: number;
};
function RichHeadlineLineSfx({ line, baseDelay }: RichHeadlineLineSfxProps) {
  const splitBy = line.splitBy ?? "word";
  const resolvedSfxId = resolveTextEntranceSfx({
    override: line.sfx,
    entrance: line.animation ?? "pop",
    splitBy,
  });
  const sfxSrc = resolvedSfxId ? getSfx(resolvedSfxId)?.src : undefined;
  if (!sfxSrc) return null;
  if (splitBy === "line") {
    return (
      <Sequence
        from={Math.max(0, baseDelay)}
        durationInFrames={CUE_WINDOW_FRAMES}
        layout="none"
      >
        <Audio src={sfxSrc} volume={SFX_VOLUME} />
      </Sequence>
    );
  }
  const units = splitText(line.text, splitBy);
  const stagger = splitTiming(
    splitBy,
    splitText(line.text, splitBy).length,
    line.splitDuration,
    line.entranceDuration,
  ).stagger;
  return (
    <>
      {units.map((unit, index) =>
        unit.trim().length === 0 ? null : (
          <Sequence
            key={index}
            from={Math.round(Math.max(0, baseDelay) + index * stagger)}
            durationInFrames={CUE_WINDOW_FRAMES}
            layout="none"
          >
            <Audio src={sfxSrc} volume={SFX_VOLUME} />
          </Sequence>
        ),
      )}
    </>
  );
}
type RichHeadlineProps = {
  lines: RichHeadlineLine[];
  stagger?: number;
  baseDelay?: number;
  motion?: Scene["motion"];
  durationSeconds?: number;
  x?: number;
  y?: number;
};
export function RichHeadline({
  lines,
  stagger,
  baseDelay = 0,
  motion,
  durationSeconds,
  x,
  y,
}: RichHeadlineProps) {
  const { fps } = useVideoConfig();
  const sharedExit: ExitConfig = {
    preset: motion?.exit,
    durationInFrames: (durationSeconds ?? 0) * fps,
    exitDuration: motion?.exitDuration,
    exitDistance: motion?.exitDistance,
  };
  let cumulativeDelay = baseDelay;
  const timed = lines.map((line) => {
    const delay = line.delay ?? cumulativeDelay;
    const splitBy = line.splitBy ?? "word";
    cumulativeDelay +=
      splitSpan(line.text, splitBy, line.splitDuration, line.entranceDuration) +
      staggerDelay(1, stagger);
    return { line, delay };
  });
  function isFree(line: RichHeadlineLine) {
    return line.x !== undefined && line.y !== undefined;
  }
  const stacked = timed.filter((entry) => !isFree(entry.line));
  const free = timed.filter((entry) => isFree(entry.line));
  const stackPositioned = x !== undefined || y !== undefined;
  return (
    <>
      <div
        className={`flex flex-col items-center gap-1.5`}
        style={{
          ...(!stackPositioned
            ? {}
            : {
                position: "absolute",
                top: `${y ?? 50}%`,
                ...(x === undefined
                  ? {
                      left: safeArea.left,
                      right: safeArea.right,
                      transform: "translateY(-50%)",
                    }
                  : { left: `${x}%`, transform: "translate(-50%, -50%)" }),
              }),
        }}
      >
        {stacked.map(({ line, delay }, index) => (
          <div
            key={index}
            className="relative"
            style={{
              zIndex: timelineLayerZIndex(line.lane),
            }}
          >
            <RichHeadlineLineRow
              line={line}
              baseDelay={delay}
              exit={sharedExit}
            />
            <RichHeadlineLineSfx line={line} baseDelay={delay} />
          </div>
        ))}
      </div>

      {free.map(({ line, delay }, index) => (
        <div
          key={index}
          className="absolute [transform:translate(-50%,_-50%)] w-[max-content]"
          style={{
            left: `${line.x}%`,
            top: `${line.y}%`,
            maxWidth: SAFE_CONTENT_WIDTH,
            zIndex: timelineLayerZIndex(line.lane),
          }}
        >
          <RichHeadlineLineRow
            line={line}
            baseDelay={delay}
            exit={sharedExit}
          />
          <RichHeadlineLineSfx line={line} baseDelay={delay} />
        </div>
      ))}
    </>
  );
}
