import { Flow } from "../diagrams/Flow";
type ToolFlowProps = {
  tools: string[];
};
export function ToolFlow({ tools }: ToolFlowProps) {
  return (
    <Flow
      nodes={tools.map((tool) => ({ visual: { type: "tool-logo", tool } }))}
      animated
    />
  );
}
