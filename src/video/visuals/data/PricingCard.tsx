type PricingCardProps = {
  title: string;
  price: string;
  period?: string;
  features?: string[];
  highlight?: boolean;
};
export function PricingCard({
  title,
  price,
  period,
  features,
  highlight,
}: PricingCardProps) {
  return (
    <div
      className={`w-[560px] rounded-[28px] p-10 flex flex-col gap-6 [box-shadow:0_30px_60px_rgba(0,0,0,0.35)] ${highlight ? "bg-[rgba(255,_112,_36,_0.15)]" : "bg-[#222222]"} ${highlight ? "[border:1px_solid_#FF7024]" : "[border:1px_solid_rgba(255,255,255,0.10)]"}`}
    >
      <div className="[font-family:ClashDisplay-Medium] text-[42px] text-[#B8B8B8] uppercase [letter-spacing:2px]">
        {title}
      </div>

      <div className="flex items-baseline gap-3">
        <div className="[font-family:ClashDisplay-Bold] text-[80px] text-[#FFFFFF]">
          {price}
        </div>
        {period ? (
          <div className="[font-family:ClashDisplay-Medium] text-[42px] text-[#B8B8B8]">
            {period}
          </div>
        ) : null}
      </div>

      {features && features.length > 0 ? (
        <div className="flex flex-col gap-3.5">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-3.5">
              <div className="text-[#FF7024] text-[24px]">✓</div>
              <div className="[font-family:ClashDisplay-Medium] text-[52px] text-[#FFFFFF]">
                {feature}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
