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
      className={`w-[560px] rounded-[28px] p-10 flex flex-col gap-6 [box-shadow:0_30px_60px_rgba(0,0,0,0.35)] ${highlight ? "bg-[rgba(255,_112,_36,_0.15)]" : "bg-brand-surface"} ${highlight ? "[border:1px_solid_#FF7024]" : "[border:1px_solid_rgba(255,255,255,0.10)]"}`}
    >
      <div className="[font-family:ClashDisplay-Medium] text-label text-brand-muted uppercase [letter-spacing:2px]">
        {title}
      </div>

      <div className="flex items-baseline gap-3">
        <div className="[font-family:ClashDisplay-Bold] text-title text-brand-text">
          {price}
        </div>
        {period ? (
          <div className="[font-family:ClashDisplay-Medium] text-label text-brand-muted">
            {period}
          </div>
        ) : null}
      </div>

      {features && features.length > 0 ? (
        <div className="flex flex-col gap-3.5">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-3.5">
              <div className="text-brand-accent text-[24px]">✓</div>
              <div className="[font-family:ClashDisplay-Medium] text-body text-brand-text">
                {feature}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
