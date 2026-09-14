export type SafeZonePlatform = "all" | "tiktok" | "instagram" | "youtube";
type SafeZonePreset = {
  label: string;
  color: string;
  safe: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
};
export const safeZonePresets: Record<SafeZonePlatform, SafeZonePreset> = {
  all: {
    label: "All platforms",
    color: "#a8ff78",
    safe: { top: 250, right: 180, bottom: 500, left: 130 },
  },
  tiktok: {
    label: "TikTok",
    color: "#d7ff69",
    safe: { top: 108, right: 120, bottom: 320, left: 60 },
  },
  instagram: {
    label: "Instagram Reels",
    color: "#ff78bd",
    safe: { top: 220, right: 160, bottom: 420, left: 64 },
  },
  youtube: {
    label: "YouTube Shorts",
    color: "#ff6b61",
    safe: { top: 160, right: 180, bottom: 380, left: 64 },
  },
};
function pctX(pixels: number) {
  return (pixels / 1080) * 100;
}
function pctY(pixels: number) {
  return (pixels / 1920) * 100;
}
type SafeZoneOverlayProps = {
  platform: SafeZonePlatform;
};
export function SafeZoneOverlay({ platform }: SafeZoneOverlayProps) {
  const preset = safeZonePresets[platform];
  const top = pctY(preset.safe.top);
  const right = pctX(preset.safe.right);
  const bottom = pctY(preset.safe.bottom);
  const left = pctX(preset.safe.left);
  const safeBottom = 100 - bottom;
  const safeRight = 100 - right;
  const railIcons = ["●", "♥", "●", "↗", "♫"];
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 [z-index:8] pointer-events-none overflow-hidden [container-type:inline-size] box-border bg-[rgba(191,_234,_69,_.08)]"
      style={{
        border: `2px solid ${preset.color}`,
      }}
    >
      <div
        className="absolute inset-[0_0_auto_0] bg-[rgba(17,34,47,.28)]"
        style={{
          height: `${top}%`,
        }}
      />
      <div
        className="absolute inset-[auto_0_0_0] bg-[rgba(17,34,47,.34)]"
        style={{
          height: `${bottom}%`,
        }}
      />
      <div
        className="absolute left-0 bg-[rgba(17,34,47,.25)]"
        style={{
          top: `${top}%`,
          bottom: `${bottom}%`,
          width: `${left}%`,
        }}
      />
      <div
        className="absolute right-0 bg-[rgba(17,34,47,.32)]"
        style={{
          top: `${top}%`,
          bottom: `${bottom}%`,
          width: `${right}%`,
        }}
      />

      <div
        className="absolute grid place-items-center bg-[rgba(223,255,177,.13)] [box-shadow:inset_0_0_0_1px_rgba(12,42,58,.65)]"
        style={{
          top: `${top}%`,
          right: `${right}%`,
          bottom: `${bottom}%`,
          left: `${left}%`,
          border: `2px solid ${preset.color}`,
        }}
      />

      <div className="absolute right-[2.7%] top-[35%] grid gap-[2.2cqw]">
        {railIcons.map((icon, index) => (
          <span
            key={index}
            className={`w-[9cqw] h-[9cqw] rounded-[50%] grid place-items-center text-white [border:2px_solid_white] [box-shadow:0_2px_5px_rgba(0,0,0,.35)] text-[4.5cqw] ${index === 0 ? "bg-[rgba(255,255,255,.88)]" : "bg-[rgba(20,48,64,.2)]"}`}
          >
            {index === 0 ? null : icon}
          </span>
        ))}
      </div>
      <div className="absolute left-[6%] right-[6%] bottom-[5%] [border-top:1px_solid_rgba(255,255,255,.8)]" />

      <div
        className="absolute left-[74%] top-0 [border-left:2px_solid_#17364b]"
        style={{
          height: `${top}%`,
        }}
      />

      <div
        className="absolute left-0 [border-top:2px_solid_#17364b]"
        style={{
          top: `${Math.max(top + 5, 16)}%`,
          width: `${left}%`,
        }}
      />

      <div
        className="absolute right-0 [border-top:2px_solid_#17364b]"
        style={{
          left: `${safeRight}%`,
          top: `${Math.max(top + 5, 16)}%`,
        }}
      />

      <div
        className="absolute left-[66%] bottom-0 [border-left:2px_solid_#17364b]"
        style={{
          top: `${safeBottom}%`,
        }}
      />

      <div
        className="absolute [border-left:2px_solid_#17364b]"
        style={{
          left: `${safeRight}%`,
          top: `${top}%`,
          height: `${safeBottom - top}%`,
        }}
      />
    </div>
  );
}
