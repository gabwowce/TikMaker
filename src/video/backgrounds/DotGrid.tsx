import { GridOverlay } from "./GridOverlay";
export function DotGrid() {
  return (
    <div className="absolute inset-0 bg-brand-bg">
      <GridOverlay variant="dots" />
    </div>
  );
}
