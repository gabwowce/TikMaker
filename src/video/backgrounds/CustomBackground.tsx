import type { CustomBackground as CustomBackgroundConfig } from "../../schema/scene";
import { backgroundFillStyle } from "./customBackgroundStyle";
import { GridOverlay } from "./GridOverlay";
type CustomBackgroundProps = {
  config: CustomBackgroundConfig;
};
export function CustomBackground({ config }: CustomBackgroundProps) {
  return (
    <div
      className={`absolute inset-0`}
      style={{
        ...backgroundFillStyle(config.fill),
      }}
    >
      {config.grid && config.grid !== "none" ? (
        <GridOverlay variant={config.grid} />
      ) : null}
    </div>
  );
}
