import React from "react";
import { Flow } from "../diagrams/Flow";

type ToolFlowProps = {
  tools: string[];
};

export const ToolFlow: React.FC<ToolFlowProps> = ({ tools }) => (
  <Flow nodes={tools.map((tool) => ({ visual: { type: "tool-logo", tool } }))} animated />
);
