import { type ReactNode } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { standardEasing } from "../../motion/easing";
type AppMockupProps = {
  appTitle: string;
  kind: "list" | "stat" | "chart";
  items?: string[];
  stat?: {
    value: string;
    label: string;
  };
  chartValues?: number[];
};

type AppFrameProps = {
  appTitle: string;
  children: ReactNode;
};
function AppFrame({ appTitle, children }: AppFrameProps) {
  return (
    <div className="w-[640px] rounded-[28px] overflow-hidden bg-[#222222] [border:1px_solid_rgba(255,255,255,0.10)] [box-shadow:0_30px_60px_rgba(0,0,0,0.35)]">
      <div className="p-[22px_28px] [border-bottom:1px_solid_rgba(255,255,255,0.10)] flex items-center gap-3">
        <div className="w-3.5 h-3.5 rounded-[50%] bg-[#FF7024]" />
        <div className="[font-family:ClashDisplay-Semibold] text-[52px] text-[#FFFFFF]">
          {appTitle}
        </div>
      </div>
      <div className="p-7">{children}</div>
    </div>
  );
}
type AppMockupListProps = {
  items: string[];
};
function AppMockupList({ items }: AppMockupListProps) {
  return (
    <div className="flex flex-col gap-3.5">
      {items.map((item, index) => (
        <div
          key={index}
          className="p-[16px_20px] rounded-[14px] bg-[#292929] [font-family:ClashDisplay-Medium] text-[52px] text-[#FFFFFF]"
        >
          {item}
        </div>
      ))}
    </div>
  );
}
type AppMockupStatProps = {
  stat: {
    value: string;
    label: string;
  };
};
function AppMockupStat({ stat }: AppMockupStatProps) {
  return (
    <div className="flex flex-col gap-2 items-start">
      <div className="[font-family:ClashDisplay-Bold] text-[80px] text-[#FFFFFF]">
        {stat.value}
      </div>
      <div className="[font-family:ClashDisplay-Medium] text-[42px] text-[#B8B8B8] uppercase [letter-spacing:2px]">
        {stat.label}
      </div>
    </div>
  );
}
type AppMockupChartProps = {
  values: number[];
};
function AppMockupChart({ values }: AppMockupChartProps) {
  const frame = useCurrentFrame();
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-3 h-[220px]">
      {values.map((v, index) => {
        const targetHeight = (v / max) * 100;
        const height = interpolate(
          frame - index * 4,
          [0, 24],
          [0, targetHeight],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: standardEasing,
          },
        );
        return (
          <div
            key={index}
            className="flex-1 rounded-lg bg-[#FF7024]"
            style={{
              height: `${height}%`,
            }}
          />
        );
      })}
    </div>
  );
}
export function AppMockup({
  appTitle,
  kind,
  items,
  stat,
  chartValues,
}: AppMockupProps) {
  return (
    <AppFrame appTitle={appTitle}>
      {kind === "list" ? <AppMockupList items={items ?? []} /> : null}
      {kind === "stat" && stat ? <AppMockupStat stat={stat} /> : null}
      {kind === "chart" ? <AppMockupChart values={chartValues ?? []} /> : null}
    </AppFrame>
  );
}
