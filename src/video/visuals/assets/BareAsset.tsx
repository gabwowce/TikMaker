import { Img } from "remotion";
import { getProp } from "../../../registries/propRegistry";
import { getTool } from "../../../registries/toolRegistry";
import type { VisualConfig } from "../../../schema/visual";
import { VisualRenderer } from "../VisualRenderer";
type BareAssetProps = {
  visual: VisualConfig;
  size: number;
};
export function BareAsset({ visual, size }: BareAssetProps) {
  if (visual.type === "tool-logo") {
    const tool = getTool(visual.tool);
    if (!tool) return null;
    return (
      <Img
        src={tool.src}
        className="object-contain"
        style={{
          width: size,
          height: size,
        }}
      />
    );
  }
  if (visual.type === "prop") {
    const prop = getProp(visual.asset);
    if (!prop) return null;
    return (
      <Img
        src={prop.src}
        className="object-contain"
        style={{
          width: size,
          height: size,
        }}
      />
    );
  }
  return <VisualRenderer visual={visual} />;
}
