import { Img, Video } from "remotion";
import type {
  BackgroundFill,
  CustomBackground as CustomBackgroundConfig,
} from "../../schema/scene";
import { assetUrl } from "../../utils/assetUrl";
import { backgroundFillStyle } from "./customBackgroundStyle";
import { GridOverlay } from "./GridOverlay";
type CustomBackgroundProps = {
  config: CustomBackgroundConfig;
};
export function CustomBackground({ config }: CustomBackgroundProps) {
  const fill = config.fill;
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        ...backgroundFillStyle(fill),
      }}
    >
      {fill.kind === "image" || fill.kind === "video" ? (
        <BackgroundMedia fill={fill} />
      ) : null}
      {config.grid && config.grid !== "none" ? (
        <GridOverlay variant={config.grid} />
      ) : null}
    </div>
  );
}

// A picture or video filling the frame, framed by focusX / focusY and zoom.
function BackgroundMedia({
  fill,
}: {
  fill: Extract<BackgroundFill, { kind: "image" | "video" }>;
}) {
  const focus = `${fill.focusX ?? 50}% ${fill.focusY ?? 50}%`;
  const style = {
    objectPosition: focus, // which part stays in view
    transform: `scale(${fill.zoom ?? 1})`,
    transformOrigin: focus, // zoom in towards that same part
  };
  const className = "absolute inset-0 w-full h-full object-cover";
  return fill.kind === "video" ? (
    <Video
      src={assetUrl(fill.src)}
      muted
      loop
      className={className}
      style={style}
    />
  ) : (
    <Img src={assetUrl(fill.src)} className={className} style={style} />
  );
}
