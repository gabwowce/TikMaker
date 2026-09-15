import { type ReactNode } from "react";
type BrowserMockupProps = {
  title?: string;
  url?: string;
  tabs?: string[];
  children: ReactNode;
  scale?: number;
};
const TRAFFIC_LIGHTS = ["#ff5f57", "#febc2e", "#28c840"];

type TabProps = {
  label: string;
  active?: boolean;
};
function Tab({ label, active }: TabProps) {
  return (
    <div
      className={`flex items-center gap-2.5 max-w-[260px] p-[10px_18px] rounded-[10px_10px_0_0] [font-family:ClashDisplay-Medium] text-[22px] whitespace-nowrap overflow-hidden text-ellipsis ${active ? "bg-[#3c3c40]" : "bg-transparent"} ${active ? "text-[#c9c9cf]" : "text-[#8a8a92]"}`}
    >
      <div
        className={`w-4 h-4 rounded shrink-0 ${active ? "bg-brand-accent" : "bg-[#8a8a92]"}`}
      />
      {label}
    </div>
  );
}
export function BrowserMockup({
  url,
  title,
  tabs,
  children,
  scale = 1,
}: BrowserMockupProps) {
  const activeTab =
    title ?? (url ? url.replace(/^https?:\/\//, "").split("/")[0] : "New Tab");
  return (
    <div
      className="rounded-[20px] overflow-hidden bg-brand-surface [box-shadow:0_40px_80px_rgba(0,0,0,0.45)] [border:1px_solid_rgba(255,255,255,0.10)]"
      style={{
        width: 860 * scale,
      }}
    >
      <div className="bg-[#2b2b2e] pt-3.5">
        <div className="flex items-end gap-1.5 p-[0_20px]">
          <div className="flex gap-[9px] pb-3 mr-2.5">
            {TRAFFIC_LIGHTS.map((color) => (
              <div
                key={color}
                className="w-[15px] h-[15px] rounded-[50%]"
                style={{
                  background: color,
                }}
              />
            ))}
          </div>
          <Tab label={activeTab} active />
          {(tabs ?? []).slice(0, 2).map((label, index) => (
            <Tab key={index} label={label} />
          ))}
          <div className="text-[#8a8a92] text-[26px] pb-2.5 pl-1.5">+</div>
        </div>

        <div className="flex items-center gap-3.5 p-[12px_20px] bg-[#3c3c40]">
          <span className="text-[#8a8a92] text-[24px] [font-family:ClashDisplay-Medium]">
            ‹
          </span>
          <span className="text-[#8a8a92] text-[24px] [font-family:ClashDisplay-Medium]">
            ›
          </span>
          <div className="flex-1 flex items-center gap-2.5 p-[9px_18px] rounded-[999px] bg-[rgba(0,0,0,0.35)] text-[#c9c9cf] text-[22px] [font-family:ClashDisplay-Medium] whitespace-nowrap overflow-hidden text-ellipsis">
            <span className="text-[#8a8a92] text-[18px]">🔒</span>
            {url ?? "yourapp.com"}
          </div>
        </div>
      </div>

      <div className="relative w-full [aspect-ratio:16_/_10] bg-brand-bg">
        {children}
      </div>
    </div>
  );
}
