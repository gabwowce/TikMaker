import React from "react";
import { staggerDelay } from "../scenes/EnterOnCue";
import { colors, fontFamilies, fontSizes } from "./tokens";
import { pillBlockStyle } from "./Text";
import { AnimatedSplitText, AnimatedBox, splitText, unitStaggerFor } from "./splitAnimate";
import type { RichHeadlineLine } from "../../schema/scene";

const fontForLine = (line: RichHeadlineLine): string => {
  if (line.font === "tanker") return fontFamilies.tanker;
  if (line.font === "clash") return fontFamilies.clashMedium;
  return line.size === "hero" || line.size === "headline" ? fontFamilies.tanker : fontFamilies.clashMedium;
};

const LINE_GAP = 6;

const RichHeadlineLineRow: React.FC<{ line: RichHeadlineLine; baseDelay: number }> = ({ line, baseDelay }) => {
  const splitBy = line.splitBy ?? "word";
  const font = fontForLine(line);

  const content = (
    <div
      style={{
        fontFamily: font,
        fontSize: fontSizes[line.size],
        lineHeight: 0.95,
        color: line.pill ? colors.background : colors.textPrimary,
        textAlign: "center",
        textTransform: font === fontFamilies.tanker ? "uppercase" : undefined,
      }}
    >
      <AnimatedSplitText text={line.text} splitBy={splitBy} baseDelay={baseDelay} preset={line.animation} />
    </div>
  );

  if (line.pill) {
    return (
      <AnimatedBox delay={baseDelay} preset={line.animation} style={{ ...pillBlockStyle, lineHeight: 0.95 }}>
        {content}
      </AnimatedBox>
    );
  }

  return content;
};

export const RichHeadline: React.FC<{ lines: RichHeadlineLine[]; stagger?: number }> = ({ lines, stagger }) => {
  let cumulativeDelay = 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: LINE_GAP }}>
      {lines.map((line, index) => {
        const delay = cumulativeDelay;
        const splitBy = line.splitBy ?? "word";
        const unitCount = splitText(line.text, splitBy).length;
        cumulativeDelay += unitCount * unitStaggerFor(splitBy) + staggerDelay(1, stagger);
        return <RichHeadlineLineRow key={index} line={line} baseDelay={delay} />;
      })}
    </div>
  );
};
