import React from "react";
import { Img } from "remotion";
import { getProp } from "../../../registries/propRegistry";

type PropAssetProps = {
  name: string;
  size?: number;
};

export const PropAsset: React.FC<PropAssetProps> = ({ name, size = 260 }) => {
  const definition = getProp(name);
  if (!definition) return null;

  return (
    <Img
      src={definition.src}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
};
