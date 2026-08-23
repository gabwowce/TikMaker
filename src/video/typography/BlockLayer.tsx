import React from "react";
import { AbsoluteFill } from "remotion";
import { colors, fontFamilies, fontSizes } from "./tokens";
import { AnimatedSplitText, AnimatedBox } from "./splitAnimate";
import type { Block } from "../../schema/scene";

const fontFor = (block: Block): string => (block.font === "clash" ? fontFamilies.clashMedium : fontFamilies.tanker);

const BlockUnit: React.FC<{ block: Block }> = ({ block }) => {
  const font = fontFor(block);
  const textStyle: React.CSSProperties = {
    fontFamily: font,
    fontSize: block.size ?? fontSizes.body,
    color: block.color ?? colors.textPrimary,
    letterSpacing: block.letterSpacing,
    textAlign: "center",
    whiteSpace: "nowrap",
    textTransform: font === fontFamilies.tanker ? "uppercase" : undefined,
  };

  const content = (
    <div style={textStyle}>
      <AnimatedSplitText
        text={block.text}
        splitBy={block.splitBy ?? "word"}
        baseDelay={block.delay ?? 0}
        preset={block.animation}
      />
    </div>
  );

  if (block.type === "badge") {
    return (
      <AnimatedBox
        delay={block.delay ?? 0}
        preset={block.animation}
        style={{
          display: "inline-flex",
          padding: "10px 24px",
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.06)",
          border: `1px solid ${block.color ?? colors.accent}`,
        }}
      >
        {content}
      </AnimatedBox>
    );
  }

  return content;
};

export const BlockLayer: React.FC<{ blocks?: Block[] }> = ({ blocks }) => {
  if (!blocks || blocks.length === 0) return null;

  return (
    <AbsoluteFill>
      {blocks.map((block) => (
        <div
          key={block.id}
          style={{
            position: "absolute",
            left: `${block.x}%`,
            top: `${block.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <BlockUnit block={block} />
        </div>
      ))}
    </AbsoluteFill>
  );
};
