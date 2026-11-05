import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { PackGrid } from "../../agent/stylePack";
import { usePack } from "./pack";

// Background: a soft lighter centre and, per the style pack, a barely visible
// grid (lines or dots) that slowly drifts. Shared by every stage composition
// and by the "stage" scene background (src/video/backgrounds), which the
// agent gives its motion scenes.
export function Backdrop() {
  const c = usePack();
  const frame = useCurrentFrame();
  const drift = (frame * 0.4) % c.grid.size;
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 70% 55% at 50% 42%, ${c.bgGlow}, ${c.bg} 75%)`,
        }}
      />
      {c.grid.kind === "none" ? null : (
        <AbsoluteFill
          style={{
            backgroundImage: gridImage(c.grid),
            backgroundSize: `${c.grid.size}px ${c.grid.size}px`,
            backgroundPosition: `${drift}px ${-drift * 0.6}px`,
            maskImage:
              "radial-gradient(ellipse 80% 70% at 50% 45%, black, transparent)",
          }}
        />
      )}
    </AbsoluteFill>
  );
}

// The grid's pattern as a CSS background image: thin white lines both ways,
// or one dot per cell.
function gridImage(grid: PackGrid): string {
  const ink = `rgba(255,255,255,${grid.opacity})`;
  if (grid.kind === "dots")
    return `radial-gradient(circle, ${ink} 2.5px, transparent 3px)`;
  return `linear-gradient(${ink} 2px, transparent 2px), linear-gradient(90deg, ${ink} 2px, transparent 2px)`;
}
