import type { CustomBackground } from "../../schema/scene";
import { backgroundFillStyle } from "../../video/backgrounds/customBackgroundStyle";
import { GridOverlay } from "../../video/backgrounds/GridOverlay";
export function BackgroundSwatch({
  background,
}: {
  background: CustomBackground;
}) {
  return (
    <div
      className="relative h-20 overflow-hidden rounded"
      style={backgroundFillStyle(background.fill)}
    >
      {background.grid && background.grid !== "none" ? (
        <GridOverlay variant={background.grid} />
      ) : null}
    </div>
  );
}
