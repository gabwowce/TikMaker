import type { VisualConfig } from "../schema/visual";
import { toolList } from "./toolRegistry";

/** Section the editor groups this template under in the Visuals tab. */
export type VisualTemplateCategory = "media" | "data" | "dev" | "diagrams" | "atmosphere";

export const visualTemplateCategories: { id: VisualTemplateCategory; label: string }[] = [
  { id: "media", label: "Screens & Media" },
  { id: "data", label: "Data & Cards" },
  { id: "dev", label: "Dev" },
  { id: "diagrams", label: "Diagrams" },
  { id: "atmosphere", label: "Atmosphere" },
];

export type VisualTemplateDefinition = {
  id: string;
  label: string;
  description: string;
  category: VisualTemplateCategory;
  build: () => VisualConfig;
};

const firstTools = (count: number) => toolList.slice(0, count).map((t) => t.id);

export const visualTemplateRegistry: VisualTemplateDefinition[] = [
  {
    id: "tool-flow",
    category: "diagrams",
    label: "Tool Flow",
    description: "A row of tool logos connected by arrows.",
    build: () => ({ type: "tool-flow", tools: firstTools(3) }),
  },
  {
    id: "recording-browser",
    category: "media",
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
    category: "media",
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
    category: "data",
    label: "Stat Counter",
    description: "A number that animates from one value to another.",
    build: () => ({ type: "stat-counter", from: 10000, to: 1, label: "USERS", decimals: 0 }),
  },
  {
    id: "checklist",
    category: "data",
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
    category: "data",
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
    category: "media",
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
    category: "media",
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
    category: "media",
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
    id: "keycap",
    category: "dev",
    label: "Keycaps",
    description: "Physical keyboard keys — for telling the viewer what to press.",
    build: () => ({ type: "keycap", keys: ["ESC"], caption: "to stop it" }),
  },
  {
    id: "terminal",
    category: "dev",
    label: "Terminal",
    description: "A terminal window with commands typing in line by line.",
    build: () => ({
      type: "terminal",
      title: "claude",
      lines: [
        { text: "/rewind", kind: "prompt" },
        { text: "restored checkpoint 3", kind: "accent" },
      ],
      cursor: true,
    }),
  },
  {
    id: "code-diff",
    category: "dev",
    label: "Code Diff",
    description: "Added/removed lines — shows what actually changed in a file.",
    build: () => ({
      type: "code-diff",
      filename: "src/app.tsx",
      lines: [
        { text: "const config = load()", kind: "context" },
        { text: "renamed everything", kind: "removed" },
        { text: "what you asked for", kind: "added" },
      ],
    }),
  },
  {
    id: "progress",
    category: "data",
    label: "Progress Bar",
    description: "A simple animated progress/completion bar.",
    build: () => ({ type: "progress", value: 7, max: 10, label: "WEEKLY GOAL" }),
  },
  {
    id: "flow-system",
    category: "diagrams",
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
    category: "diagrams",
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
    category: "diagrams",
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
    category: "diagrams",
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
    category: "diagrams",
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
    category: "diagrams",
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
    category: "atmosphere",
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
  {
    id: "browser-image",
    label: "Browser + Image",
    description: "A browser window holding a screenshot — swap the image in the Inspector's Content picker.",
    category: "media",
    build: () => ({
      type: "browser",
      url: "yourapp.com",
      content: { type: "app-mockup", appTitle: "YOUR APP", kind: "list", items: ["Row one", "Row two", "Row three"] },
    }),
  },
  {
    id: "browser-recording",
    label: "Browser + Recording",
    description: "A browser window holding a screen recording — point it at your clip in the Inspector.",
    category: "media",
    build: () => ({
      type: "recording",
      src: "assets/recordings/placeholder.mp4",
      frame: "browser",
      fit: "cover",
      playbackRate: 1,
      startFrom: 0,
    }),
  },
  {
    id: "phone-image",
    label: "Phone + Image",
    description: "A phone frame holding a screenshot — swap the image in the Inspector's Content picker.",
    category: "media",
    build: () => ({
      type: "phone",
      content: { type: "app-mockup", appTitle: "YOUR APP", kind: "stat", stat: { value: "482", label: "This month" } },
    }),
  },
  {
    id: "image-plain",
    label: "Image (No Frame)",
    description: "A bare image — pick the file from Your Imports or the Assets tab.",
    category: "media",
    build: () => ({ type: "image", src: "/assets/props/idea.png" }),
  },
  {
    id: "keycap-combo",
    label: "Keycap Combo",
    description: "Two keys pressed together (CTRL + R) — edit the keys in the Inspector.",
    category: "dev",
    build: () => ({ type: "keycap", keys: ["CTRL", "R"], caption: "to reload" }),
  },
  {
    id: "terminal-error",
    label: "Terminal (Error)",
    description: "A command that fails — the pain half of a problem/fix pair.",
    category: "dev",
    build: () => ({
      type: "terminal",
      title: "bash",
      lines: [
        { text: "npm run build", kind: "prompt" },
        { text: "Error: Cannot find module", kind: "output" },
        { text: "build failed", kind: "dim" },
      ],
      cursor: false,
    }),
  },
  {
    id: "terminal-success",
    label: "Terminal (Success)",
    description: "A command that works — the payoff half of a problem/fix pair.",
    category: "dev",
    build: () => ({
      type: "terminal",
      title: "bash",
      lines: [
        { text: "npm run build", kind: "prompt" },
        { text: "built in 1.2s", kind: "accent" },
      ],
      cursor: true,
    }),
  },
  {
    id: "claude-cli-prompt",
    label: "Claude CLI (Prompt)",
    description: "The real Claude Code TUI with a prompt typed in.",
    category: "dev",
    build: () => ({
      type: "claude-cli",
      transcript: [{ text: "add a dark mode toggle", kind: "user" }],
      input: "",
      mode: "accept edits",
      modeActive: true,
    }),
  },
  {
    id: "claude-cli-menu",
    label: "Claude CLI (Menu)",
    description: "The TUI with a menu overlay open — shows the RESULT of a shortcut, not just its name.",
    category: "dev",
    build: () => ({
      type: "claude-cli",
      input: "",
      overlay: {
        title: "Select mode",
        items: [
          { text: "normal", selected: true },
          { text: "auto-accept edits" },
          { text: "plan mode" },
        ],
      },
    }),
  },
  {
    id: "code-diff-fix",
    label: "Code Diff (One Line)",
    description: "A single line changing — the tightest possible before/after.",
    category: "dev",
    build: () => ({
      type: "code-diff",
      filename: "src/config.ts",
      lines: [
        { text: "timeout: 30", kind: "removed" },
        { text: "timeout: 5", kind: "added" },
      ],
    }),
  },
  {
    id: "flow-vertical",
    label: "Flow (Vertical)",
    description: "Steps stacked top to bottom — fits 9:16 better than a wide row.",
    category: "diagrams",
    build: () => ({
      type: "flow",
      nodes: [{ label: "IDEA" }, { label: "PROMPT" }, { label: "APP" }],
      direction: "vertical",
      animated: true,
    }),
  },
  {
    id: "node-group-radial",
    label: "Radial Group",
    description: "Items fanned around a center point, static (no orbit drift).",
    category: "diagrams",
    build: () => ({
      type: "node-group",
      center: { type: "prop", asset: "idea" },
      nodes: [
        { type: "prop", asset: "document" },
        { type: "prop", asset: "database" },
        { type: "prop", asset: "link" },
        { type: "prop", asset: "key" },
      ],
      layout: "radial",
    }),
  },
  {
    id: "transform-before-after",
    label: "Transform (Screens)",
    description: "One app screen becoming another — a literal before → after.",
    category: "diagrams",
    build: () => ({
      type: "transform",
      from: { type: "app-mockup", appTitle: "BEFORE", kind: "list", items: ["Messy", "Manual", "Slow"] },
      to: { type: "app-mockup", appTitle: "AFTER", kind: "stat", stat: { value: "2 min", label: "Per task" } },
      holdFrames: 40,
    }),
  },
  {
    id: "stack-cards-horizontal",
    label: "Stacking Cards (Wide)",
    description: "Cards building sideways instead of into a pile.",
    category: "diagrams",
    build: () => ({
      type: "stack",
      items: [
        { type: "pricing-card", title: "FREE", price: "€0" },
        { type: "pricing-card", title: "PRO", price: "€12", highlight: true },
      ],
      direction: "horizontal",
    }),
  },
  {
    id: "corner-props-trbl",
    label: "Floating Corner Props (Reverse)",
    description: "The same drifting accent on the opposite diagonal — alternate it between scenes.",
    category: "atmosphere",
    build: () => ({
      type: "corner-props",
      assets: [
        { type: "prop", asset: "key" },
        { type: "prop", asset: "link" },
      ],
      diagonal: "trbl",
      size: 480,
      speed: 1,
    }),
  },
];
