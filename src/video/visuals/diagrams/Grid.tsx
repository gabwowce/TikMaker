import { useCurrentFrame, useVideoConfig } from "remotion";
import type { VisualConfig } from "../../../schema/visual";
import { gridCell, GRID_GAP } from "../../layout/visualMetrics";
import { enter } from "../../motion/entrances";
import { VisualRenderer } from "../VisualRenderer";

type GridProps = {
  items: VisualConfig[];
  columns?: number;
  stagger?: number;
};

// Equal cells, sized to the largest item, so four screenshots of different
// shapes still read as one comparable set. Cells arrive one by one — the
// grid is usually "look, another one", and the stagger is that beat.
export function Grid({ items, columns = 2, stagger = 8 }: GridProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cell = gridCell(items);
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${columns}, ${cell.width}px)`,
        gridAutoRows: `${cell.height}px`,
        gap: GRID_GAP,
      }}
    >
      {items.map((item, index) => (
        <div
          key={index}
          className="flex items-center justify-center"
          style={enter("scaleIn", { frame, fps, delay: index * stagger })}
        >
          <VisualRenderer visual={item} />
        </div>
      ))}
    </div>
  );
}
