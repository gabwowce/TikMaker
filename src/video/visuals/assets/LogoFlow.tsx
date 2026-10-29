import { Flow } from "../diagrams/Flow";
type LogoFlowProps = {
  logos: string[];
};
export function LogoFlow({ logos }: LogoFlowProps) {
  return (
    <Flow
      nodes={logos.map((logo) => ({ visual: { type: "logo", logo } }))}
      animated
    />
  );
}
