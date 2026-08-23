import type { VisualConfig } from "../schema/visual";
import { toolList } from "./toolRegistry";

export type VisualTemplateDefinition = {
  id: string;
  label: string;
  description: string;
  build: () => VisualConfig;
};

const firstTools = (count: number) => toolList.slice(0, count).map((t) => t.id);

export const visualTemplateRegistry: VisualTemplateDefinition[] = [
  {
    id: "tool-flow",
    label: "Tool Flow",
    description: "A row of tool logos connected by arrows.",
    build: () => ({ type: "tool-flow", tools: firstTools(3) }),
  },
  {
    id: "recording-browser",
    label: "Screen Recording (Browser)",
    description: "A screen recording placeholder inside a browser frame.",
    build: () => ({
      type: "recording",
      src: "assets/recordings/placeholder.mp4",
      frame: "browser",
      playbackRate: 1,
      startFrom: 0,
    }),
  },
  {
    id: "recording-phone",
    label: "Screen Recording (Phone)",
    description: "A screen recording placeholder inside a phone frame.",
    build: () => ({
      type: "recording",
      src: "assets/recordings/placeholder.mp4",
      frame: "phone",
      playbackRate: 1,
      startFrom: 0,
    }),
  },
  {
    id: "stat-counter",
    label: "Stat Counter",
    description: "A number that animates from one value to another.",
    build: () => ({ type: "stat-counter", from: 10000, to: 1, label: "USERS", decimals: 0 }),
  },
  {
    id: "checklist",
    label: "Checklist",
    description: "A short list of items that reveal one by one.",
    build: () => ({
      type: "checklist",
      items: [
        { label: "TRACK WORKOUTS", done: true },
        { label: "LOG MEALS", done: true },
        { label: "SEE PROGRESS", done: false },
      ],
    }),
  },
  {
    id: "pricing-card",
    label: "Pricing Card",
    description: "A subscription/pricing card with features.",
    build: () => ({
      type: "pricing-card",
      title: "PRO PLAN",
      price: "€12",
      period: "/ month",
      features: ["Feature one", "Feature two", "Feature three"],
      highlight: true,
    }),
  },
  {
    id: "app-mockup-list",
    label: "App Mockup (List)",
    description: "A generic small-app UI showing a list of rows.",
    build: () => ({
      type: "app-mockup",
      appTitle: "WORKOUT TRACKER",
      kind: "list",
      items: ["Push Day", "Pull Day", "Leg Day"],
    }),
  },
  {
    id: "app-mockup-stat",
    label: "App Mockup (Stat)",
    description: "A generic small-app UI showing one big stat.",
    build: () => ({
      type: "app-mockup",
      appTitle: "EXPENSE TRACKER",
      kind: "stat",
      stat: { value: "€482", label: "This month" },
    }),
  },
  {
    id: "app-mockup-chart",
    label: "App Mockup (Chart)",
    description: "A generic small-app UI showing a simple bar chart.",
    build: () => ({
      type: "app-mockup",
      appTitle: "PLANNER",
      kind: "chart",
      chartValues: [3, 6, 4, 8, 5, 9],
    }),
  },
  {
    id: "progress",
    label: "Progress Bar",
    description: "A simple animated progress/completion bar.",
    build: () => ({ type: "progress", value: 7, max: 10, label: "WEEKLY GOAL" }),
  },
  {
    id: "flow-system",
    label: "System Flow",
    description: "Labeled nodes connected by an animated arrow (e.g. USER → TOOL).",
    build: () => ({
      type: "flow",
      nodes: [{ label: "USER" }, { label: "TOOL" }],
      direction: "horizontal",
      animated: true,
    }),
  },
  {
    id: "node-group-orbit",
    label: "Orbit Group",
    description: "Several items orbiting one central concept.",
    build: () => ({
      type: "node-group",
      center: { type: "prop", asset: "idea" },
      nodes: [
        { type: "prop", asset: "puzzle-piece" },
        { type: "prop", asset: "link" },
        { type: "prop", asset: "sync-arrows" },
        { type: "prop", asset: "database" },
      ],
      layout: "orbit",
    }),
  },
  {
    id: "node-group-orbit-ring",
    label: "Orbit Ring (Big, No Center)",
    description: "Tool logos on a large ring framing your headline — no center graphic.",
    build: () => ({
      type: "node-group",
      nodes: firstTools(4).map((id) => ({ type: "tool-logo", tool: id })),
      layout: "orbit",
      radius: 480,
    }),
  },
  {
    id: "node-group-one-to-many",
    label: "One-to-Many Group",
    description: "One central node connected to several related nodes.",
    build: () => ({
      type: "node-group",
      center: { type: "prop", asset: "user-avatar" },
      nodes: [
        { type: "prop", asset: "document" },
        { type: "prop", asset: "key" },
        { type: "prop", asset: "link" },
      ],
      layout: "one-to-many",
    }),
  },
  {
    id: "stack-cards",
    label: "Stacking Cards",
    description: "Several cards that build into a pile.",
    build: () => ({
      type: "stack",
      items: [
        { type: "pricing-card", title: "PLAN A", price: "€4" },
        { type: "pricing-card", title: "PLAN B", price: "€8" },
        { type: "pricing-card", title: "PLAN C", price: "€12", highlight: true },
      ],
    }),
  },
  {
    id: "transform-reveal",
    label: "Transform / Reveal",
    description: "One state visually becomes another.",
    build: () => ({
      type: "transform",
      from: { type: "prop", asset: "puzzle-piece" },
      to: { type: "prop", asset: "puzzle-joined" },
      holdFrames: 40,
    }),
  },
  {
    id: "corner-props-float",
    label: "Floating Corner Props",
    description: "Two props drifting slowly in opposite corners, behind the headline.",
    build: () => ({
      type: "corner-props",
      assets: [
        { type: "prop", asset: "idea" },
        { type: "prop", asset: "document" },
      ],
      diagonal: "tlbr",
      size: 480,
      speed: 1,
    }),
  },
];
