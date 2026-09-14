import { AbsoluteFill, Audio, Sequence, useCurrentFrame } from "remotion";
import { getSfx } from "../../registries/sfxRegistry";
import type { Block } from "../../schema/scene";
import { timelineLayerZIndex } from "../layout/layerOrder";
import { resolveTextEntranceSfx, SFX_VOLUME } from "../motion/sfxDefaults";
import {
  AnimatedBox,
  AnimatedSplitText,
  splitText,
  splitTiming,
} from "./splitAnimate";
import { fontFamilyFor, textTransformFor } from "./textStyle";
import { colors, fontFamilies, fontSizes } from "./tokens";
const CUE_WINDOW_FRAMES = 30;
function fontFor(block: Block): string {
  return fontFamilyFor(block.font, "tanker");
}
type BlockUnitProps = {
  block: Block;
  baseDelay: number;
  durationInFrames: number;
};
function BlockUnit({ block, baseDelay, durationInFrames }: BlockUnitProps) {
  const delay = block.delay ?? baseDelay;
  const font = fontFor(block);

  const content = (
    <div
      className="text-center whitespace-nowrap"
      style={{
        fontFamily: font,
        fontSize: block.size ?? fontSizes.body,
        color: block.color ?? colors.textPrimary,
        letterSpacing: block.letterSpacing,
        textTransform: textTransformFor(
          block.textCase,
          font === fontFamilies.tanker ? "upper" : "none",
        ),
      }}
    >
      <AnimatedSplitText
        text={block.text}
        splitBy={block.splitBy ?? "word"}
        baseDelay={delay}
        preset={block.animation}
        entranceDuration={block.entranceDuration}
        splitDuration={block.splitDuration}
        exit={
          block.exit
            ? {
                preset: block.exit,
                durationInFrames: block.exitAt ?? durationInFrames,
                exitDuration: block.exitDuration,
              }
            : undefined
        }
      />
    </div>
  );
  if (block.type === "badge") {
    return (
      <AnimatedBox
        delay={delay}
        preset={block.animation}
        entranceDuration={block.splitDuration ?? block.entranceDuration}
        exit={
          block.exit
            ? {
                preset: block.exit,
                durationInFrames: block.exitAt ?? durationInFrames,
                exitDuration: block.exitDuration,
              }
            : undefined
        }
        className="inline-flex p-[10px_24px] rounded-[999px] bg-[rgba(255,255,255,0.06)]"
        style={{
          border: `1px solid ${block.color ?? colors.accent}`,
        }}
      >
        {content}
      </AnimatedBox>
    );
  }
  return content;
}
type BlockSfxCuesProps = {
  block: Block;
  sfxSrc: string;
  baseDelay: number;
};
function BlockSfxCues({ block, sfxSrc, baseDelay }: BlockSfxCuesProps) {
  const splitBy = block.splitBy ?? "word";
  const start = Math.max(0, block.delay ?? baseDelay);
  if (splitBy === "line") {
    return (
      <Sequence from={start} durationInFrames={CUE_WINDOW_FRAMES} layout="none">
        <Audio src={sfxSrc} volume={SFX_VOLUME} />
      </Sequence>
    );
  }
  const units = splitText(block.text, splitBy);
  const stagger = splitTiming(
    splitBy,
    splitText(block.text, splitBy).length,
    block.splitDuration,
    block.entranceDuration,
  ).stagger;
  return (
    <>
      {units.map((unit, index) =>
        unit.trim().length === 0 ? null : (
          <Sequence
            key={index}
            from={Math.round(start + index * stagger)}
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
type BlockLayerProps = {
  blocks?: Block[];
  baseDelay?: number;
  durationInFrames: number;
};
export function BlockLayer({
  blocks,
  baseDelay = 0,
  durationInFrames,
}: BlockLayerProps) {
  const frame = useCurrentFrame();
  if (!blocks || blocks.length === 0) return null;
  return (
    <AbsoluteFill>
      {blocks.map((block) => {
        const resolvedSfxId = resolveTextEntranceSfx({
          override: block.sfx,
          entrance: block.animation ?? "pop",
          splitBy: block.splitBy ?? "word",
        });
        const sfxSrc = resolvedSfxId ? getSfx(resolvedSfxId)?.src : undefined;
        return (
          <div
            key={block.id}
            className={`absolute [transform:translate(-50%,_-50%)] ${block.exitAt === undefined || frame < block.exitAt ? "[visibility:visible]" : "[visibility:hidden]"}`}
            style={{
              left: `${block.x}%`,
              top: `${block.y}%`,
              zIndex: timelineLayerZIndex(block.lane),
            }}
          >
            <BlockUnit
              block={block}
              baseDelay={baseDelay}
              durationInFrames={durationInFrames}
            />
            {sfxSrc ? (
              <BlockSfxCues
                block={block}
                sfxSrc={sfxSrc}
                baseDelay={baseDelay}
              />
            ) : null}
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
