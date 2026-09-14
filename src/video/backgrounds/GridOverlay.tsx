type GridOverlayProps = {
  variant: "lines" | "dots";
};
export function GridOverlay({ variant }: GridOverlayProps) {
  return variant === "lines" ? (
    <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.10)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(255,255,255,0.10)_1px,_transparent_1px)] [background-size:90px_90px] opacity-[0.5]" />
  ) : (
    <div className="absolute inset-0 [background-image:radial-gradient(circle,_rgba(255,255,255,0.38)_2.5px,_transparent_2.5px)] [background-size:48px_48px]" />
  );
}
