import { GridOverlay } from "./GridOverlay";
export function DotGrid() {
  return (
    <div className="absolute inset-0 bg-[#171717]">
      <GridOverlay variant="dots" />
    </div>
  );
}
