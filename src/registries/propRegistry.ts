import { generatedProps } from "./assets.generated";

export type PropDefinition = {
  id: string;
  name: string;
  src: string;
};

export const propRegistry: Record<string, PropDefinition> = Object.fromEntries(
  generatedProps.map((entry) => [
    entry.id,
    {
      id: entry.id,
      name: entry.label.replace(/\b\w/g, (c) => c.toUpperCase()),
      src: `/assets/props/${entry.file}`,
    },
  ])
);

export const propList = Object.values(propRegistry);

export function getProp(id: string): PropDefinition | undefined {
  return propRegistry[id];
}
