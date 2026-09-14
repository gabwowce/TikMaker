import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { VisualConfig } from "../../../schema/visual";
import { VisualRenderer } from "../VisualRenderer";
type StackProps = {
  items: VisualConfig[];
  direction?: "vertical" | "horizontal";
};
export function Stack({ items, direction = "vertical" }: StackProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vertical = direction === "vertical";
  return (
    <div className="relative flex flex-col items-center">
      {items.map((item, index) => {
        const delay = index * 8;
        const progress = spring({
          frame: frame - delay,
          fps,
          config: { damping: 200, stiffness: 200, mass: 0.7 },
        });
        const offset = interpolate(progress, [0, 1], [40, 0]);
        const opacity = interpolate(frame - delay, [0, 10], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={index}
            className={`${index === 0 ? "mt-0" : vertical ? "mt-[-28px]" : "mt-0"} ${index === 0 || vertical ? "ml-0" : "ml-[-28px]"}`}
            style={{
              transform: vertical
                ? `translateY(${offset}px) rotate(${(index % 2 === 0 ? -1 : 1) * 1.5}deg)`
                : `translateX(${offset}px) rotate(${(index % 2 === 0 ? -1 : 1) * 1.5}deg)`,
              opacity,
              zIndex: index,
            }}
          >
            <VisualRenderer visual={item} />
          </div>
        );
      })}
    </div>
  );
}
