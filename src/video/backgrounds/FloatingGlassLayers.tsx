import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { colors } from "../typography/tokens";

type Panel = {
  left: number;
  top: number;
  width: number;
  height: number;
  rotate: number;
  driftX: number;
  driftY: number;
  period: number;
  phase: number;
};

const panels: Panel[] = [
  { left: -260, top: -180, width: 780, height: 900, rotate: -8, driftX: 18, driftY: 12, period: 340, phase: 0 },
  { left: 560, top: 120, width: 820, height: 1000, rotate: 6, driftX: -22, driftY: 16, period: 410, phase: 60 },
  { left: -320, top: 980, width: 900, height: 1000, rotate: -5, driftX: 14, driftY: -18, period: 380, phase: 130 },
  { left: 480, top: 1300, width: 760, height: 800, rotate: 9, driftX: -16, driftY: -12, period: 300, phase: 200 },
];

export const FloatingGlassLayers: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: colors.background, overflow: "hidden" }}>
      {panels.map((panel, i) => {
        const x = interpolate(Math.sin((frame + panel.phase) / panel.period), [-1, 1], [-panel.driftX, panel.driftX]);
        const y = interpolate(Math.cos((frame + panel.phase) / panel.period), [-1, 1], [-panel.driftY, panel.driftY]);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: panel.left + x,
              top: panel.top + y,
              width: panel.width,
              height: panel.height,
              borderRadius: 48,
              transform: `rotate(${panel.rotate}deg)`,
              background: "linear-gradient(160deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 45%, rgba(255,112,36,0.03) 100%)",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 0 120px rgba(0,0,0,0.35)",
              backdropFilter: "blur(2px)",
            }}
          />
        );
      })}

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 40%, rgba(0,0,0,0) 0%, ${colors.background} 78%)`,
        }}
      />
    </div>
  );
};
