import { colors } from "../../typography/tokens";
type Props = {
  label: string;
  detail?: string;
  state?: "done" | "pending" | "warning";
  variant?: "card" | "compact" | "pill" | "outline";
};
export function Checkpoint({
  label,
  detail,
  state = "done",
  variant = "card",
}: Props) {
  const accent =
    state === "warning"
      ? "#ff9d3d"
      : state === "pending"
        ? colors.textSecondary
        : colors.accent;
  const symbol = state === "done" ? "✓" : state === "warning" ? "!" : "";
  const compact = variant === "compact" || variant === "pill";
  const pill = variant === "pill";
  return (
    <div
      className={`flex items-center box-border ${pill ? "w-[max-content]" : compact ? "w-[520px]" : "w-[680px]"} ${compact ? "gap-3.5" : "gap-5"} ${pill ? "p-[12px_22px]" : compact ? "p-[14px_20px]" : "p-[20px_26px]"} ${pill ? "rounded-[999px]" : variant === "outline" ? "rounded-[12px]" : "rounded-[16px]"} ${variant === "outline" ? "bg-transparent" : "bg-[#222222]"}`}
      style={{
        minWidth: pill ? 280 : undefined,
        border: `2px solid ${variant === "outline" ? accent : colors.border}`,
        boxShadow:
          variant === "card" ? "0 16px 38px rgba(0,0,0,.22)" : undefined,
      }}
    >
      <div
        className={`shrink-0 rounded-[50%] flex items-center justify-center [font-family:ClashDisplay-Medium] font-bold ${compact ? "w-7" : "w-9"} ${compact ? "h-7" : "h-9"} ${compact ? "text-[15px]" : "text-[19px]"}`}
        style={{
          border: `2px solid ${accent}`,
          background: state === "done" ? `${accent}22` : "transparent",
          color: accent,
        }}
      >
        {symbol}
      </div>
      <div className="min-w-0">
        <div
          className={`[font-family:Tanker-Regular] text-[#FFFFFF] uppercase [line-height:1] ${compact ? "text-[52px]" : "text-[62px]"}`}
        >
          {label}
        </div>
        {detail && !pill ? (
          <div className="[font-family:ClashDisplay-Medium] text-[42px] text-[#B8B8B8] mt-1.5">
            {detail}
          </div>
        ) : null}
      </div>
    </div>
  );
}
