import type { CSSProperties } from "react";
import type { BackgroundFill } from "../../schema/scene";
import { assetUrl } from "../../utils/assetUrl";
import { colors } from "../typography/tokens";

/**
 * A fill's CSS, independent of the grid overlay and independent of Remotion —
 * the editor's swatches/previews use this too, so a preview can never drift
 * from what the actual video shows. `image` goes through `assetUrl` like every
 * other reference to a `public/` file, or it 404s in a render.
 */
export function backgroundFillStyle(fill: BackgroundFill): CSSProperties {
  switch (fill.kind) {
    case "solid":
      return { backgroundColor: fill.color };
    case "gradient": {
      const stops = fill.colors.join(", ");
      return fill.shape === "radial"
        ? { backgroundImage: `radial-gradient(circle, ${stops})` }
        : { backgroundImage: `linear-gradient(${fill.angle ?? 135}deg, ${stops})` };
    }
    case "image":
      return {
        backgroundImage: `url(${assetUrl(fill.src)})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: colors.background,
      };
  }
}
