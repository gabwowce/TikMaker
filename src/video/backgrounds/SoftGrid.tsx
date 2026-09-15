import { GridOverlay } from "./GridOverlay";
export function SoftGrid() {
  return (
    <div className="absolute inset-0 bg-brand-bg">
      <GridOverlay variant="lines" />
    </div>
  );
}
