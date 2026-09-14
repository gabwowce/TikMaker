import { Img } from "remotion";
import { getTool } from "../../../registries/toolRegistry";
type ToolLogoProps = {
  tool: string;
  size?: number;
  showName?: boolean;
};
export function ToolLogo({ tool, size = 220, showName }: ToolLogoProps) {
  const definition = getTool(tool);
  if (!definition) return null;
  const image = (
    <Img
      src={definition.src}
      className="object-contain"
      style={{
        width: size,
        height: size,
      }}
    />
  );
  if (!showName) return image;
  return (
    <div className="flex flex-col items-center gap-4">
      {image}
      <div className="[font-family:ClashDisplay-Medium] text-[42px] text-[#B8B8B8]">
        {definition.name}
      </div>
    </div>
  );
}
