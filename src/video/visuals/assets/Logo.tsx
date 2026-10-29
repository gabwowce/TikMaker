import { Img } from "remotion";
import { getLogo } from "../../../registries/logoRegistry";
type LogoProps = {
  logo: string;
  size?: number;
  showName?: boolean;
};
export function Logo({ logo, size = 220, showName }: LogoProps) {
  const definition = getLogo(logo);
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
