import { GridOverlay } from "./GridOverlay";
export function SoftGrid() {
  return (
    <div className="absolute inset-0 bg-[#171717]">
      <GridOverlay variant="lines" />
    </div>
  );
}
