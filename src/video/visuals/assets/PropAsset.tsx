import { Img } from "remotion";
import { getProp } from "../../../registries/propRegistry";
type PropAssetProps = {
  name: string;
  size?: number;
};
export function PropAsset({ name, size = 260 }: PropAssetProps) {
  const definition = getProp(name);
  if (!definition) return null;
  return (
    <Img
      src={definition.src}
      className="object-contain"
      style={{
        width: size,
        height: size,
      }}
    />
  );
}
