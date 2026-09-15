import { Img } from "remotion";
import { assetUrl } from "../../utils/assetUrl";
export function PerspectiveDataGrid() {
  return (
    <div className="absolute inset-0 bg-brand-bg">
      <Img
        src={assetUrl("/assets/bg/PerspectiveDataGrid.png")}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
